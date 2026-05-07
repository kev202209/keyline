const STANDARD_WORD_LENGTH = 5;

interface TypingStatsInput {
  targetText: string;
  typedText: string;
  elapsedSeconds: number;
  durationSeconds?: number;
}

interface TypingComparison {
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  correctWords: number;
}

interface TypingStats extends TypingComparison {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  wordCount: number;
  typedChars: number;
}

function normalizeWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function compareTypedWords(targetWords: string[], typedWords: string[]): TypingComparison {
  let correctChars = 0;
  let incorrectChars = 0;
  let extraChars = 0;
  let correctWords = 0;

  targetWords.forEach((targetWord, index) => {
    const typedWord = typedWords[index] || "";
    let wordIsCorrect = typedWord.length === targetWord.length;

    for (let charIndex = 0; charIndex < Math.max(targetWord.length, typedWord.length); charIndex += 1) {
      const typedChar = typedWord[charIndex];
      const targetChar = targetWord[charIndex];

      if (typedChar === undefined) {
        wordIsCorrect = false;
      } else if (targetChar === undefined) {
        extraChars += 1;
        wordIsCorrect = false;
      } else if (typedChar === targetChar) {
        correctChars += 1;
      } else {
        incorrectChars += 1;
        wordIsCorrect = false;
      }
    }

    if (wordIsCorrect) {
      correctWords += 1;
    }
  });

  return {
    correctChars,
    incorrectChars,
    extraChars,
    correctWords
  };
}

function calculateTypingStats({ targetText, typedText, elapsedSeconds, durationSeconds }: TypingStatsInput): TypingStats {
  const safeElapsedSeconds = Math.max(1, Number(elapsedSeconds) || Number(durationSeconds) || 1);
  const targetWords = normalizeWords(targetText);
  const typedWords = normalizeWords(typedText);
  const attemptedWords = typedWords.slice(0, targetWords.length);
  const comparison = compareTypedWords(targetWords, attemptedWords);
  const typedChars = attemptedWords.join(" ").length;
  const totalErrors = comparison.incorrectChars + comparison.extraChars;
  const totalEvaluatedChars = comparison.correctChars + totalErrors;
  const minutes = safeElapsedSeconds / 60;
  const wpm = comparison.correctChars / STANDARD_WORD_LENGTH / minutes;
  const rawWpm = typedChars / STANDARD_WORD_LENGTH / minutes;
  const accuracy = totalEvaluatedChars === 0 ? 100 : (comparison.correctChars / totalEvaluatedChars) * 100;

  return {
    wpm: Math.max(0, Math.round(wpm)),
    rawWpm: Math.max(0, Math.round(rawWpm)),
    accuracy: Math.max(0, Math.min(100, Math.round(accuracy))),
    correctChars: comparison.correctChars,
    incorrectChars: comparison.incorrectChars,
    extraChars: comparison.extraChars,
    correctWords: comparison.correctWords,
    wordCount: attemptedWords.length,
    typedChars
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    calculateTypingStats,
    compareTypedWords,
    normalizeWords
  };
}
