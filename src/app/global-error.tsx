"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "#f7f9fc", color: "#111827", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ width: "min(100%, 520px)", border: "1px solid #dfe3ea", borderRadius: "18px", background: "#fff", padding: "32px", boxShadow: "0 16px 40px rgb(15 23 42 / 12%)" }}>
          <p style={{ margin: "0 0 10px", color: "#1d4ed8", fontSize: "12px", fontWeight: 800, letterSpacing: ".12em" }}>ОШИБКА ПРИ ЗАПУСКЕ</p>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(24px, 5vw, 36px)" }}>Приложение не загрузилось</h1>
          <p style={{ margin: "0 0 24px", color: "#5f6b7a", lineHeight: 1.5 }}>Обновите страницу или повторите попытку.</p>
          <button type="button" onClick={() => reset()} style={{ minHeight: "44px", border: 0, borderRadius: "10px", background: "#2563eb", color: "#fff", padding: "0 18px", font: "inherit", fontWeight: 700, cursor: "pointer" }}>Повторить</button>
        </main>
      </body>
    </html>
  );
}
