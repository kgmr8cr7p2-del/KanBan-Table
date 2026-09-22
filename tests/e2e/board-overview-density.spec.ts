import { expect, test, type Page } from "@playwright/test";

async function mountBoardOverview(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.interfaceMode = "new";
    document.body.innerHTML = `
      <div class="app" style="display:block;inline-size:100%">
        <main class="main" style="inline-size:100%">
          <div class="content board-content" style="inline-size:100%">
            <section class="new-board-overview" aria-label="Обзор рабочей доски">
              <article class="new-board-hero-card">
                <span class="new-interface-kicker">Рабочая область · обзор</span>
                <h2>Taskora</h2>
                <p>Все задачи команды в одном спокойном ритме. Сначала — важное, затем — следующий шаг.</p>
                <div class="new-board-hero-meta"><span><i></i> Автообновление включено</span><span>43 карточки в поле зрения</span></div>
              </article>
              <article class="new-board-stat-card new-board-stat-card-dark"><span>Активно</span><strong>30</strong><small>задач требуют внимания</small></article>
              <article class="new-board-stat-card"><span>Готово</span><strong>12</strong><small>выполнено на доске</small></article>
              <article class="new-board-stat-card"><span>Со сроком</span><strong>42</strong><small>задач привязаны к дате</small></article>
              <article class="new-board-progress-card">
                <div class="new-board-card-heading"><span>Ритм работы</span><strong>29%</strong></div>
                <div class="new-board-column-progress">
                  <div class="new-board-column-progress-row"><span>Новые</span><b>19</b><span class="new-board-column-progress-track"><i style="inline-size:70%"></i></span></div>
                  <div class="new-board-column-progress-row"><span>В работе</span><b>4</b><span class="new-board-column-progress-track"><i style="inline-size:20%"></i></span></div>
                  <div class="new-board-column-progress-row"><span>На проверке</span><b>1</b><span class="new-board-column-progress-track"><i style="inline-size:8%"></i></span></div>
                  <div class="new-board-column-progress-row"><span>Требует уточнения</span><b>1</b><span class="new-board-column-progress-track"><i style="inline-size:8%"></i></span></div>
                  <div class="new-board-column-progress-row"><span>На паузе</span><b>5</b><span class="new-board-column-progress-track"><i style="inline-size:24%"></i></span></div>
                  <div class="new-board-column-progress-row"><span>Готово</span><b>12</b><span class="new-board-column-progress-track"><i style="inline-size:48%"></i></span></div>
                </div>
              </article>
            </section>
          </div>
        </main>
      </div>`;
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
]) {
  test(`board overview stays compact at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login", { waitUntil: "networkidle" });
    await mountBoardOverview(page);

    const metrics = await page.evaluate(() => {
      const overview = document.querySelector<HTMLElement>(".new-board-overview");
      const hero = document.querySelector<HTMLElement>(".new-board-hero-card");
      const progress = document.querySelector<HTMLElement>(".new-board-progress-card");
      if (!overview || !hero || !progress) throw new Error("Board overview did not mount");
      return {
        overviewHeight: overview.getBoundingClientRect().height,
        heroHeight: hero.getBoundingClientRect().height,
        progressHeight: progress.getBoundingClientRect().height,
        pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
        heroContentVisible: hero.scrollHeight <= hero.clientHeight + 1,
      };
    });

    expect(metrics.overviewHeight).toBeLessThanOrEqual(260);
    expect(metrics.heroHeight).toBeLessThanOrEqual(260);
    expect(metrics.progressHeight).toBeLessThanOrEqual(152);
    expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
    expect(metrics.heroContentVisible).toBe(true);
  });
}
