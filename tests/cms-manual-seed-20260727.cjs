#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const baseUrl = String(process.env.CMS_TEST_BASE_URL || "https://chikushino-driving-school.pages.dev").replace(/\/+$/, "");
const password = String(process.env.CMS_TEST_PASSWORD || "");
const imagePath = process.env.CMS_TEST_IMAGE || path.resolve(__dirname, "../images/official-20260718/school-building.jpg");

if (!password) throw new Error("CMS_TEST_PASSWORD is required.");

const authorization = {
  authorization: `Bearer ${password}`,
  "content-type": "application/json"
};

async function admin(pathname, method, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: authorization,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(`${method} ${pathname}: HTTP ${response.status} ${payload.error || ""}`);
  }
  return payload;
}

async function createPost(input) {
  return admin("/api/cms/admin/posts", "POST", input);
}

(async () => {
  const event = await admin("/api/cms/admin/events", "POST", {
    eventDate: "2026-07-27",
    category: "検定",
    title: "卒業検定（操作例）",
    details: "受付は9:45までです"
  });

  const imageData = fs.readFileSync(imagePath).toString("base64");
  const media = await admin("/api/cms/admin/media", "POST", {
    dataUrl: `data:image/jpeg;base64,${imageData}`,
    alt: "交通安全に関するお知らせの操作例"
  });

  const published = await createPost({
    tag: "重要",
    title: "夏季休校日のお知らせ（操作例）",
    summary: "8月13日から15日までの休校日についてご案内します。",
    body: "夏季休校日についてお知らせします。\n\n8月13日から8月15日まで休校となります。\n\nご来校の際は、日程をご確認ください。",
    publishedAt: "2026-07-27T00:00",
    isPublished: true,
    imageUrl: media.url
  });

  const draft = await createPost({
    tag: "お知らせ",
    title: "準備中のお知らせ（操作例）",
    summary: "公開前の下書き記事です。",
    body: "内容を確認してから公開します。",
    publishedAt: "2026-07-27T09:30",
    isPublished: false,
    imageUrl: ""
  });

  const scheduled = await createPost({
    tag: "お知らせ",
    title: "予約公開のお知らせ（操作例）",
    summary: "未来の日時に自動で公開される記事です。",
    body: "指定した公開日時になると自動で公開されます。",
    publishedAt: "2099-12-31T09:00",
    isPublished: true,
    imageUrl: ""
  });

  process.stdout.write(JSON.stringify({
    ok: true,
    eventId: Number(event.id),
    postIds: [Number(published.id), Number(draft.id), Number(scheduled.id)],
    publishedSlug: published.slug,
    mediaId: String(media.url).split("/").pop()
  }));
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
