import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await requireVerifiedUser();
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: { telegramConnection: true },
  });

  return (
    <AppShell user={user}>
      <div className="content">
        <section className="panel">
          <h1>Профиль</h1>
          <p className="muted">Имя, рабочая почта и Telegram chat ID для уведомлений.</p>
          <ProfileForm name={full?.name ?? user.name} email={user.email} telegramChatId={full?.telegramConnection?.chatId ?? ""} />
        </section>
      </div>
    </AppShell>
  );
}
