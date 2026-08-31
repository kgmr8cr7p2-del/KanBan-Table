"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="error-page">
      <section className="error-card" role="alert" aria-labelledby="error-title">
        <span className="error-code">ОШИБКА</span>
        <h1 id="error-title">Что-то пошло не так</h1>
        <p>Страница не загрузилась. Повторите попытку — ваши данные останутся на сервере.</p>
        <div className="error-actions">
          <button className="button" type="button" onClick={() => reset()}>Повторить</button>
          <a className="button secondary" href="/board">Вернуться к доске</a>
        </div>
      </section>
    </main>
  );
}
