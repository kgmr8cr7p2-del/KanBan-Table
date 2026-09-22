import { expect, test, type Page } from "@playwright/test";

/**
 * The board must reflow its columns inside the workspace.  A horizontal
 * scrollbar on the page or on the board hides statuses and makes the main
 * workflow depend on a swipe/trackpad gesture, so this is checked at the
 * viewport sizes where the grid changes shape.
 */
const viewports = [
  { width: 390, height: 844 },
  { width: 720, height: 900 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
] as const;

async function mountBoard(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.interfaceMode = "new";
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar"><div class="brand">Taskora</div></aside>
        <main class="main">
          <div class="content board-content">
            <section class="board" aria-label="Канбан-доска">
              <article class="column"><header class="column-head"><strong>Новые</strong><span class="count">19</span></header><div class="task-list"><article class="task-card"><strong class="task-title">Длинное название задачи должно переноситься внутри карточки</strong></article></div></article>
              <article class="column"><header class="column-head"><strong>В работе</strong><span class="count">4</span></header><div class="task-list"><article class="task-card"><strong class="task-title">Задача</strong></article></div></article>
              <article class="column"><header class="column-head"><strong>На проверке</strong><span class="count">1</span></header><div class="task-list"><article class="task-card"><strong class="task-title">Задача</strong></article></div></article>
              <article class="column"><header class="column-head"><strong>Требует уточнения</strong><span class="count">1</span></header><div class="task-list"><article class="task-card"><strong class="task-title">Задача</strong></article></div></article>
              <article class="column"><header class="column-head"><strong>На паузе</strong><span class="count">5</span></header><div class="task-list"><article class="task-card"><strong class="task-title">Задача</strong></article></div></article>
              <article class="column column-done"><header class="column-head"><strong>Готово</strong><span class="count">18</span></header><div class="task-list"><article class="task-card"><strong class="task-title">Задача</strong></article></div></article>
            </section>
          </div>
        </main>
      </div>`;
  });
}

for (const viewport of viewports) {
  test(`board reflows without horizontal scrolling at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    await mountBoard(page);

    const metrics = await page.evaluate(() => {
      const board = document.querySelector<HTMLElement>(".board");
      if (!board) throw new Error("Board shell did not mount");
      const boardRect = board.getBoundingClientRect();
      const columns = Array.from(document.querySelectorAll<HTMLElement>(".board > .column"));
      return {
        pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
        boardOverflow: board.scrollWidth - board.clientWidth,
        boardOverflowX: getComputedStyle(board).overflowX,
        columnsInsideBoard: columns.every((column) => {
          const rect = column.getBoundingClientRect();
          return rect.left >= boardRect.left - 1 && rect.right <= boardRect.right + 1;
        }),
        columnCount: columns.length,
      };
    });

    expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
    expect(metrics.boardOverflow).toBeLessThanOrEqual(1);
    expect(metrics.boardOverflowX).toBe("visible");
    expect(metrics.columnsInsideBoard).toBe(true);
    expect(metrics.columnCount).toBe(6);
  });
}
