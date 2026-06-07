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
  '\n;({clampIV,ivFromCounts,colorfulness,classifyColumn,growSpan,median,pstdev,pickBarTriple})');
const { clampIV, ivFromCounts, colorfulness, classifyColumn, growSpan, median, pstdev, pickBarTriple } = api;

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

test('median / pstdev', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(pstdev([5, 5, 5]), 0);
});

test('pickBarTriple: xl・幅が一致し等間隔な3帯を選ぶ', () => {
  // 鑑定バー3本(xl~143,w~417,等間隔) + ノイズ(xl・幅バラバラ)
  const bands = [
    { y0: 1674, y1: 1717, xl: 38, w: 280 },
    { y0: 1701, y1: 1736, xl: 723, w: 280 },
    { y0: 1718, y1: 1834, xl: 25, w: 307 },
    { y0: 2007, y1: 2038, xl: 143, w: 417 },
    { y0: 2123, y1: 2154, xl: 143, w: 417 },
    { y0: 2238, y1: 2269, xl: 143, w: 416 },
  ];
  const tri = pickBarTriple(bands);
  assert.ok(tri && tri.length === 3);
  assert.deepEqual(tri.map(t => t.y0), [2007, 2123, 2238]); // 上から 攻撃/防御/HP
  assert.ok(tri.every(t => Math.abs(t.xl - 143) <= 1));
});

test('pickBarTriple: xlがばらけたノイズだけなら null', () => {
  const bands = [
    { y0: 1686, y1: 1751, xl: 37, w: 289 },
    { y0: 1748, y1: 1863, xl: 23, w: 307 },
    { y0: 1867, y1: 1882, xl: 51, w: 263 },
  ];
  assert.equal(pickBarTriple(bands), null);
});
