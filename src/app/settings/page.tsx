import { AppShell } from "@/components/AppShell";
import { BoardSettings } from "@/components/BoardSettings";
import { GoidaTestButton } from "@/components/GoidaTestButton";
import { OilDepotSettings } from "@/components/OilDepotSettings";
import { requireVerifiedUser } from "@/lib/auth";
import { getBoardView } from "@/lib/board-data";

export default async function SettingsPage() {
  const user = await requireVerifiedUser();
  const view = await getBoardView(user);

  return (
    <AppShell user={user}>
      <div className="content">
        <section className="panel">
          <h1>Настройки доски</h1>
          <p className="muted">Администратор может добавлять, переименовывать и удалять пустые колонки.</p>
          {user.email.toLowerCase() === "les_victor@mail.ru" ? (
            <div className="settings-block goida-test-panel">
              <div>
                <h2>Проверка уведомления</h2>
                <p className="muted">Личный тест вечернего уведомления: звук проиграется один раз, окно закроется примерно через 15 секунд.</p>
              </div>
              <GoidaTestButton />
            </div>
          ) : null}
          <BoardSettings columns={JSON.parse(JSON.stringify(view?.board.columns ?? []))} canManage={user.role.name === "ADMIN"} />
          <OilDepotSettings oilDepots={JSON.parse(JSON.stringify(view?.oilDepots ?? []))} canManage={user.role.name === "ADMIN"} />
        </section>
      </div>
    </AppShell>
  );
}
