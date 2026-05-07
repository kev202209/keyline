const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

interface TypingHistoryResult {
  id: string;
  createdAt: string;
  mode: "time";
  durationSeconds: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  correctWords: number;
  wordCount: number;
  typedChars: number;
}

type RawTypingHistoryResult = Partial<TypingHistoryResult>;

const isMac = process.platform === "darwin";
const historyFileName = "typing-history.json";

let mainWindow: any;

function getHistoryPath(): string {
  return path.join(app.getPath("userData"), historyFileName);
}

async function readHistory(): Promise<TypingHistoryResult[]> {
  try {
    const raw = await fs.readFile(getHistoryPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((entry) => sanitizeResult(entry)) : [];
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }

    console.error("Failed to read typing history:", error);
    return [];
  }
}

async function writeHistory(history: TypingHistoryResult[]): Promise<void> {
  await fs.mkdir(path.dirname(getHistoryPath()), { recursive: true });
  await fs.writeFile(getHistoryPath(), JSON.stringify(history, null, 2), "utf8");
}

function sanitizeResult(result: RawTypingHistoryResult): TypingHistoryResult {
  const now = new Date().toISOString();

  return {
    id: typeof result.id === "string" && result.id ? result.id : `run-${Date.now()}`,
    createdAt: typeof result.createdAt === "string" ? result.createdAt : now,
    mode: "time",
    durationSeconds: Number(result.durationSeconds) || 30,
    wpm: Number(result.wpm) || 0,
    rawWpm: Number(result.rawWpm) || 0,
    accuracy: Number(result.accuracy) || 0,
    correctChars: Number(result.correctChars) || 0,
    incorrectChars: Number(result.incorrectChars) || 0,
    extraChars: Number(result.extraChars) || 0,
    correctWords: Number(result.correctWords) || 0,
    wordCount: Number(result.wordCount) || 0,
    typedChars: Number(result.typedChars) || 0
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#0f1412",
    title: "Keyline Type",
    titleBarStyle: isMac ? "hiddenInset" : "default",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "..", "src", "renderer", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  ipcMain.handle("history:list", async () => {
    const history = await readHistory();
    return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ipcMain.handle("history:save", async (_event: unknown, result: RawTypingHistoryResult) => {
    const history = await readHistory();
    const nextResult = sanitizeResult(result || {});
    const nextHistory = [nextResult, ...history].slice(0, 1000);
    await writeHistory(nextHistory);
    return nextResult;
  });

  ipcMain.handle("history:clear", async () => {
    await writeHistory([]);
    return [];
  });

  ipcMain.handle("history:path", async () => getHistoryPath());

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

export {};
