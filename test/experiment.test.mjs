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

// experiment.html の純粋関数群(clampIV〜formatName は連続定義)と定数をまとめて評価
const start = expHtml.indexOf('function clampIV');
const end = braceMatch(expHtml, expHtml.indexOf('function formatName', start));
const block = expHtml.slice(start, end);
const consts = 'const MIN=0,MAX=15,TRACK_LO=200,TRACK_HI=245,NEUTRAL=30;';
const api = eval(consts + block +
  '\n;({clampIV,ivFromCounts,colorfulness,classifyColumn,growSpan,formatName})');
const { clampIV, ivFromCounts, colorfulness, classifyColumn, growSpan, formatName } = api;

// 比較用に index.html 側の formatName も取り出す
const idxFormatName = eval('(' + extractFn(idxHtml, 'formatName') + ')');

test('clampIV は 0〜15 に丸める', () => {
  assert.equal(clampIV(7), 7);
  assert.equal(clampIV(20), 15);
  assert.equal(clampIV(-5), 0);
});

test('ivFromCounts: 色つき/(色つき+灰色) → 個体値', () => {
  assert.equal(ivFromCounts(15, 0), 15);
  assert.equal(ivFromCounts(0, 15), 0);
  assert.equal(ivFromCounts(0, 0), 0);    // 何も無ければ0
  assert.equal(ivFromCounts(4, 11), 4);   // 4/15
  assert.equal(ivFromCounts(1, 14), 1);   // 1/15
  assert.equal(ivFromCounts(10, 5), 10);  // 10/15
  assert.equal(ivFromCounts(13, 2), 13);  // 13/15
});

test('colorfulness: 鮮やかさ = max-min', () => {
  assert.equal(colorfulness(243, 166, 76), 167); // オレンジ(実測)
  assert.equal(colorfulness(230, 90, 90), 140);  // 赤
  assert.equal(colorfulness(227, 227, 227), 0);  // 灰トラック(実測)
  assert.equal(colorfulness(255, 255, 255), 0);  // 白
});

test('classifyColumn: fill / grey / bg の分類', () => {
  assert.equal(classifyColumn(167, 162, 60), 'fill'); // 塗り
  assert.equal(classifyColumn(0, 227, 60), 'grey');   // 空きトラック(実測)
  assert.equal(classifyColumn(0, 255, 60), 'bg');     // 白い区切り
  assert.equal(classifyColumn(10, 210, 60), 'grey');
  assert.equal(classifyColumn(80, 162, 60), 'fill');  // しきい値60なら塗り
  assert.equal(classifyColumn(80, 162, 150), 'bg');   // 感度150では塗り扱いされず、明るさも灰域外
});

test('growSpan: gapTol までの隙間を跨いで広げる', () => {
  const T = true, F = false;
  // 連続領域。隙間1つは gapTol=1 で跨ぐ
  assert.deepEqual(growSpan([T, T, F, T, T], 0, 1), { lo: 0, hi: 4 });
  // gapTol=0 なら隙間で止まる
  assert.deepEqual(growSpan([T, T, F, T, T], 0, 0), { lo: 0, hi: 1 });
  // 末尾の長い隙間の先は拾わない(gapTol=1, 隙間2)
  assert.deepEqual(growSpan([F, T, T, F, F, T], 1, 1), { lo: 1, hi: 2 });
  // 左右両方向に広がる
  assert.deepEqual(growSpan([T, T, T, T, T], 2, 0), { lo: 0, hi: 4 });
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
