const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("keyline", {
  history: {
    list: () => ipcRenderer.invoke("history:list"),
    save: (result: unknown) => ipcRenderer.invoke("history:save", result),
    clear: () => ipcRenderer.invoke("history:clear"),
    path: () => ipcRenderer.invoke("history:path")
  }
});

export {};
