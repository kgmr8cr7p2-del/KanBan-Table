import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("oil depot cards keep a stable row rhythm across owner columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const moduleCss = fs.readFileSync(path.join(process.cwd(), "src/components/OilDepotDirectory.module.css"), "utf8");
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.setContent(`
    <style>
      :root {
        --ds-space-1: 8px;
        --ds-space-2: 16px;
        --ds-radius-panel: 16px;
        --ds-radius-control: 12px;
        --ds-radius-compact: 8px;
        --ds-line: #dbe4ef;
        --ds-surface: #fff;
        --ds-surface-raised: #f5f7fa;
        --ds-shadow-panel: 0 4px 16px rgb(16 24 40 / 8%);
        --border: #dbe4ef;
        --panel: #fff;
        --panel-2: #f5f7fa;
        --muted: #60708a;
        --text: #172338;
        --brand: #3769d6;
        --success: #17845c;
        --warning: #b56a12;
      }
      body { margin: 0; padding: 24px; background: #edf2f8; }
      h2, h3, p { margin: 0; }
    </style>
    <style>${moduleCss}</style>
    <main class="people">
      <section class="person"><header class="personHeading"><div class="avatar">Н</div><div><h2>Немых Д.Д.</h2><p>Нефтебаз: 7 · Открытых задач: 22</p></div></header><div class="depots"></div></section>
      <section class="person"><header class="personHeading"><div class="avatar">М</div><div><h2>Москаленко Н.Т.</h2><p>Нефтебаз: 5 · Открытых задач: 0</p></div></header><div class="depots"></div></section>
      <section class="person"><header class="personHeading"><div class="avatar">Л</div><div><h2>Лесин В.В.</h2><p>Нефтебаз: 5 · Открытых задач: 7</p></div></header><div class="depots"></div></section>
    </main>
  `);
  await page.evaluate(() => {
    const card = (name: string, extra: string) => `
      <article class="depot">
        <div class="depotHeading"><h3>${name}</h3><span class="os">Astra</span></div>
        <div class="metrics"><span><strong>1</strong>открыто</span><span><strong>1</strong>просрочено</span><span><strong>0</strong>готово</span></div>
        <div class="activity"><span>Работа по задачам</span><time>25 авг. 2026 г.</time></div>
        <div class="activity"><span>Последняя проверка</span><time>Нет записей</time></div>
        <p class="fresh">✓ Активность 2 дн. назад</p>
        ${extra}
        <details class="details"><summary>Состав АСУ ТП</summary></details>
        <button class="checkButton" type="button">Отметить проверку</button>
      </article>`;
    const depots = Array.from(document.querySelectorAll<HTMLElement>(".depots"));
    depots[0].innerHTML = card("Евсино", "<details class='details'><summary>Открытые задачи (1)</summary></details>");
    depots[0].insertAdjacentHTML("beforeend", card("Козулька", ""));
    depots[1].innerHTML = card("Барабинск", "<p class='unmatched'>Связь с нефтебазой не найдена.</p>");
    depots[1].insertAdjacentHTML("beforeend", card("Иваново", ""));
    depots[2].innerHTML = card("Баженово", "");
    depots[2].insertAdjacentHTML("beforeend", card("Гладкое", "<details class='details'><summary>Открытые задачи (4)</summary></details>"));
  });

  const metrics = await page.evaluate(() => {
    const groups = Array.from(document.querySelectorAll<HTMLElement>(".depots"));
    const cards = groups.flatMap(group => Array.from(group.querySelectorAll<HTMLElement>(":scope > .depot")));
    const rows = groups.map(group => Array.from(group.querySelectorAll<HTMLElement>(":scope > .depot")).map(card => {
      const box = card.getBoundingClientRect();
      const button = card.querySelector<HTMLElement>(".checkButton")?.getBoundingClientRect();
      return { top: box.top, height: box.height, bottom: box.bottom, buttonBottom: button?.bottom ?? null };
    }));
    return { rows, minHeight: Math.min(...cards.map(card => card.getBoundingClientRect().height)) };
  });

  for (const rowIndex of [0, 1]) {
    const tops = metrics.rows.map(rows => rows[rowIndex].top);
    const heights = metrics.rows.map(rows => rows[rowIndex].height);
    const buttonBottoms = metrics.rows.map(rows => rows[rowIndex].buttonBottom ?? 0);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
    expect(Math.max(...buttonBottoms) - Math.min(...buttonBottoms)).toBeLessThanOrEqual(1);
  }
  expect(metrics.minHeight).toBeGreaterThanOrEqual(376);
});
