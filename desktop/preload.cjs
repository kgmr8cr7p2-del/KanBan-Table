const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taskoraDesktop", {
  isDesktop: true,
  showWindow: () => ipcRenderer.send("window:show"),
  refresh: () => ipcRenderer.send("window:refresh"),
});
