import { app, BrowserWindow, shell } from "electron";
import path from "node:path";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  console.log("[electron] createMainWindow() start");

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    show: false, // покажем после ready-to-show (чтобы не было белого окна)
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    console.log("[electron] window ready-to-show");
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools({ mode: "detach" });
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[electron] did-fail-load", { code, desc, url });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    console.log("[electron] loading dev url:", devUrl);
    mainWindow.loadURL(devUrl);
  } else {
    // для билда
    const indexHtml = path.join(__dirname, "../dist/index.html");
    console.log("[electron] loading file:", indexHtml);
    mainWindow.loadFile(indexHtml);
  }
}

app.on("ready", () => {
  console.log("[electron] app ready");
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// Ловим молчаливые падения
process.on("uncaughtException", (e) => console.error("[electron] uncaughtException", e));
process.on("unhandledRejection", (e) => console.error("[electron] unhandledRejection", e));
