import { MessageCircleMore, Radio } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChatHub } from "@/components/ChatHub";
import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";

export default async function ChatsPage() {
  const user = await requirePermission(PermissionKey.USE_CHATS);

  return (
    <AppShell user={user}>
      <div className="content chats-page">
        <header className="chats-page-head">
          <div className="chats-page-intro">
            <span className="settings-page-kicker"><MessageCircleMore size={17} /> Командное общение</span>
            <h1>Связь без лишнего шума</h1>
            <p>Личные диалоги команды, файлы и быстрые решения — в одном рабочем пространстве.</p>
          </div>
          <div className="chats-page-presence"><span><Radio size={14} aria-hidden="true" /> Live</span><small>Автосинхронизация включена</small></div>
        </header>
        <ChatHub viewerId={user.id} />
      </div>
    </AppShell>
  );
}
