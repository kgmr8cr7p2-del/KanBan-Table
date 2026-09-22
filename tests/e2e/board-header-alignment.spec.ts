import { expect, test } from "@playwright/test";

async function mountBoardHeader(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.interfaceMode = "new";
    document.body.innerHTML = `
      <div class="app">
        <main class="main">
          <div class="topbar board-topbar">
            <form class="toolbar filters-compact filters-live" aria-label="Фильтры доски">
              <label class="field search compact-field"><span class="meta-row search-shell"><span aria-hidden="true">⌕</span><input class="input compact-input" placeholder="Поиск" /></span></label>
              <select class="select compact-select"><option>Нефтебаза</option></select>
              <select class="select compact-select"><option>Приоритет</option></select>
              <select class="select compact-select"><option>Исполнитель</option></select>
              <select class="select compact-select"><option>Дедлайн</option></select>
              <button class="button secondary compact-button reset-filter-button" type="button">× Сбросить</button>
            </form>
            <div class="board-topbar-actions">
              <span class="sync-pill">Обновлено 11:14:03</span>
              <div class="board-notification-control"><button class="button secondary compact-button" type="button" aria-label="Уведомления">◉</button></div>
              <button class="button secondary compact-button board-panel-toggle" type="button"><span class="panel-toggle-label">Скрыть боковую</span></button>
              <button class="button secondary compact-button board-panel-toggle" type="button"><span class="panel-toggle-label">Скрыть верхнюю</span></button>
              <button class="button secondary compact-button" type="button">Доска</button>
              <a class="button secondary compact-button" href="#">TV</a>
            </div>
          </div>
          <div class="content board-content">
            <section class="board">
              <article class="column"><header class="column-head"><strong>Новые</strong><span class="count">19</span></header></article>
              <article class="column"><header class="column-head"><strong>В работе</strong><span class="count">4</span></header></article>
              <article class="column"><header class="column-head"><strong>На проверке</strong><span class="count">1</span></header></article>
              <article class="column"><header class="column-head"><strong>Требует уточнения</strong><span class="count">1</span></header></article>
              <article class="column"><header class="column-head"><strong>На паузе</strong><span class="count">5</span></header></article>
              <article class="column column-done"><header class="column-head"><strong>Готово</strong><span class="count">11</span></header></article>
            </section>
          </div>
        </main>
      </div>`;
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
]) {
  test(`board header stays aligned at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login", { waitUntil: "networkidle" });
    await mountBoardHeader(page);

    const metrics = await page.evaluate(() => {
      const topbar = document.querySelector<HTMLElement>(".board-topbar");
      const filters = document.querySelector<HTMLElement>(".filters-live");
      const actions = document.querySelector<HTMLElement>(".board-topbar-actions");
      const reset = document.querySelector<HTMLElement>(".reset-filter-button");
      const count = document.querySelector<HTMLElement>(".column-head .count");
      const columnHead = document.querySelector<HTMLElement>(".column-head");
      if (!topbar || !filters || !actions || !reset || !count || !columnHead) throw new Error("Board header did not mount");

      const overlaps = (first: DOMRect, second: DOMRect) => (
        first.left < second.right - 1
        && first.right > second.left + 1
        && first.top < second.bottom - 1
        && first.bottom > second.top + 1
      );
      const resetRect = reset.getBoundingClientRect();
      const filterChildren = Array.from(filters.children)
        .filter((child) => child !== reset)
        .map((child) => child.getBoundingClientRect());
      const countRect = count.getBoundingClientRect();
      const headRect = columnHead.getBoundingClientRect();
      const countStyle = getComputedStyle(count);
      const topbarStyle = getComputedStyle(topbar);

      return {
        resetOverlapsSibling: filterChildren.some((rect) => rect !== resetRect && overlaps(resetRect, rect)),
        filtersOverlapActions: overlaps(filters.getBoundingClientRect(), actions.getBoundingClientRect()),
        countIsCentered: Math.abs((countRect.top + countRect.height / 2) - (headRect.top + headRect.height / 2)) <= 1
          && countStyle.textAlign === "center",
        countDisplay: countStyle.display,
        countPlaceItems: countStyle.placeItems,
        topbarContainerType: topbarStyle.containerType,
      };
    });

    expect(metrics.resetOverlapsSibling).toBe(false);
    expect(metrics.filtersOverlapActions).toBe(false);
    expect(metrics.countIsCentered).toBe(true);
    expect(["grid", "inline-grid"]).toContain(metrics.countDisplay);
    expect(metrics.countPlaceItems).toBe("center");
    expect(metrics.topbarContainerType).toBe("inline-size");
  });
}
