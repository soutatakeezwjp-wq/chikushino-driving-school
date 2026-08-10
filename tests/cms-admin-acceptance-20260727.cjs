#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");

const baseUrl = String(process.env.CMS_TEST_BASE_URL || "http://127.0.0.1:8794").replace(/\/+$/, "");
const password = String(process.env.CMS_TEST_PASSWORD || "");
const keepRecords = process.env.CMS_TEST_KEEP_RECORDS === "1";

if (!password) {
  throw new Error("CMS_TEST_PASSWORD is required.");
}

const testId = `[受入試験-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}]`;
const authorization = { authorization: `Bearer ${password}` };
let eventId = 0;
let postId = 0;
let postSlug = "";
let mediaId = "";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.arrayBuffer();
  return { response, payload };
}

async function adminJson(path, method = "GET", body) {
  return request(path, {
    method,
    headers: {
      ...authorization,
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function cleanup() {
  if (keepRecords) return;
  if (eventId) {
    await adminJson(`/api/cms/admin/events/${eventId}`, "DELETE").catch(() => {});
  }
  if (postId) {
    await adminJson(`/api/cms/admin/posts/${postId}`, "DELETE").catch(() => {});
  }
}

async function run() {
  const unauthorized = await request("/api/cms/admin/session");
  assert.equal(unauthorized.response.status, 401, "管理APIが未認証アクセスを拒否する");

  const session = await adminJson("/api/cms/admin/session");
  assert.equal(session.response.status, 200, "管理パスワードで認証できる");
  assert.equal(session.payload.ok, true);

  const eventCreated = await adminJson("/api/cms/admin/events", "POST", {
    eventDate: "2026-07-27",
    category: "検定",
    title: `${testId} 卒業検定`,
    details: "受付は9:45までです"
  });
  assert.equal(eventCreated.response.status, 201, "予定を追加できる");
  eventId = Number(eventCreated.payload.id);
  assert.ok(eventId > 0);

  const eventUpdated = await adminJson(`/api/cms/admin/events/${eventId}`, "PUT", {
    eventDate: "2026-07-27",
    category: "教習",
    title: `${testId} 教習予定（更新後）`,
    details: "受付は10:00までです"
  });
  assert.equal(eventUpdated.response.status, 200, "予定を編集できる");

  const publicEvents = await request(`/api/cms/events?today=2026-07-27&acceptance=${encodeURIComponent(testId)}`);
  assert.equal(publicEvents.response.status, 200);
  assert.ok(
    publicEvents.payload.schedule.month.some((item) => item.title.includes("更新後")),
    "編集後の予定が公開APIへ反映される"
  );

  const postCreated = await adminJson("/api/cms/admin/posts", "POST", {
    tag: "重要",
    title: `${testId} CMS操作確認`,
    summary: "クライアント向け更新画面の受入試験です。",
    body: "これは受入試験用の記事です。\n\n試験終了後に削除します。",
    publishedAt: "2026-07-27T09:00",
    isPublished: false,
    imageUrl: ""
  });
  assert.equal(postCreated.response.status, 201, "記事を下書き保存できる");
  postId = Number(postCreated.payload.id);
  postSlug = String(postCreated.payload.slug || "");
  assert.ok(postId > 0 && postSlug);

  const publicDraft = await request(`/api/cms/posts?limit=100&acceptance=${encodeURIComponent(testId)}-draft`);
  assert.ok(!publicDraft.payload.posts.some((post) => post.slug === postSlug), "下書きは公開APIへ出ない");

  const futurePost = {
    tag: "重要",
    title: `${testId} CMS操作確認`,
    summary: "クライアント向け更新画面の受入試験です。",
    body: "これは予約公開の受入試験用記事です。",
    publishedAt: "2099-12-31T23:59",
    isPublished: true,
    imageUrl: ""
  };
  const scheduled = await adminJson(`/api/cms/admin/posts/${postId}`, "PUT", futurePost);
  assert.equal(scheduled.response.status, 200, "未来日時の記事を予約できる");

  const publicScheduled = await request(`/api/cms/posts?limit=100&acceptance=${encodeURIComponent(testId)}-scheduled`);
  assert.ok(!publicScheduled.payload.posts.some((post) => post.slug === postSlug), "公開時刻前の記事は公開APIへ出ない");

  const pixelPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const mediaCreated = await adminJson("/api/cms/admin/media", "POST", {
    dataUrl: pixelPng,
    alt: "受入試験用画像"
  });
  assert.equal(mediaCreated.response.status, 201, "記事画像を追加できる");
  const mediaUrl = String(mediaCreated.payload.url || "");
  assert.match(mediaUrl, /^\/cms-media\/[a-z0-9-]+$/);
  mediaId = mediaUrl.split("/").pop();

  const richBody = JSON.stringify({
    format: "rich-v1",
    blocks: [
      {
        type: "text",
        runs: [
          { text: "これは", bold: false },
          { text: "公開記事", bold: true },
          { text: "の受入試験です。", bold: false }
        ]
      },
      { type: "image", url: mediaUrl, alt: "本文内の受入試験用画像" },
      { type: "text", runs: [{ text: "画像の後にも文章を表示します。", bold: false }] }
    ]
  });
  const published = await adminJson(`/api/cms/admin/posts/${postId}`, "PUT", {
    ...futurePost,
    body: richBody,
    publishedAt: "2026-07-26T09:00",
    imageUrl: mediaUrl
  });
  assert.equal(published.response.status, 200, "予約記事を公開状態へ編集できる");

  const publicPosts = await request(`/api/cms/posts?limit=100&acceptance=${encodeURIComponent(testId)}-published`);
  const publicPost = publicPosts.payload.posts.find((post) => post.slug === postSlug);
  assert.ok(publicPost, "公開時刻を過ぎた記事が一覧APIへ出る");
  assert.equal(publicPost.date, "2026.07.26");
  assert.equal(publicPost.publishedDate, "2026.07.26");
  assert.equal(publicPost.imageUrl, mediaUrl);

  const singlePost = await request(`/api/cms/posts/${encodeURIComponent(postSlug)}?acceptance=${encodeURIComponent(testId)}`);
  assert.equal(singlePost.response.status, 200, "公開記事の詳細APIを取得できる");
  assert.equal(singlePost.payload.post.publishedDate, "2026.07.26", "記事詳細の日付が表示用形式で返る");
  assert.deepEqual(
    JSON.parse(singlePost.payload.post.body),
    JSON.parse(richBody),
    "太字・本文画像・画像後の文章が順序を保って保存される"
  );

  const mediaResponse = await request(mediaUrl);
  assert.equal(mediaResponse.response.status, 200, "アップロード画像を表示できる");
  assert.equal(mediaResponse.response.headers.get("content-type"), "image/png");

  const unpublished = await adminJson(`/api/cms/admin/posts/${postId}`, "PUT", {
    ...futurePost,
    publishedAt: "2026-07-26T09:00",
    isPublished: false,
    imageUrl: mediaUrl
  });
  assert.equal(unpublished.response.status, 200, "公開記事を非公開へ戻せる");

  const publicAfterUnpublish = await request(`/api/cms/posts?limit=100&acceptance=${encodeURIComponent(testId)}-unpublished`);
  assert.ok(!publicAfterUnpublish.payload.posts.some((post) => post.slug === postSlug), "非公開へ戻した記事は公開APIから消える");

  await adminJson(`/api/cms/admin/events/${eventId}`, "DELETE");
  eventId = 0;
  const deletedSlug = postSlug;
  const deletedPost = await adminJson(`/api/cms/admin/posts/${postId}`, "DELETE");
  assert.equal(deletedPost.response.status, 200, "記事を削除できる");

  const publicAfterDelete = await request(
    `/api/cms/posts?limit=100&acceptance=${encodeURIComponent(testId)}-deleted`
  );
  assert.ok(
    !publicAfterDelete.payload.posts.some((post) => post.slug === deletedSlug),
    "削除した記事は公開一覧APIへ残らない"
  );

  const deletedSinglePost = await request(
    `/api/cms/posts/${encodeURIComponent(deletedSlug)}?acceptance=${encodeURIComponent(testId)}-deleted`
  );
  assert.equal(deletedSinglePost.response.status, 404, "削除した記事の詳細APIは404を返す");
  postId = 0;

  process.stdout.write(JSON.stringify({
    ok: true,
    testId,
    ...(keepRecords ? { eventId, postId, postSlug } : {}),
    mediaId,
    note: "cms_media is intentionally retained; remove this exact media ID during acceptance cleanup."
  }));
}

run()
  .catch(async (error) => {
    await cleanup();
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
