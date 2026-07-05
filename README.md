# 筑紫野自動車学校 Webサイト

筑紫野自動車学校（C-D-S / CHIKUSHINO DRIVING SCHOOL）の静的Webサイト一式です。

## 構成

- `index.html`: トップページ
- `detail.html`: サブページ共通テンプレート
- `_worker.js`: Cloudflare Pages Functions用のAPI処理
- `images/`: サイト内で使用する画像・アイコン
- 各ディレクトリの `index.html`: 旧URL/個別ページ用の入口

## ローカル確認

```bash
python3 -m http.server 4177
```

起動後、ブラウザで `http://localhost:4177` を開きます。

## デプロイ

Cloudflare Pagesでは、このフォルダをそのまま公開ルートとしてデプロイします。

```bash
npx wrangler pages deploy . --project-name chikushino-driving-school
```

本番URL:

https://chikushino-driving-school.pages.dev/

## 補足

- ブログ/トピックスは `_worker.js` 経由で既存WordPressのRSSから取得します。
- 申込フォーム送信先はCloudflare Pagesの環境変数 `GAS_APPLICATION_WEBHOOK_URL` で設定します。
