import { CalendarDays, Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { changelog } from "@/data/changelog";
import { requireVerifiedUser } from "@/lib/auth";

export default async function ChangelogPage() {
  const user = await requireVerifiedUser();

  return (
    <AppShell user={user}>
      <div className="content changelog-page">
        <header className="changelog-head">
          <span className="settings-page-kicker"><Sparkles size={17} aria-hidden="true" /> Мемо обновлений</span>
          <h1>Что нового в Taskora</h1>
          <p>Здесь собраны заметные изменения продукта — от новых функций до улучшений рабочих сценариев.</p>
        </header>
        <ol className="changelog-list">
          {changelog.map((release) => (
            <li key={release.date}>
              <article className="changelog-release">
                <header>
                  <time dateTime={release.date}><CalendarDays size={16} aria-hidden="true" />{formatDate(release.date)}</time>
                  {"current" in release && release.current ? <span>Текущее обновление</span> : null}
                </header>
                <h2>{release.title}</h2>
                <ul>
                  {release.changes.map((change) => <li key={change}><Check size={16} aria-hidden="true" /><span>{change}</span></li>)}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </AppShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}
