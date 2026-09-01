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
            <h1>Чаты</h1>
            <p>Личные сообщения команды в одном месте.</p>
          </div>
        </header>
        <ChatHub viewerId={user.id} />
      </div>
    </AppShell>
  );
}
