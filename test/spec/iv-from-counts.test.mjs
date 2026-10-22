import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// index.html から ivFromCounts と、それが呼ぶ clampIV を抽出して検証する。
function braceMatch(src, fromIndex) {
  const open = src.indexOf('{', fromIndex);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i + 1;
  }
  return -1;
}

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

// clampIV〜ivFromCounts は連続定義。定数を補って評価する。
const start = html.indexOf('function clampIV');
const fn = html.indexOf('function ivFromCounts', start);
assert.ok(start !== -1 && fn !== -1, 'index.html から clampIV / ivFromCounts を抽出できること (関数名や定義順が変わっていないか確認)');
const { ivFromCounts } = eval('const MIN=0,MAX=15;' + html.slice(start, braceMatch(html, fn)) + '\n;({ivFromCounts})');

// #19 / #23 README の式: 個体値 = 15 × 色つき ÷ (色つき + 灰色)
test('ivFromCounts: 色つき/(色つき+灰色) → 個体値', () => {
  assert.equal(ivFromCounts(15, 0), 15);
  assert.equal(ivFromCounts(0, 15), 0);
  assert.equal(ivFromCounts(0, 0), 0);
  assert.equal(ivFromCounts(4, 11), 4);
  assert.equal(ivFromCounts(1, 14), 1);
  assert.equal(ivFromCounts(10, 5), 10);
  assert.equal(ivFromCounts(13, 2), 13);
});
