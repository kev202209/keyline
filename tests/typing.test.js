const assert = require("node:assert/strict");
const { calculateTypingStats, normalizeWords } = require("../src/shared/typing");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("normalizes text into words", () => {
  assert.deepEqual(normalizeWords("  alpha   beta\ngamma  "), ["alpha", "beta", "gamma"]);
});

test("calculates perfect typing stats", () => {
  const stats = calculateTypingStats({
    targetText: "alpha beta",
    typedText: "alpha beta",
    elapsedSeconds: 30
  });

  assert.equal(stats.accuracy, 100);
  assert.equal(stats.correctChars, 9);
  assert.equal(stats.incorrectChars, 0);
  assert.equal(stats.extraChars, 0);
  assert.equal(stats.correctWords, 2);
  assert.equal(stats.wpm, 4);
});

test("counts incorrect and extra characters", () => {
  const stats = calculateTypingStats({
    targetText: "alpha beta",
    typedText: "alpxa betas",
    elapsedSeconds: 60
  });

  assert.equal(stats.correctChars, 8);
  assert.equal(stats.incorrectChars, 1);
  assert.equal(stats.extraChars, 1);
  assert.equal(stats.accuracy, 80);
});
