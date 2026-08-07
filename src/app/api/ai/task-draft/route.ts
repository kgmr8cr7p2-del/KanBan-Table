import { Priority } from "@prisma/client";
import { requireVerifiedUser } from "@/lib/auth";
import { accessibleBoardWhere } from "@/lib/board-access";
import { aiTaskDraftRequestSchema, aiTaskDraftSchema, deepSeekModel, isAiTaskDraftEnabled } from "@/lib/ai-task-draft";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const systemPrompt = [
  "Ты диспетчер задач внутренней канбан-доски.",
  "Верни только валидный JSON без markdown.",
  "Ничего не создавай и не применяй сам, только предложи черновик.",
  "Дедлайн не устанавливай: если пользователь назвал срок, запиши его только в deadlineHint.",
  "Приоритет, исполнителей, нефтебазу и теги только предлагай.",
  "Используй только переданные id пользователей и нефтебаз.",
  "existingTags выбирай только из списка существующих тегов.",
  "newTags предлагай только как рабочие функциональные категории, не для срочности и не для шуток.",
  "checklist добавляй только для сложных, многошаговых, проверочных, ремонтных или согласовательных задач.",
].join("\n");

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser();
    if (!isAiTaskDraftEnabled()) return fail("ИИ-помощник не подключен", 404);

    const input = aiTaskDraftRequestSchema.parse(await request.json());
    const board = await prisma.board.findFirst({
      where: input.boardId ? { AND: [accessibleBoardWhere(user), { id: input.boardId }] } : accessibleBoardWhere(user),
      include: { columns: { orderBy: { position: "asc" }, select: { id: true, name: true } } },
    });
    if (!board) return fail("Доска не найдена", 404);

    const [users, oilDepots, tags] = await Promise.all([
      prisma.user.findMany({
        where: board.ownerId ? { id: user.id, approvedAt: { not: null } } : { approvedAt: { not: null } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.oilDepot.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.tag.findMany({
        where: { tasks: { some: { task: { column: { boardId: board.id } } } } },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: deepSeekModel(),
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              userText: input.prompt,
              board: { id: board.id, name: board.name, columns: board.columns },
              allowedPriorities: Object.values(Priority),
              users,
              oilDepots,
              existingTags: tags.map((tag) => tag.name),
              responseShape: {
                title: "string",
                description: "string",
                prioritySuggestion: "LOW | PLANNED | MEDIUM | HIGH | CRITICAL | null",
                priorityReason: "short string",
                oilDepotId: "existing oilDepot id or null",
                assigneeIds: ["existing user ids"],
                existingTags: ["existing tag names"],
                newTags: ["new functional tag names"],
                checklist: ["only for complex tasks"],
                deadlineHint: "recognized user-provided due date text only",
                notes: "short caveat or empty",
              },
            }),
          },
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.2,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) return fail(payload?.error?.message ?? "DeepSeek не вернул черновик", 502);

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return fail("DeepSeek вернул пустой ответ", 502);

    const parsed = JSON.parse(content);
    const draft = sanitizeDraft(aiTaskDraftSchema.parse(parsed), {
      userIds: new Set(users.map((item) => item.id)),
      oilDepotIds: new Set(oilDepots.map((item) => item.id)),
      existingTags: new Set(tags.map((item) => item.name.toLocaleLowerCase("ru-RU"))),
    });

    return ok({ draft });
  } catch (error) {
    return handleRouteError(error);
  }
}

function sanitizeDraft(draft: ReturnType<typeof aiTaskDraftSchema.parse>, context: { userIds: Set<string>; oilDepotIds: Set<string>; existingTags: Set<string> }) {
  const unique = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  return {
    ...draft,
    oilDepotId: draft.oilDepotId && context.oilDepotIds.has(draft.oilDepotId) ? draft.oilDepotId : null,
    assigneeIds: unique(draft.assigneeIds).filter((id) => context.userIds.has(id)),
    existingTags: unique(draft.existingTags).filter((tag) => context.existingTags.has(tag.toLocaleLowerCase("ru-RU"))),
    newTags: unique(draft.newTags).filter((tag) => !context.existingTags.has(tag.toLocaleLowerCase("ru-RU"))),
    checklist: unique(draft.checklist),
  };
}
