interface TypingHistoryResult extends TypingStats {
  id: string;
  createdAt: string;
  mode: "time";
  durationSeconds: number;
}

interface AppState {
  durationSeconds: number;
  words: string[];
  startedAt: number | null;
  completed: boolean;
  intervalId: number | null;
  history: TypingHistoryResult[];
}

interface ResetOptions {
  keepFocus?: boolean;
}

interface TypedWordsForRender {
  parts: string[];
  activeIndex: number;
}

interface KeylineApi {
  history: {
    list: () => Promise<TypingHistoryResult[]>;
    save: (result: TypingHistoryResult) => Promise<TypingHistoryResult>;
    clear: () => Promise<TypingHistoryResult[]>;
    path: () => Promise<string>;
  };
}

interface Window {
  keyline: KeylineApi;
}

const wordBank: string[] = [
  "able", "about", "above", "after", "again", "align", "almost", "amber", "anchor", "answer",
  "array", "aside", "audio", "basic", "beach", "begin", "bloom", "brave", "brief", "bring",
  "build", "calm", "carry", "cause", "center", "change", "chart", "clear", "close", "cloud",
  "coast", "color", "common", "control", "create", "daily", "dance", "debug", "delta", "design",
  "detail", "direct", "draft", "dream", "drive", "early", "earth", "echo", "editor", "effect",
  "energy", "engine", "equal", "every", "exact", "field", "final", "first", "fluent", "focus",
  "forest", "frame", "fresh", "future", "garden", "gentle", "glide", "gold", "green", "group",
  "handle", "harbor", "honest", "human", "image", "index", "inner", "input", "island", "keyboard",
  "kind", "launch", "layer", "learn", "level", "light", "linear", "listen", "local", "logic",
  "margin", "market", "memory", "method", "middle", "minute", "modern", "motion", "native", "never",
  "night", "number", "object", "orange", "origin", "output", "panel", "paper", "parent", "pattern",
  "phrase", "planet", "polish", "quiet", "random", "reader", "record", "reduce", "render", "result",
  "rhythm", "river", "sample", "screen", "script", "second", "select", "signal", "simple", "smooth",
  "source", "space", "steady", "stream", "string", "studio", "system", "target", "thread", "timing",
  "travel", "update", "useful", "value", "vector", "velvet", "window", "winter", "wonder", "yellow"
];

const state: AppState = {
  durationSeconds: 15,
  words: [],
  startedAt: null,
  completed: false,
  intervalId: null,
  history: []
};

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

const elements = {
  typingSurface: requiredElement<HTMLButtonElement>("#typingSurface"),
  typingInput: requiredElement<HTMLTextAreaElement>("#typingInput"),
  wordStream: requiredElement<HTMLSpanElement>("#wordStream"),
  caret: requiredElement<HTMLSpanElement>("#caret"),
  timer: requiredElement<HTMLSpanElement>("#timer"),
  liveWpm: requiredElement<HTMLSpanElement>("#liveWpm"),
  liveAccuracy: requiredElement<HTMLSpanElement>("#liveAccuracy"),
  resultWpm: requiredElement<HTMLSpanElement>("#resultWpm"),
  resultRaw: requiredElement<HTMLSpanElement>("#resultRaw"),
  resultAccuracy: requiredElement<HTMLSpanElement>("#resultAccuracy"),
  resultChars: requiredElement<HTMLSpanElement>("#resultChars"),
  sessionStatus: requiredElement<HTMLParagraphElement>("#sessionStatus"),
  timerProgress: requiredElement<HTMLSpanElement>("#timerProgress"),
  restartButton: requiredElement<HTMLButtonElement>("#restartButton"),
  clearHistoryButton: requiredElement<HTMLButtonElement>("#clearHistoryButton"),
  historyList: requiredElement<HTMLDivElement>("#historyList"),
  bestLine: requiredElement<HTMLDivElement>("#bestLine"),
  storagePath: requiredElement<HTMLParagraphElement>("#storagePath"),
  timeOptions: Array.from(document.querySelectorAll<HTMLButtonElement>(".time-option"))
};

function shuffleWords(count = 150): string[] {
  const words: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const word = wordBank[Math.floor(Math.random() * wordBank.length)] || wordBank[0];
    words.push(word);
  }

  return words;
}

function targetText(): string {
  return state.words.join(" ");
}

function typedText(): string {
  return elements.typingInput.value;
}

function elapsedSeconds(): number {
  if (!state.startedAt) {
    return 0;
  }

  return Math.min(state.durationSeconds, (Date.now() - state.startedAt) / 1000);
}

function remainingSeconds(): number {
  return Math.max(0, Math.ceil(state.durationSeconds - elapsedSeconds()));
}

