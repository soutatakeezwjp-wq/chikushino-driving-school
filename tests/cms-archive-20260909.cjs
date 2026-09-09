const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createServer } = require('node:http');
const root = path.resolve(__dirname, '..');

async function main() {
  // Only an in-memory database and fictional articles are used. No production requests.
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(root, 'migrations/0001_cms.sql'), 'utf8'));
  db.prepare("INSERT INTO cms_posts (slug, tag, title, body, published_at, image_url) VALUES (?, ?, ?, ?, ?, ?)")
    .run('legacy', 'お知らせ', '既存記事テスト', '既存の本文', '2020-01-01T00:00', 'images/brand-assets/cds-horizontal-logo.png');
  db.exec(fs.readFileSync(path.join(root, 'migrations/0003_post_archive.sql'), 'utf8'));
  const adapter = {
    prepare(sql) {
      let args = [];
      // D1 positional parameters and SQLite's anonymous parameters bind identically here.
      const statement = db.prepare(sql.replace(/\?\d+/g, '?'));
      return {
        bind(...values) { args = values; return this; },
        async first() { return statement.get(...args) || null; },
        async all() { return { results: statement.all(...args) }; },
        async run() {
          const result = statement.run(...args);
          return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
        }
      };
    }
  };
  const source = fs.readFileSync(path.join(root, '_worker.js'), 'utf8');
  const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const env = { CMS_DB: adapter, CMS_ADMIN_PASSWORD: 'local-fixture-only' };
  async function request(url, method = 'GET', data, admin = false) {
    return worker.fetch(new Request('http://localhost' + url, {
      method, headers: { ...(admin ? { authorization: 'Bearer local-fixture-only' } : {}), 'content-type': 'application/json' },
      ...(data ? { body: JSON.stringify(data) } : {})
    }), env);
  }
  const adminPath = '/api/cms/admin/posts';
  assert.equal((await request(adminPath)).status, 401);
  assert.equal((await (await request('/api/cms/posts/legacy')).json()).post.title, '既存記事テスト');
  const image = await (await request('/api/cms/admin/media', 'POST', {
    dataUrl: 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'images/brand-assets/cds-horizontal-logo.png')).toString('base64')
  }, true)).json();
  assert.equal((await request(image.url)).status, 404);
  assert.equal((await request(image.url, 'GET', null, true)).status, 200);
  const values = {
    title: 'アーカイブ検証', tag: 'お知らせ', summary: '保存される要約',
    body: JSON.stringify({ format: 'rich-v1', blocks: [
      { type: 'text', runs: [{ text: '架空の本文', bold: true }] },
      { type: 'image', url: image.url, alt: 'テスト画像' }
    ] }), imageUrl: image.url, isPublished: true, publishedAt: '2020-01-01T00:00'
  };
  const created = await (await request(adminPath, 'POST', values, true)).json();
  const itemPath = adminPath + '/' + created.id;
  const publicPath = '/api/cms/posts/' + created.slug;
  const original = db.prepare('SELECT * FROM cms_posts WHERE id = ?').get(created.id);
  assert.equal((await request(publicPath)).status, 200);
  assert.equal((await request(image.url)).status, 200);
  assert.equal((await request(itemPath, 'PATCH', { action: 'archive' })).status, 401);
  assert.equal((await request(itemPath, 'PATCH', { action: 'archive' }, true)).status, 200);
  assert.equal((await request(publicPath)).status, 404);
  assert.equal((await request(image.url)).status, 404);
  assert.equal((await request(image.url, 'GET', null, true)).headers.get('cache-control'), 'no-store');
  for (const query of ['', '?tag=' + encodeURIComponent('お知らせ')]) {
    const list = await (await request('/api/cms/posts' + query)).json();
    assert.ok(!list.posts.some(post => post.id === created.id));
  }
  const archive = (await (await request(adminPath, 'GET', null, true)).json()).posts.find(post => post.id === created.id);
  assert.ok(archive.archivedAt);
  assert.equal(archive.createdAt, original.created_at);
  assert.equal(archive.body, original.body);
  assert.equal(archive.imageUrl, image.url);
  // Even stale clients cannot implicitly republish an archived item via PUT.
  assert.equal((await request(itemPath, 'PUT', { ...values, title: '修正した記事' }, true)).status, 200);
  assert.equal((await request(publicPath)).status, 404);
  assert.equal((await request(itemPath, 'PATCH', { action: 'publish' }, true)).status, 200);
  assert.equal((await (await request(publicPath)).json()).post.title, '修正した記事');
  assert.equal((await request(image.url)).status, 200);
  assert.equal(db.prepare('SELECT created_at FROM cms_posts WHERE id = ?').get(created.id).created_at, original.created_at);
  // Old delete buttons must not physically destroy records.
  await request(itemPath, 'DELETE', null, true);
  assert.ok(db.prepare('SELECT archived_at FROM cms_posts WHERE id = ?').get(created.id).archived_at);
  assert.equal((await request(adminPath + '/99999', 'PUT', values, true)).status, 404);
  assert.equal((await request(adminPath + '?before=bad', 'GET', null, true)).status, 400);
  const insert = db.prepare("INSERT INTO cms_posts (slug, tag, title, body, published, published_at) VALUES (?, 'お知らせ', 'ページ検証', '本文', 0, '2020-01-01T00:00')");
  for (let i = 0; i < 205; i++) insert.run('page-' + i);
  const first = await (await request(adminPath, 'GET', null, true)).json();
  const second = await (await request(adminPath + '?before=' + first.nextCursor, 'GET', null, true)).json();
  assert.equal(new Set([...first.posts, ...second.posts].map(post => post.id)).size, 207);
  db.exec("DELETE FROM cms_posts WHERE slug LIKE 'page-%'");
  console.log('PASS: migration, authorization, create, archive, list/detail/media privacy, edit, republish, legacy delete preservation, pagination');

  if (process.argv.includes('--browser') || process.argv.includes('--serve')) {
    const server = createServer(async (req, res) => {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith('/api/cms/') || url.pathname.startsWith('/cms-media/')) {
          const response = await worker.fetch(new Request(url, {
            method: req.method, headers: req.headers,
            ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) })
          }), env);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          return res.end(Buffer.from(await response.arrayBuffer()));
        }
        const files = { '/admin/': 'admin/index.html', '/admin/admin.js': 'admin/admin.js', '/admin/admin.css': 'admin/admin.css', '/images/brand-assets/cds-horizontal-logo.png': 'images/brand-assets/cds-horizontal-logo.png' };
        const file = files[url.pathname];
        if (!file) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html');
        res.end(fs.readFileSync(path.join(root, file)));
      } catch (error) { res.writeHead(500); res.end('Local test failed'); console.error(error); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    if (process.argv.includes('--serve')) {
      console.log(`Local demo: http://127.0.0.1:${server.address().port}/admin/ (password: local-fixture-only)`);
      return;
    }
    const { chromium } = require('playwright');
    let browser;
    try {
      browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await page.addInitScript(() => sessionStorage.setItem('cdsCmsToken', 'local-fixture-only'));
      await page.goto(`http://127.0.0.1:${server.address().port}/admin/`);
      await page.locator('[data-view="posts"]').click();
      await page.locator('.list-row').filter({ hasText: '既存記事テスト' }).getByRole('button', { name: '確認・編集' }).click();
      await page.waitForFunction(() => {
        const img = document.querySelector('#image-preview img');
        return img.complete && img.naturalWidth > 0;
      }, null, { timeout: 10000 });
      await page.locator('label').filter({ has: page.locator('[name="postView"][value="archived"]') }).click();
      await page.getByRole('button', { name: '確認・編集' }).click();
      await page.locator('#body-editor img').waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('#post-form img')].every(img => img.complete && img.naturalWidth > 0), null, { timeout: 10000 });
      await page.locator('#post-form input[name="title"]').fill('ブラウザで修正');
      await page.locator('#post-form button[type="submit"]').click();
      await page.getByRole('heading', { name: /ブラウザで修正/ }).waitFor();
      assert.equal((await request(publicPath)).status, 404);
      await page.getByRole('button', { name: '再公開', exact: true }).click();
      await page.getByText('アーカイブされた記事はありません。', { exact: true }).waitFor();
      assert.equal((await (await request(publicPath)).json()).post.title, 'ブラウザで修正');
      await page.locator('label').filter({ has: page.locator('[name="postView"][value="active"]') }).click();
      const row = page.locator('.list-row').filter({ hasText: 'ブラウザで修正' });
      await row.getByRole('button', { name: 'アーカイブ', exact: true }).click();
      await row.waitFor({ state: 'detached' });
      await page.locator('label').filter({ has: page.locator('[name="postView"][value="archived"]') }).click();
      await page.getByRole('button', { name: '確認・編集' }).click();
      const screenshotDir = process.env.ARCHIVE_SCREENSHOTS || require('node:os').tmpdir();
      await page.screenshot({ path: path.join(screenshotDir, 'cms-archive-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(screenshotDir, 'cms-archive-mobile.png'), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      console.log('PASS: browser archive list, image preview, edit while private, republish, archive again, mobile overflow');
      console.log('Screenshots:', screenshotDir);
    } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
  }
  db.close();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
