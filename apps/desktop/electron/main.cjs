const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");

const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";
const isDev = !app.isPackaged;
const BACKEND_PORT = Number(process.env.BUSYA_BACKEND_PORT || 4000);

let mainWindow = null;
let backendProcess = null;
let backendLogStream = null;

function resolveBackendDir() {
  if (isDev) {
    return path.join(__dirname, "../../../backend");
  }
  return path.join(process.resourcesPath, "backend");
}

function getBackendLogPath() {
  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, "backend.log");
}

function waitForPort(port, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tryConnect = () => {
      const socket = net.connect({ port, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          resolve(false);
        } else {
          setTimeout(tryConnect, 300);
        }
      });
      socket.setTimeout(1000, () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          resolve(false);
        } else {
          setTimeout(tryConnect, 300);
        }
      });
    };
    tryConnect();
  });
}

async function ensureBackend() {
  if (isDev) return;
  const alreadyUp = await waitForPort(BACKEND_PORT, 500);
  if (alreadyUp) return;

  const backendDir = resolveBackendDir();
  const entry = path.join(backendDir, "dist", "main.js");
  if (!fs.existsSync(entry)) {
    dialog.showErrorBox("Backend missing", `Cannot find backend entry: ${entry}`);
    return;
  }

  const logPath = getBackendLogPath();
  backendLogStream = fs.createWriteStream(logPath, { flags: "a" });

  backendProcess = spawn(process.execPath, [entry], {
    cwd: backendDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(BACKEND_PORT),
    },
    stdio: ["ignore", backendLogStream, backendLogStream],
    windowsHide: true,
  });

  backendProcess.on("exit", (code) => {
    console.error("[backend] exited with code", code);
  });

  const ready = await waitForPort(BACKEND_PORT, 10000);
  if (!ready) {
    dialog.showErrorBox(
      "Backend not ready",
      `Failed to start backend. Check DATABASE_URL and logs:\n${logPath}`
    );
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (isDev) {
    console.log("[electron] loading:", DEV_URL);
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(__dirname, "../dist/index.html");
    console.log("[electron] loading file:", indexHtml);
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("busya:ping", async () => "pong");

app.whenReady().then(() => {
  console.log("[electron] ready");
  ensureBackend().finally(() => {
    createWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  if (backendLogStream) {
    backendLogStream.end();
    backendLogStream = null;
  }
});
