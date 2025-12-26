const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("busya", {
  ping: () => ipcRenderer.invoke("busya:ping"),
});
