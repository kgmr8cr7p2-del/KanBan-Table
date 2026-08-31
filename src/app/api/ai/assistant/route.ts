import { Prisma } from "@prisma/client";
import { requireVerifiedUser } from "@/lib/auth";
import { accessibleBoardWhere } from "@/lib/board-access";
import { aiAssistantRequestSchema, aiAssistantResponseSchema } from "@/lib/ai-assistant";
import { deepSeekModel, isAiTaskDraftEnabled } from "@/lib/ai-task-draft";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const assistantSystemPrompt = [
  "Ты — встроенный помощник команды Taskora.",
  "Отвечай на русском, коротко и по делу, используя только переданный контекст доски.",
  "Не выдумывай задачи, сроки, исполнителей, статусы и числа.",
  "Если в контексте нет ответа, прямо скажи, что данных недостаточно.",
  "Когда называешь задачу, указывай её номер в формате #123.",
  "Помогай расставить приоритеты, найти просроченные задачи и объяснить текущую загрузку.",
  "Если вопрос просит выбрать, что взять в работу, добавь 2–5 подходящих задач из контекста в recommendations; если выбор задач не нужен, верни пустой массив.",
  "В recommendations используй только реальные taskId из контекста, максимум 6 элементов, и кратко объясни reason.",
  "Верни только JSON вида {\"answer\":\"...\",\"recommendations\":[{\"taskId\":\"...\",\"taskNumber\":123,\"title\":\"...\",\"column\":\"...\",\"priority\":\"HIGH\",\"deadline\":null,\"reason\":\"...\"}]} без markdown-обёртки.",
].join("\n");

const taskSelect = {
  id: true,
  taskNumber: true,
  title: true,
  description: true,
  deadline: true,
  priority: true,
  assignee: { select: { name: true } },
  assignees: { include: { user: { select: { name: true } } } },
  oilDepot: { select: { name: true } },
  tags: { include: { tag: { select: { name: true } } } },
} satisfies Prisma.TaskSelect;

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser();
    if (!isAiTaskDraftEnabled()) return fail("ИИ-помощник не подключен", 404);

    const input = aiAssistantRequestSchema.parse(await request.json());
    const board = await prisma.board.findFirst({
      where: input.boardId ? { AND: [accessibleBoardWhere(user), { id: input.boardId }] } : accessibleBoardWhere(user),
      select: {
        id: true,
        name: true,
        columns: {
          orderBy: { position: "asc" },
          select: { name: true, tasks: { where: { archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 120, select: taskSelect } },
        },
      },
    });
    if (!board) return fail("Доска не найдена", 404);

    const context = {
      asOf: new Date().toISOString(),
      board: board.name,
      columns: board.columns.map((column) => ({
        name: column.name,
        tasks: column.tasks.map((task) => ({
          taskId: task.id,
          number: task.taskNumber,
          title: task.title,
          description: task.description.slice(0, 320),
          deadline: task.deadline?.toISOString() ?? null,
          priority: task.priority,
          assignees: uniqueNames([
            task.assignee?.name ?? "",
            ...task.assignees.map((assignment) => assignment.user.name),
          ]),
          oilDepot: task.oilDepot?.name ?? null,
          tags: task.tags.map((item) => item.tag.name),
        })),
      })),
    };

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: deepSeekModel(),
        messages: [
          { role: "system", content: assistantSystemPrompt },
          { role: "user", content: JSON.stringify({ question: input.prompt, context }) },
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) return fail(payload?.error?.message ?? "DeepSeek не вернул ответ", 502);

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return fail("DeepSeek вернул пустой ответ", 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return fail("ИИ вернул некорректный ответ. Попробуйте ещё раз.", 502);
    }

    const result = aiAssistantResponseSchema.safeParse(parsed);
    if (!result.success) return fail("ИИ вернул неполный ответ. Попробуйте уточнить вопрос.", 502);
    const taskById = new Map(board.columns.flatMap((column) => column.tasks).map((task) => [task.id, task]));
    const columnByTaskId = new Map(board.columns.flatMap((column) => column.tasks.map((task) => [task.id, column.name])));
    const recommendations = result.data.recommendations.flatMap((recommendation) => {
      const task = taskById.get(recommendation.taskId);
      if (!task) return [];
      return [{
        ...recommendation,
        taskNumber: task.taskNumber,
        title: task.title,
        column: columnByTaskId.get(task.id) ?? recommendation.column,
        priority: task.priority,
        deadline: task.deadline?.toISOString() ?? null,
      }];
    });
    return ok({ answer: result.data.answer, recommendations });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return fail("ИИ не ответил вовремя. Попробуйте ещё раз.", 504);
    }
    return handleRouteError(error);
  }
}

function uniqueNames(names: string[]) {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}
