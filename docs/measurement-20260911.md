# 月次計測の実装準備

2026-09-11。サイトコードとオフライン検証を完了。学校の既存GA4/ストリーム・所有者へのアクセスが確認できないため、測定IDは空欄、enabled=falseで保存。外部サービスへの新規登録や本番の計測開始はしていない。Cloudflareの再配備も未実施。

## 内容

- measurement-config.jsに測定ID・有効化・拡張計測OFF確認・広告コード許可リストを集約。
- measurement.jsは本番ドメインの既知公開ページだけを対象とし、ユーザーが解析を許可してからGoogleタグを読む。拒否・未選択では解析通信なし、後から拒否するとタグを停止して再読込。広告関連同意・広告パーソナライズ・Googleシグナルは無効。
- トップ/詳細/記事/通う理由に共通タグ。詳細の旧page_view処理を取り除き、固定されたページ名/URLで1表示1回。URLはpageと資料請求分類だけ。記事slug・動的タイトル・生URL・メール/氏名/住所/電話/受付ID/自由記述を解析に渡さない。
- 通常申込・資料請求・紹介の成功箇所へ計測を追加。response.okとresult.okがtrue、重複なし・受付IDありの場合だけ各completeイベント。IDは一時メモリの重複判定だけで使用。3秒の暫定表示・失敗・重複応答は0。計測例外で受付成功を取り消さない。
- form_startは最初の入力1回、phone_clickは学校番号の押下だけ。管理/レビュー/プレビュー/未知ページとスタッフ指定を除外。
- UTMは許可されたsource/mediumと登録済みcampaign/contentだけを同じタブで30分保持。内部遷移で維持、新しいUTMは全体置換。不明/不足は空欄。個別コード未登録のためcampaign/contentはまだ送らない。旧転送URLでのUTM保持は未保証で、広告着地先は正規ページに限定する。
- フォームのLP/参照元も必要部分に絞り、GAS74の既存utm_logsへ保存。Worker/GAS/料金/PDF/通知/アーカイブ/ルーティングは変更しない。
- 計測の説明と許可/拒否の操作を追加。モバイル下部ナビゲーションを避けた配置を確認。

## 検証

`tests/measurement-20260911.cjs`はヘッドレスChromeで全通信を架空応答に置換し、45グループを検証。拒否/未選択/撤回/無効設定、対象外URL、個人情報を含むURLの除去、UTM保持/置換/期限切れ、成功1回/失敗0/重複0、3秒経過時0、実際のPC申込/スマホ資料請求/スマホ紹介の送信UIを確認。実Google/GAS/メールへの通信はない。

`tests/measurement-storage-20260911.cjs`は実Workerの正規化→GAS74のnormalizeSubmissionLists→appendUtmLogをメモリ上で実行し、既存UTM列に保持されることを確認。紹介フォーム回帰、既存料金/文言/フォーム、CMSアーカイブAPI回帰もPASS。

```sh
NODE_PATH=/path/to/bundled/node_modules node tests/measurement-20260911.cjs
GAS_SOURCE='../deploy-backups/20260911-quote/Code.after.gs' node tests/measurement-storage-20260911.cjs
```

本番GA4の受信、外部コネクタのデータ取得、実申込と通知を伴うE2Eは未実施。公開HTMLに既存Cloudflareビーコンを確認したが、学校ドメインのAnalytics画面はNo Access。これをGA4未設定と混同せず、既存タグを変更しない。

## 再開に必要なもの

学校所有のGA4/ストリームへの権限、日本時間・ドメイン・測定ID、拡張計測OFF、キーイベントの設定を確認してからconfigを有効化。Search Consoleは既存プロパティへの権限または学校所有での登録が必要。Looker Studioは学校管理先・接続権限が必要。学校のアカウントが不明なまま個人所有の新しいプロパティを作らない。

月次PDF/HTMLひな形、個人情報なしの受付集計、接続手順、広告改善案は公開フォルダ外の親「運用管理」に保存。本番配備時は既存安全スクリプトと_routes.jsonを維持し、Cloudflareだけを使用する。
