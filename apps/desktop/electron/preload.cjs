const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("busya", {
  ping: () => "pong",
  versions: process.versions,
});
