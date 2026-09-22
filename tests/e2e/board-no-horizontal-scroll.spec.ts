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
              <article class="column"><header class="column-head"><strong>Новые</strong><span class="count">19</span></header><div class="task-list"><article class="task-card priority-card-HIGH" data-content-check="true"><div class="task-card-head"><span class="task-priority-signal">Высокий</span><span class="task-deadline-signal">Просрочено · 17.08.2026</span></div><strong class="task-title">#326 CHL07-TR-MSS01 — устранить избыточную генерацию событий auditd</strong><p class="task-description">Описание с дополнительным контекстом для проверки полной высоты карточки.</p><div class="task-context-row"><span class="task-assignee-summary">Исполнитель: Москаленко Н.Т.</span></div><div class="task-secondary-row"><span class="chip">💬 2</span><span class="chip">Критично</span></div></article></div></article>
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

    const metrics = await page.evaluate((viewportWidth) => {
      const board = document.querySelector<HTMLElement>(".board");
      if (!board) throw new Error("Board shell did not mount");
      const boardRect = board.getBoundingClientRect();
      const columns = Array.from(document.querySelectorAll<HTMLElement>(".board > .column"));
      const taskLists = Array.from(document.querySelectorAll<HTMLElement>(".board > .column > .task-list"));
      const columnTops = columns.map((column) => column.getBoundingClientRect().top);
      const matchesResponsiveColumnFlow = viewportWidth <= 720 || (Math.max(...columnTops) - Math.min(...columnTops) <= 1);
      const mainOverflowY = getComputedStyle(document.querySelector<HTMLElement>(".main")!).overflowY;
      const columnOverflowY = columns.map((column) => getComputedStyle(column).overflowY);
      const taskListOverflowY = taskLists.map((taskList) => getComputedStyle(taskList).overflowY);
      const rootOverflowY = getComputedStyle(document.documentElement).overflowY;
      const bodyOverflowY = getComputedStyle(document.body).overflowY;
      const appOverflowY = getComputedStyle(document.querySelector<HTMLElement>(".app")!).overflowY;
      const documentOwnsVerticalScroll = mainOverflowY === "visible"
        && columnOverflowY.every((overflowY) => overflowY === "visible")
        && taskListOverflowY.every((overflowY) => overflowY === "visible")
        && (rootOverflowY === "visible" || rootOverflowY === "auto")
        && bodyOverflowY === "auto"
        && appOverflowY === "visible";
      return {
        pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
        boardOverflow: board.scrollWidth - board.clientWidth,
        boardOverflowX: getComputedStyle(board).overflowX,
        matchesResponsiveColumnFlow,
        documentOwnsVerticalScroll,
        cardsAreFullyVisible: Array.from(document.querySelectorAll<HTMLElement>("[data-content-check]"), (card) => {
          const style = getComputedStyle(card);
          return style.overflow === "visible" && card.scrollHeight <= card.clientHeight + 1;
        }).every(Boolean),
        columnsInsideBoard: columns.every((column) => {
          const rect = column.getBoundingClientRect();
          return rect.left >= boardRect.left - 1 && rect.right <= boardRect.right + 1;
        }),
        columnCount: columns.length,
      };
    }, viewport.width);

    expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
    expect(metrics.boardOverflow).toBeLessThanOrEqual(1);
    expect(metrics.boardOverflowX).toBe("visible");
    expect(metrics.matchesResponsiveColumnFlow).toBe(true);
    expect(metrics.documentOwnsVerticalScroll).toBe(true);
    expect(metrics.cardsAreFullyVisible).toBe(true);
    expect(metrics.columnsInsideBoard).toBe(true);
    expect(metrics.columnCount).toBe(6);
  });
}
