import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// index.html から formatName 関数を抽出して、実際のソースを検証する。
// (単一ファイル構成を保つため、ロジックを別ファイルに切り出さずソースから取り出す)
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// 波括弧の対応を数えて関数本体を取り出す。インデントやネストした波括弧に依存しない。
// (formatName の本体は文字列/コメントに波括弧を含まないため、単純なカウントで安全)
function extractFunction(src, name) {
  const start = src.indexOf('function ' + name);
  if (start === -1) return null;
  const open = src.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

const source = extractFunction(html, 'formatName');
assert.ok(source, 'index.html から formatName を抽出できること (関数名や定義が変わっていないか確認)');
// 関数宣言を式にして評価する。formatName は DOM に依存しない純粋関数。
const formatName = eval('(' + source + ')');

test('仕様の代表例', () => {
  assert.equal(formatName(15, 15, 15), '99.9 FFF'); // カンストは文字数節約で 99.9
  assert.equal(formatName(0, 0, 0), '0.0 000');
  assert.equal(formatName(15, 14, 13), '93.3 FED');
  assert.equal(formatName(14, 15, 15), '97.8 EFF');
  assert.equal(formatName(10, 11, 12), '73.3 ABC');
});

test('全 4096 通りの構造的性質', () => {
  const FORMAT = /^(\d{1,3})\.(\d) ([0-9A-F]{3})$/;
  let perfectCount = 0;
  for (let a = 0; a <= 15; a++) {
    for (let d = 0; d <= 15; d++) {
      for (let h = 0; h <= 15; h++) {
        const name = formatName(a, d, h);
        const m = name.match(FORMAT);
        assert.ok(m, `形式 "整数.小数1桁 16進3桁" に一致: ${a}/${d}/${h} -> ${name}`);

        // 割合に 100.0 は出さない(カンストは 99.9 に置換)
        assert.notEqual(m[1] + '.' + m[2], '100.0', `100.0 は出力しない: ${a}/${d}/${h}`);

        // 99.9 が出るのはカンスト(15/15/15)のときだけ
        const isPerfect = a === 15 && d === 15 && h === 15;
        if (m[1] + '.' + m[2] === '99.9') {
          perfectCount++;
          assert.ok(isPerfect, `99.9 はカンスト時のみ: ${a}/${d}/${h}`);
        } else {
          assert.ok(!isPerfect, `カンストは 99.9 になる: ${a}/${d}/${h}`);
        }

        // 16進3桁が元の攻撃/防御/HPに戻ること
        assert.deepEqual(
          [...m[3]].map(c => parseInt(c, 16)),
          [a, d, h],
          `16進が攻撃→防御→HPの順で正しい: ${a}/${d}/${h} -> ${name}`,
        );
      }
    }
  }
  assert.equal(perfectCount, 1, '99.9 はちょうど1通り(15/15/15)だけ');
});
