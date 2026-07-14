import { Bot, ExternalLink, Settings2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BoardSettings } from "@/components/BoardSettings";
import { GoidaTestButton } from "@/components/GoidaTestButton";
import { OilDepotSettings } from "@/components/OilDepotSettings";
import { PersonalBoardSettings } from "@/components/PersonalBoardSettings";
import { requireVerifiedUser } from "@/lib/auth";
import { getBoardView } from "@/lib/board-data";
import { prisma } from "@/lib/prisma";
import { telegramBotLink } from "@/lib/telegram-link";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const user = await requireVerifiedUser();
  const query = await searchParams;
  const filters = new URLSearchParams();
  if (query.board) filters.set("board", query.board);
  const view = await getBoardView(user, filters);
  const selectedBoard = view?.board;
  const telegramConnection = await prisma.telegramConnection.findUnique({ where: { userId: user.id }, select: { enabled: true } });
  const botLink = await telegramBotLink(user.id);

  return (
    <AppShell user={user}>
      <div className="content settings-page">
        <header className="settings-page-head">
          <span className="settings-page-kicker"><Settings2 size={17} /> Настройки рабочего пространства</span>
          <h1>Настройки Taskora</h1>
          <p>Управляйте досками, справочниками и подключением личных Telegram-уведомлений.</p>
        </header>
        <section className="settings-utilities settings-utilities-top">
          <div className="settings-block telegram-settings-panel">
            <span className="telegram-settings-icon" aria-hidden="true"><Bot size={22} /></span>
            <div>
              <h2>Чат с Telegram-ботом</h2>
              <p className="muted">Откройте бота и нажмите «Начать». После подключения он сможет присылать напоминания с личных досок прямо вам.</p>
              <span className={`telegram-connection-status ${telegramConnection?.enabled ? "is-connected" : ""}`}>
                {telegramConnection?.enabled ? "Личный чат подключён" : "Личный чат ещё не подключён"}
              </span>
            </div>
            {botLink ? (
              <a className="button secondary" href={botLink} target="_blank" rel="noreferrer">
                {telegramConnection?.enabled ? "Открыть чат с ботом" : "Подключить бота"}
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            ) : (
              <span className="muted telegram-settings-unavailable">Укажите TELEGRAM_BOT_USERNAME, чтобы открыть чат.</span>
            )}
          </div>
        </section>
        <div className="settings-managers">
          <PersonalBoardSettings initialBoards={JSON.parse(JSON.stringify((view?.availableBoards ?? []).filter((board: any) => board.ownerId === user.id)))} />
          {selectedBoard ? (
            <BoardSettings
              boardId={selectedBoard.id}
              boardName={selectedBoard.name}
              boards={JSON.parse(JSON.stringify(view?.availableBoards ?? []))}
              columns={JSON.parse(JSON.stringify(selectedBoard.columns))}
              canManage={selectedBoard.ownerId === user.id || user.role.name === "ADMIN"}
            />
          ) : null}
          <OilDepotSettings oilDepots={JSON.parse(JSON.stringify(view?.oilDepots ?? []))} canManage={user.role.name === "ADMIN"} />
        </div>
        {user.email.toLowerCase() === "les_victor@mail.ru" ? (
          <section className="settings-utilities">
            <div className="settings-block goida-test-panel">
              <div>
                <h2>Проверка уведомления</h2>
                <p className="muted">Личный тест вечернего уведомления: звук проиграется один раз, окно закроется примерно через 15 секунд.</p>
              </div>
              <GoidaTestButton />
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
