const { app, BrowserWindow, Menu, Notification, Tray, nativeImage, session, shell, ipcMain } = require("electron");
const path = require("node:path");

const DASHBOARD_URL = process.env.TASKORA_URL || "https://kanban.region-free.online/desktop";
const ICON_PATH = path.join(__dirname, "..", "public", "taskora-icon-v2.png");

let mainWindow = null;
let tray = null;
let isQuitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showWindow();
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === "notifications");
    });

    createWindow();
    createTray();

    app.on("activate", () => {
      showWindow();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 460,
    minHeight: 560,
    show: false,
    backgroundColor: "#f4f6fb",
    icon: ICON_PATH,
    title: "Taskora — рабочий экран",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.loadURL(DASHBOARD_URL);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon);
  tray.setToolTip("Taskora");

  const menu = Menu.buildFromTemplate([
    { label: "Открыть рабочий экран", click: showWindow },
    { label: "Обновить данные", click: refreshWindow },
    { type: "separator" },
    { label: "Выйти", click: () => { isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", showWindow);
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function refreshWindow() {
  if (!mainWindow) {
    showWindow();
    return;
  }
  mainWindow.webContents.reload();
  showWindow();
}

ipcMain.on("window:show", showWindow);
ipcMain.on("window:refresh", refreshWindow);

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // The tray keeps the companion available until the user chooses «Выйти».
  }
});