function getTypedWordsForRender(): TypedWordsForRender {
  const raw = typedText();
  const parts = raw.split(" ");
  const activeIndex = parts.length - 1;

  return {
    parts,
    activeIndex: Math.max(0, activeIndex)
  };
}

function renderWordStream(): void {
  const { parts, activeIndex } = getTypedWordsForRender();
  const fragment = document.createDocumentFragment();

  state.words.forEach((word, wordIndex) => {
    const typedWord = parts[wordIndex] || "";
    const wordElement = document.createElement("span");
    wordElement.className = `word${wordIndex === activeIndex && !state.completed ? " is-active" : ""}`;

    for (let charIndex = 0; charIndex < word.length; charIndex += 1) {
      const charElement = document.createElement("span");
      const typedChar = typedWord[charIndex];
      charElement.className = "char pending";
      charElement.textContent = word[charIndex] || "";

      if (typedChar !== undefined) {
        charElement.className = typedChar === word[charIndex] ? "char correct" : "char incorrect";
      }

      wordElement.appendChild(charElement);
    }

    if (typedWord.length > word.length) {
      typedWord.slice(word.length).split("").forEach((extraChar: string) => {
        const extraElement = document.createElement("span");
        extraElement.className = "char extra";
        extraElement.textContent = extraChar;
        wordElement.appendChild(extraElement);
      });
    }

    fragment.appendChild(wordElement);
  });

  elements.wordStream.replaceChildren(fragment);
  requestAnimationFrame(() => {
    keepActiveWordVisible();
    positionCaret();
  });
}

function keepActiveWordVisible(): void {
  const activeWord = elements.wordStream.querySelector(".word.is-active");

  if (activeWord) {
    activeWord.scrollIntoView({ block: "center", inline: "nearest" });
  }
}

function positionCaret(): void {
  const activeWord = elements.wordStream.querySelector(".word.is-active");

  if (!activeWord) {
    elements.caret.style.opacity = "0";
    return;
  }

  const { parts, activeIndex } = getTypedWordsForRender();
  const activeTypedLength = parts[activeIndex]?.length || 0;
  const targetChars = activeWord.querySelectorAll<HTMLElement>(".char");
  const surfaceBox = elements.typingSurface.getBoundingClientRect();
  let targetBox: DOMRect;

  if (activeTypedLength > 0 && targetChars[Math.min(activeTypedLength - 1, targetChars.length - 1)]) {
    targetBox = targetChars[Math.min(activeTypedLength - 1, targetChars.length - 1)].getBoundingClientRect();
    elements.caret.style.left = `${targetBox.right - surfaceBox.left + 2}px`;
    elements.caret.style.top = `${targetBox.top - surfaceBox.top + 5}px`;
  } else {
    targetBox = activeWord.getBoundingClientRect();
    elements.caret.style.left = `${targetBox.left - surfaceBox.left}px`;
    elements.caret.style.top = `${targetBox.top - surfaceBox.top + 5}px`;
  }
}

function currentStats(): TypingStats {
  return calculateTypingStats({
    targetText: targetText(),
    typedText: typedText(),
    elapsedSeconds: Math.max(1, elapsedSeconds()),
    durationSeconds: state.durationSeconds
  });
}

function renderLiveStats(): void {
  const stats = currentStats();
  const remaining = remainingSeconds();
  const progress = state.startedAt ? Math.max(0, Math.min(100, (remaining / state.durationSeconds) * 100)) : 100;
  elements.timer.textContent = String(remainingSeconds());
  elements.timerProgress.style.width = `${progress}%`;
  elements.liveWpm.textContent = String(stats.wpm);
  elements.liveAccuracy.textContent = String(stats.accuracy);
}

function renderResults(stats: TypingStats): void {
  elements.resultWpm.textContent = String(stats.wpm);
  elements.resultRaw.textContent = String(stats.rawWpm);
  elements.resultAccuracy.textContent = `${stats.accuracy}%`;
  elements.resultChars.textContent = `${stats.correctChars}/${stats.incorrectChars}/${stats.extraChars}`;
}

