import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// index.html のスクショ解析まわりの純粋関数を抽出して検証する。
function braceMatch(src, fromIndex) {
  const open = src.indexOf('{', fromIndex);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i + 1;
  }
  return -1;
}

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// clampIV〜formatName は連続定義。定数を補って評価する。
const start = html.indexOf('function clampIV');
const end = braceMatch(html, html.indexOf('function formatName', start));
const block = html.slice(start, end);
const consts = 'const MIN=0,MAX=15,TRACK_LO=200,TRACK_HI=245,NEUTRAL=30;';
const api = eval(consts + block +
  '\n;({clampIV,ivFromCounts,colorfulness,classifyColumn,growSpan})');
const { clampIV, ivFromCounts, colorfulness, classifyColumn, growSpan } = api;

test('clampIV は 0〜15 に丸める', () => {
  assert.equal(clampIV(7), 7);
  assert.equal(clampIV(20), 15);
  assert.equal(clampIV(-5), 0);
});

test('ivFromCounts: 色つき/(色つき+灰色) → 個体値', () => {
  assert.equal(ivFromCounts(15, 0), 15);
  assert.equal(ivFromCounts(0, 15), 0);
  assert.equal(ivFromCounts(0, 0), 0);
  assert.equal(ivFromCounts(4, 11), 4);
  assert.equal(ivFromCounts(1, 14), 1);
  assert.equal(ivFromCounts(10, 5), 10);
  assert.equal(ivFromCounts(13, 2), 13);
});

test('colorfulness: 鮮やかさ = max-min', () => {
  assert.equal(colorfulness(243, 166, 76), 167); // オレンジ(実測)
  assert.equal(colorfulness(230, 90, 90), 140);  // 赤
  assert.equal(colorfulness(227, 227, 227), 0);  // 灰トラック(実測)
  assert.equal(colorfulness(255, 255, 255), 0);  // 白
});

test('classifyColumn: fill / grey / bg の分類', () => {
  assert.equal(classifyColumn(167, 162, 60), 'fill');
  assert.equal(classifyColumn(0, 227, 60), 'grey');   // 空きトラック(実測)
  assert.equal(classifyColumn(0, 255, 60), 'bg');     // 白い区切り
  assert.equal(classifyColumn(10, 210, 60), 'grey');
  assert.equal(classifyColumn(80, 162, 60), 'fill');
  assert.equal(classifyColumn(80, 162, 150), 'bg');   // 感度150では塗り扱いされず明るさも灰域外
});

test('growSpan: gapTol までの隙間を跨いで広げる', () => {
  const T = true, F = false;
  assert.deepEqual(growSpan([T, T, F, T, T], 0, 1), { lo: 0, hi: 4 });
  assert.deepEqual(growSpan([T, T, F, T, T], 0, 0), { lo: 0, hi: 1 });
  assert.deepEqual(growSpan([F, T, T, F, F, T], 1, 1), { lo: 1, hi: 2 });
  assert.deepEqual(growSpan([T, T, T, T, T], 2, 0), { lo: 0, hi: 4 });
  // start が false(外したタップ相当)なら 1 点だけ返る → detect 側で検出失敗として弾く
  assert.deepEqual(growSpan([F, F, F, F], 1, 1), { lo: 1, hi: 1 });
});
