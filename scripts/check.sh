#!/bin/sh
# ローカル CI: GitHub Actions の代わりにローカルで回す一連のチェック。
#   手動:     sh scripts/check.sh
#   push 前: .githooks/pre-push から自動実行(有効化は README 参照)
#
# 新しいチェックを足すときはこのファイルに追記する(CI の単一の入口)。
set -e
cd "$(CDPATH= cd "$(dirname "$0")/.." && pwd)"

# 採用した lint / format チェックをここに置く(作成時に候補から選んだものを埋める)。
# CI では整形を「適用」せず「差分があれば失敗」させる(--check / ci 系)。整形の適用は scripts/fmt.sh。
echo "[check] lint / format"
# 未導入: 外部依存ゼロ(package.json 無し)を保っているため。入れるときはここに配線する。

# テストは 3 層(test/spec=約束の台帳 / test/unit=実装都合 / test/invariants=横断不変条件)。
# 引数なしの node --test は test/ 配下を再帰的に拾うので、3 層すべてが走る。
echo "[check] tests"
node --test

# next-issue.py の選択規則は雛形が配る共通部分なので、プロジェクトのスタックに関わらず実行する。
echo "[check] tests (next-issue.py)"
python3 -m unittest discover -s test/spec -p "*_test.py"

echo "[check] すべて OK"