async function finishTest(): Promise<void> {
  if (state.completed) {
    return;
  }

  state.completed = true;
  document.body.classList.remove("is-running");
  document.body.classList.add("is-complete");
  elements.sessionStatus.textContent = "saved";

  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
  }

  elements.typingInput.blur();
  elements.typingSurface.classList.remove("is-focused");

  const stats = currentStats();
  const result: TypingHistoryResult = {
    id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `run-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    mode: "time",
    durationSeconds: state.durationSeconds,
    ...stats
  };

  renderLiveStats();
  renderResults(result);
  await window.keyline.history.save(result);
  await loadHistory();
}

function startTimer(): void {
  if (state.startedAt || state.completed) {
    return;
  }

  state.startedAt = Date.now();
  document.body.classList.add("is-running");
  document.body.classList.remove("is-complete");
  elements.sessionStatus.textContent = "running";
  state.intervalId = window.setInterval(() => {
    renderLiveStats();

    if (remainingSeconds() <= 0) {
      finishTest();
    }
  }, 160);
}

function resetTest({ keepFocus = true }: ResetOptions = {}): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
  }

  state.words = shuffleWords();
  state.startedAt = null;
  state.completed = false;
  state.intervalId = null;
  document.body.classList.remove("is-running", "is-complete");
  elements.sessionStatus.textContent = "ready";
  elements.typingInput.value = "";
  elements.timer.textContent = String(state.durationSeconds);
  elements.timerProgress.style.width = "100%";
  elements.liveWpm.textContent = "0";
  elements.liveAccuracy.textContent = "100";
  elements.resultWpm.textContent = "--";
  elements.resultRaw.textContent = "--";
  elements.resultAccuracy.textContent = "--";
  elements.resultChars.textContent = "--";
  renderWordStream();

  if (keepFocus) {
    focusTypingInput();
  }
}

function focusTypingInput(): void {
  if (!state.completed) {
    elements.typingInput.focus();
    elements.typingSurface.classList.add("is-focused");
    positionCaret();
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderHistory(): void {
  elements.historyList.replaceChildren();
  elements.clearHistoryButton.disabled = state.history.length === 0;

  if (state.history.length === 0) {
    elements.bestLine.textContent = "No saved runs yet";
    const empty = document.createElement("div");
    empty.className = "empty-history";
    empty.textContent = "No local runs yet.";
    elements.historyList.appendChild(empty);
    return;
  }

  const best = state.history.reduce<TypingHistoryResult | null>((winner, run) => {
    if (!winner || run.wpm > winner.wpm) {
      return run;
    }

    return winner;
  }, null);

  if (best) {
    elements.bestLine.replaceChildren();
    const score = document.createElement("span");
    score.className = "best-score";
    score.textContent = `${best.wpm} wpm`;
    const detail = document.createElement("span");
    detail.textContent = `${best.accuracy}% accuracy - ${best.durationSeconds}s test`;
    elements.bestLine.append(score, detail);
  }

  state.history.slice(0, 30).forEach((run) => {
    const row = document.createElement("div");
    row.className = "history-row";

    const wpm = document.createElement("div");
    wpm.className = "history-wpm";
    wpm.textContent = String(run.wpm);

    const middle = document.createElement("div");
    const date = document.createElement("div");
    date.className = "history-date";
    date.textContent = formatDate(run.createdAt);
    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = `${run.durationSeconds}s - raw ${run.rawWpm} - ${run.correctChars}/${run.incorrectChars}/${run.extraChars}`;
    middle.append(date, meta);

    const accuracy = document.createElement("div");
    accuracy.className = "history-accuracy";
    accuracy.textContent = `${run.accuracy}%`;

    row.append(wpm, middle, accuracy);
    elements.historyList.appendChild(row);
  });
}

async function loadHistory(): Promise<void> {
  state.history = await window.keyline.history.list();
  renderHistory();
}

async function loadStoragePath(): Promise<void> {
  const storagePath = await window.keyline.history.path();
  elements.storagePath.textContent = storagePath;
}

elements.typingSurface.addEventListener("click", focusTypingInput);
elements.typingInput.addEventListener("focus", () => {
  elements.typingSurface.classList.add("is-focused");
  positionCaret();
});
elements.typingInput.addEventListener("blur", () => {
  if (!state.completed) {
    elements.typingSurface.classList.remove("is-focused");
  }
});
elements.typingInput.addEventListener("input", () => {
  if (state.completed) {
    return;
  }

  startTimer();
  renderWordStream();
  renderLiveStats();

  if (typedText().trim().split(/\s+/).length >= state.words.length) {
    finishTest();
  }
});
elements.typingInput.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === " " && (typedText().endsWith(" ") || typedText().length === 0)) {
    event.preventDefault();
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    resetTest();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    resetTest();
  }
});
elements.restartButton.addEventListener("click", () => resetTest());
elements.clearHistoryButton.addEventListener("click", async () => {
  await window.keyline.history.clear();
  await loadHistory();
});
elements.timeOptions.forEach((button) => {
  button.addEventListener("click", () => {
    state.durationSeconds = Number(button.dataset.duration);
    elements.timeOptions.forEach((option) => option.classList.toggle("is-active", option === button));
    resetTest();
  });
});

window.addEventListener("resize", positionCaret);

resetTest();
loadHistory();
loadStoragePath();
