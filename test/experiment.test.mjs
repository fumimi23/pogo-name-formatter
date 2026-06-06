import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// experiment.html / index.html から関数本体を抽出して実ソースを検証する。
function braceMatch(src, fromIndex) {
  const open = src.indexOf('{', fromIndex);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i + 1;
  }
  return -1;
}
function extractFn(src, name) {
  const start = src.indexOf('function ' + name);
  if (start === -1) return null;
  return src.slice(start, braceMatch(src, start));
}

const expHtml = readFileSync(new URL('../experiment.html', import.meta.url), 'utf8');
const idxHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// experiment.html の純粋関数群(clampIV〜formatName は連続して定義されている)をまとめて評価
const start = expHtml.indexOf('function clampIV');
const end = braceMatch(expHtml, expHtml.indexOf('function formatName', start));
const block = expHtml.slice(start, end);
const api = eval('const MIN=0,MAX=15;' + block + '\n;({clampIV,ivFromFill,colorfulness,fillFraction,formatName})');
const { clampIV, ivFromFill, colorfulness, fillFraction, formatName } = api;

// 比較用に index.html 側の formatName も取り出す
const idxFormatName = eval('(' + extractFn(idxHtml, 'formatName') + ')');

test('clampIV は 0〜15 に丸める', () => {
  assert.equal(clampIV(7), 7);
  assert.equal(clampIV(20), 15);
  assert.equal(clampIV(-5), 0);
});

test('ivFromFill: 塗り割合 → 個体値', () => {
  assert.equal(ivFromFill(0), 0);
  assert.equal(ivFromFill(1), 15);
  assert.equal(ivFromFill(10 / 15), 10);
  assert.equal(ivFromFill(13 / 15), 13);
  assert.equal(ivFromFill(0.5), 8); // round(7.5)
  assert.equal(ivFromFill(2), 15);  // クランプ
  assert.equal(ivFromFill(-1), 0);
});

test('colorfulness: 鮮やかさ = max-min', () => {
  assert.equal(colorfulness(250, 140, 60), 190); // オレンジ
  assert.equal(colorfulness(230, 90, 90), 140);  // 赤
  assert.equal(colorfulness(220, 220, 220), 0);  // 灰
  assert.equal(colorfulness(255, 255, 255), 0);  // 白
});

test('fillFraction: 色つきが続く右端を割合で返す', () => {
  assert.equal(fillFraction([0, 0, 0, 0], 50, 3), 0);
  assert.equal(fillFraction([200, 200, 200, 200, 200, 200], 50, 3), 1);
  assert.equal(fillFraction([200, 200, 200, 0, 0, 0], 50, 3), 0.5);
  // minRun=3 未満の短い色つきは無視
  assert.equal(fillFraction([200, 200, 0, 0, 0, 0], 50, 3), 0);
  // 末尾の孤立ノイズは無視され、連続3の最右(idx3)が採用される
  assert.equal(fillFraction([200, 200, 200, 200, 0, 200], 50, 3), 4 / 6);
  // minRun=1 なら単発でも拾う
  assert.equal(fillFraction([0, 0, 200, 0, 0, 0], 50, 1), 0.5);
});

test('experiment と index の formatName が全 4096 通りで一致', () => {
  for (let a = 0; a <= 15; a++) {
    for (let d = 0; d <= 15; d++) {
      for (let h = 0; h <= 15; h++) {
        assert.equal(formatName(a, d, h), idxFormatName(a, d, h), `${a}/${d}/${h}`);
      }
    }
  }
});

test('formatName の代表例', () => {
  assert.equal(formatName(15, 15, 15), '99.9 FFF');
  assert.equal(formatName(0, 0, 0), '0.0 000');
  assert.equal(formatName(4, 1, 9), '31.1 419');
});
