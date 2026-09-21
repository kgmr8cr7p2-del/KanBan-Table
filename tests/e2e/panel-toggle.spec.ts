import { expect, test, type Page } from "@playwright/test";

/**
 * The authenticated board is intentionally not required for this regression
 * suite. We mount the same shell classes used by BoardClient on the real
 * application CSS, then exercise the panel state transitions in the browser.
 * This keeps the test deterministic while still catching cascade, grid,
 * overflow, sticky recovery, and touch-target regressions.
 */

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 480, height: 800 },
  { width: 540, height: 720 },
  { width: 600, height: 960 },
  { width: 640, height: 1024 },
  { width: 720, height: 900 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 900, height: 600 },
  { width: 1024, height: 768 },
  { width: 1152, height: 864 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
] as const;

type PanelMetrics = {
  sidebarDisplay: string;
  topbarDisplay: string;
  recoveryDisplay: string;
  recoveryHidden: boolean;
  pageOverflow: number;
  appColumns: string;
  recoveryRect: { left: number; right: number; top: number; bottom: number } | null;
  toggleSizes: Array<{ width: number; height: number }>;
};

async function mountBoardShell(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.interfaceMode = "new";
    document.documentElement.dataset.boardSidebarHidden = "false";
    document.documentElement.dataset.boardTopbarHidden = "false";
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="brand"><span>Taskora</span></div>
          <nav class="nav-desktop"><a href="#">Доска</a><a href="#">Документы</a></nav>
          <nav class="mobile-nav"><a href="#">Доска</a><a href="#">Чаты</a></nav>
        </aside>
        <main class="main">
          <div class="topbar board-topbar">
            <form class="filters-live">
              <label class="field search-shell"><input class="input" aria-label="Поиск" value="Поиск" /></label>
              <select class="select" aria-label="Приоритет"><option>Приоритет</option></select>
              <select class="select" aria-label="Дедлайн"><option>Дедлайн</option></select>
            </form>
            <div class="board-topbar-actions">
              <button class="button secondary board-panel-toggle" type="button" data-panel-toggle="sidebar">Скрыть боковую</button>
              <button class="button secondary board-panel-toggle" type="button" data-panel-toggle="topbar">Скрыть верхнюю</button>
            </div>
          </div>
          <div class="board-panel-controls" data-board-panel-recovery="true" hidden aria-label="Восстановить панели"></div>
          <div class="content board-content">
            <div class="board">
              <section class="column"><h2>Новые</h2><p>Задача с длинным названием для проверки переноса текста</p></section>
              <section class="column"><h2>В работе</h2><p>Задача</p></section>
              <section class="column"><h2>На проверке</h2><p>Задача</p></section>
              <section class="column"><h2>Требует уточнения</h2><p>Задача</p></section>
              <section class="column"><h2>На паузе</h2><p>Задача</p></section>
              <section class="column"><h2>Готово</h2><p>Задача</p></section>
            </div>
          </div>
        </main>
      </div>`;

    const root = document.documentElement;
    const state = { sidebar: true, topbar: true };
    const topbar = document.querySelector<HTMLElement>(".board-topbar");
    const recovery = document.querySelector<HTMLElement>("[data-board-panel-recovery]");
    const sidebarToggle = document.querySelector<HTMLButtonElement>("[data-panel-toggle='sidebar']");
    const topbarToggle = document.querySelector<HTMLButtonElement>("[data-panel-toggle='topbar']");
    if (!topbar || !recovery || !sidebarToggle || !topbarToggle) throw new Error("Panel test shell did not mount");

    const renderRecovery = () => {
      recovery.replaceChildren();
      recovery.hidden = state.topbar;
      if (state.topbar) return;

      const label = document.createElement("span");
      label.className = "board-panel-controls-label";
      label.textContent = "Панели";
      recovery.append(label);

      if (!state.sidebar) {
        const restoreSidebar = document.createElement("button");
        restoreSidebar.className = "button secondary";
        restoreSidebar.type = "button";
        restoreSidebar.dataset.panelRestore = "sidebar";
        restoreSidebar.textContent = "Показать боковую";
        recovery.append(restoreSidebar);
      }

      const restoreTopbar = document.createElement("button");
      restoreTopbar.className = "button secondary";
      restoreTopbar.type = "button";
      restoreTopbar.dataset.panelRestore = "topbar";
      restoreTopbar.textContent = "Показать верхнюю";
      recovery.append(restoreTopbar);
    };

    const renderState = () => {
      root.dataset.boardSidebarHidden = state.sidebar ? "false" : "true";
      root.dataset.boardTopbarHidden = state.topbar ? "false" : "true";
      sidebarToggle.textContent = state.sidebar ? "Скрыть боковую" : "Показать боковую";
      topbarToggle.textContent = state.topbar ? "Скрыть верхнюю" : "Показать верхнюю";
      sidebarToggle.setAttribute("aria-pressed", String(state.sidebar));
      topbarToggle.setAttribute("aria-pressed", String(state.topbar));
      renderRecovery();
    };

    sidebarToggle.addEventListener("click", () => {
      state.sidebar = !state.sidebar;
      renderState();
    });
    topbarToggle.addEventListener("click", () => {
      state.topbar = !state.topbar;
      renderState();
    });
    recovery.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-panel-restore]");
      if (!target) return;
      state[target.dataset.panelRestore as "sidebar" | "topbar"] = true;
      renderState();
    });
    renderState();
  });
}

async function readMetrics(page: Page): Promise<PanelMetrics> {
  return page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const topbar = document.querySelector<HTMLElement>(".board-topbar");
    const recovery = document.querySelector<HTMLElement>("[data-board-panel-recovery]");
    const recoveryRect = recovery?.getBoundingClientRect();
    return {
      sidebarDisplay: sidebar ? getComputedStyle(sidebar).display : "missing",
      topbarDisplay: topbar ? getComputedStyle(topbar).display : "missing",
      recoveryDisplay: recovery ? getComputedStyle(recovery).display : "missing",
      recoveryHidden: recovery?.hidden ?? true,
      pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
      appColumns: getComputedStyle(document.querySelector<HTMLElement>(".app")!).gridTemplateColumns,
      recoveryRect: recoveryRect
        ? { left: recoveryRect.left, right: recoveryRect.right, top: recoveryRect.top, bottom: recoveryRect.bottom }
        : null,
      toggleSizes: Array.from(document.querySelectorAll<HTMLElement>("[data-panel-toggle]"), (button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    };
  });
}

for (const viewport of viewports) {
  test(`panel hide/show remains stable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login", { waitUntil: "networkidle" });
    // Let Next's login hydration finish before replacing the body with the
    // deterministic board shell used by this layout regression test.
    await page.waitForTimeout(250);
    await mountBoardShell(page);

    const initial = await readMetrics(page);
    expect(initial.sidebarDisplay).not.toBe("none");
    expect(initial.topbarDisplay).not.toBe("none");
    expect(initial.recoveryHidden).toBe(true);
    expect(initial.pageOverflow).toBeLessThanOrEqual(1);
    expect(initial.toggleSizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true);

    await page.getByRole("button", { name: "Скрыть боковую" }).click();
    const sidebarHidden = await readMetrics(page);
    expect(sidebarHidden.sidebarDisplay).toBe("none");
    expect(sidebarHidden.topbarDisplay).not.toBe("none");
    expect(sidebarHidden.pageOverflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Показать боковую" }).click();
    expect((await readMetrics(page)).sidebarDisplay).not.toBe("none");

    await page.getByRole("button", { name: "Скрыть верхнюю" }).click();
    const topbarHidden = await readMetrics(page);
    expect(topbarHidden.topbarDisplay).toBe("none");
    expect(topbarHidden.recoveryHidden).toBe(false);
    expect(topbarHidden.recoveryDisplay).toBe("flex");
    expect(topbarHidden.recoveryRect).not.toBeNull();
    expect(topbarHidden.recoveryRect!.left).toBeGreaterThanOrEqual(-1);
    expect(topbarHidden.recoveryRect!.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(topbarHidden.recoveryRect!.top).toBeGreaterThanOrEqual(-1);
    expect(topbarHidden.pageOverflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Показать верхнюю" }).click();
    expect((await readMetrics(page)).topbarDisplay).not.toBe("none");

    await page.getByRole("button", { name: "Скрыть боковую" }).click();
    await page.getByRole("button", { name: "Скрыть верхнюю" }).click();
    const bothHidden = await readMetrics(page);
    expect(bothHidden.sidebarDisplay).toBe("none");
    expect(bothHidden.topbarDisplay).toBe("none");
    expect(bothHidden.recoveryHidden).toBe(false);
    expect(bothHidden.pageOverflow).toBeLessThanOrEqual(1);
    expect(await page.getByRole("button", { name: "Показать боковую" }).count()).toBe(1);
    expect(await page.getByRole("button", { name: "Показать верхнюю" }).count()).toBe(1);

    await page.getByRole("button", { name: "Показать верхнюю" }).click();
    await page.getByRole("button", { name: "Показать боковую" }).click();
    const restored = await readMetrics(page);
    expect(restored.sidebarDisplay).not.toBe("none");
    expect(restored.topbarDisplay).not.toBe("none");
    expect(restored.recoveryHidden).toBe(true);
    expect(restored.pageOverflow).toBeLessThanOrEqual(1);
  });
}
