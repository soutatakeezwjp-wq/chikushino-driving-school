// ⚠️ お知らせフィードの取得先。
// 現在は現行WPサイト（chikushi-ds.com）のRSSを参照しているため、
// 8月のDNS切替（chikushi-ds.com→新サイト）を行うとこのURLは自壊する。
// 【切替前に必須】次のどちらかを実施すること：
//   案A: 旧WPをサブドメイン（例 https://old.chikushi-ds.com/feed/）に残し、
//        Cloudflare Pagesの環境変数 WORDPRESS_FEED_URL にそのURLを設定する
//   案B: microCMS等へ載せ替え、このWorkerの取得処理を差し替える
// 環境変数 WORDPRESS_FEED_URL が設定されていればそちらが優先される。
const WORDPRESS_FEED_URL = "https://chikushi-ds.com/feed/";
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;
const FEED_TIMEOUT_MS = 8000;
// 保存後の学校通知・自動返信まで含めると15秒前後かかるため、
// 成功済みの受付をブラウザ側でタイムアウト扱いにしない。
const GAS_TIMEOUT_MS = 35000;
const PRODUCTION_API_ORIGIN = "https://chikushino-driving-school.pages.dev";
const MAX_APPLICATION_BODY_BYTES = 64 * 1024;

const APPLICATION_FIELD_LIMITS = {
  purpose: 40,
  vehicle: 80,
  name: 100,
  kana: 100,
  gender: 20,
  birthdate: 20,
  phone: 30,
  email: 254,
  postalCode: 12,
  address: 300,
  occupation: 80,
  organization: 160,
  introducer: 100,
  desiredEntryDate: 80,
  priceCourse: 60,
  currentLicense: 80,
  currentLicenseLabel: 240,
  userType: 20,
  pricePlan: 30,
  lessonPlan: 80,
  paymentMethod: 80,
  materialDelivery: 80,
  howKnown: 120,
  admissionMotives: 300,
  preferredContactMethod: 80,
  preferredContactTime: 120,
  busRequest: 300,
  notes: 2000,
  privacyConsent: 20,
  utmSource: 160,
  utmMedium: 160,
  utmCampaign: 200,
  utmContent: 200,
  formVersion: 40
};

const ALLOWED_PURPOSES = new Set([
  "仮入校申し込み",
  "資料請求",
  "お問い合わせ",
  "料金について相談",
  "友人・知人紹介"
]);

const ALLOWED_VEHICLES = new Set([
  "普通自動車（AT）",
  "普通自動車（MT）",
  "準中型車",
  "大型自動二輪車（MT）",
  "普通自動二輪車（AT）",
  "普通自動二輪車（MT）",
  "小型自動二輪車（AT）",
  "小型自動二輪車（MT）",
  "限定解除",
  "ペーパードライバー",
  "高齢者講習",
  "原付講習",
  "その他・相談"
]);

function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(xml, tagName) {
  const escaped = tagName.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function pickImage(content = "") {
  const match = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return match ? decodeEntities(match[1]) : "";
}

function normalizeTitle(title, fallbackDate) {
  const cleanTitle = stripTags(title);
  if (cleanTitle) return cleanTitle;
  return fallbackDate ? `筑紫野自動車学校からのお知らせ（${fallbackDate}）` : "筑紫野自動車学校からのお知らせ";
}

function normalizeCategory(category) {
  const cleanCategory = stripTags(category);
  return cleanCategory && cleanCategory !== "未分類" ? cleanCategory : "お知らせ";
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function parseFeed(xml, limit) {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  const posts = itemMatches.map((match) => {
    const item = match[0];
    const content = pickTag(item, "content:encoded");
    const pubDate = pickTag(item, "pubDate");
    const formattedDate = formatDate(pubDate);
    const categories = [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)]
      .map((categoryMatch) => normalizeCategory(categoryMatch[1]))
      .filter(Boolean);
    const excerpt = stripTags(pickTag(item, "description") || content).slice(0, 90);
    const link = pickTag(item, "link");

    return {
      id: pickTag(item, "guid") || link,
      title: normalizeTitle(pickTag(item, "title"), formattedDate),
      link,
      date: formattedDate,
      publishedAt: pubDate,
      category: categories[0] || "お知らせ",
      categories,
      excerpt,
      image: pickImage(content),
      source: "wordpress-rss"
    };
  });
  posts.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return posts.slice(0, limit);
}

function jsonResponse(payload, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl
    }
  });
}

class ApplicationRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "ApplicationRequestError";
    this.code = code;
    this.status = status;
  }
}

function applicationResponse(payload, status = 200) {
  return jsonResponse(payload, status, "no-store");
}

function cleanText(value, maxLength, preserveLines = false) {
  const normalized = String(value ?? "").normalize("NFKC").replace(/\u0000/g, "").trim();
  const cleaned = preserveLines ? normalized : normalized.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ");
  return cleaned.slice(0, maxLength);
}

function cleanStringList(value, maxItems = 10, maxLength = 80) {
  const source = Array.isArray(value) ? value : [value];
  const items = source.reduce((result, item) => {
    if (Array.isArray(item)) return result.concat(item);
    return result.concat(String(item || "").split(","));
  }, []);
  return items
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function cleanAliasedStringList(payload, keys, maxItems = 10, maxLength = 80) {
  for (const key of keys) {
    const values = cleanStringList(payload[key], maxItems, maxLength);
    if (values.length) return values;
  }
  return [];
}

function hasApplicationValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim());
}

function cleanUrl(value) {
  const text = cleanText(value, 600);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 600) : "";
  } catch (error) {
    return "";
  }
}

function normalizePurpose(value) {
  const raw = cleanText(value, APPLICATION_FIELD_LIMITS.purpose);
  const aliases = {
    application: "仮入校申し込み",
    apply: "仮入校申し込み",
    materials: "資料請求",
    document: "資料請求",
    inquiry: "お問い合わせ",
    price: "料金について相談",
    referral: "友人・知人紹介"
  };
  return aliases[raw] || raw;
}

function normalizeVehicle(value) {
  const raw = cleanText(value, APPLICATION_FIELD_LIMITS.vehicle);
  const aliases = {
    ordinary_at: "普通自動車（AT）",
    ordinary_mt: "普通自動車（MT）",
    semi_medium: "準中型車",
    motorcycle_large_mt: "大型自動二輪車（MT）",
    motorcycle_mt: "普通自動二輪車（MT）",
    motorcycle_at: "普通自動二輪車（AT）",
    motorcycle_small_mt: "小型自動二輪車（MT）",
    motorcycle_small_at: "小型自動二輪車（AT）",
    "普通自動車(AT)": "普通自動車（AT）",
    "普通自動車(MT)": "普通自動車（MT）",
    "大型自動二輪車(MT)": "大型自動二輪車（MT）",
    "普通自動二輪車(AT)": "普通自動二輪車（AT）",
    "普通自動二輪車(MT)": "普通自動二輪車（MT）",
    "小型自動二輪車(AT)": "小型自動二輪車（AT）",
    "小型自動二輪車(MT)": "小型自動二輪車（MT）"
  };
  return aliases[raw] || raw;
}

function acceptedPrivacyConsent(value) {
  if (value === true) return true;
  return ["true", "1", "on", "同意済み", "同意する"].includes(String(value || "").toLowerCase());
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && Object.prototype.toString.call(value) === "[object Object]") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(digest);
}

async function hmacSha256Hex(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToHex(signature);
}

async function readApplicationJson(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_APPLICATION_BODY_BYTES) {
    throw new ApplicationRequestError("PAYLOAD_TOO_LARGE", "送信内容が大きすぎます。", 413);
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_APPLICATION_BODY_BYTES) {
    throw new ApplicationRequestError("PAYLOAD_TOO_LARGE", "送信内容が大きすぎます。", 413);
  }
  try {
    const payload = JSON.parse(raw || "{}");
    if (!payload || Array.isArray(payload) || typeof payload !== "object") throw new Error("not an object");
    return payload;
  } catch (error) {
    throw new ApplicationRequestError("INVALID_JSON", "送信データの形式が正しくありません。", 400);
  }
}

function normalizeApplicationPayload(payload, request) {
  const requestUrl = new URL(request.url);
  const referer = request.headers.get("referer") || "";
  const desiredVehicles = cleanAliasedStringList(
    payload,
    ["desiredVehicles", "desiredVehicle", "vehicle", "priceCourse"],
    12,
    APPLICATION_FIELD_LIMITS.vehicle
  ).map(normalizeVehicle).filter((value, index, array) => value && array.indexOf(value) === index);
  const currentLicenses = cleanAliasedStringList(payload, ["currentLicenses", "currentLicense"], 30, 80);
  const optionPlans = cleanAliasedStringList(payload, ["optionPlans", "options"], 10, 80);
  const howKnown = cleanAliasedStringList(payload, ["howKnown"], 20, APPLICATION_FIELD_LIMITS.howKnown);
  const admissionMotives = cleanAliasedStringList(
    payload,
    ["admissionMotives", "admissionMotive"],
    20,
    120
  );
  const familyName = payload.familyName || payload.lastName || "";
  const givenName = payload.givenName || payload.firstName || "";
  const familyKana = payload.familyNameKana || payload.lastNameKana || "";
  const givenKana = payload.givenNameKana || payload.firstNameKana || "";
  const normalized = {};

  Object.keys(APPLICATION_FIELD_LIMITS).forEach((field) => {
    const preserveLines = field === "notes" || field === "admissionMotives" || field === "busRequest";
    normalized[field] = cleanText(payload[field], APPLICATION_FIELD_LIMITS[field], preserveLines);
  });

  normalized.purpose = normalizePurpose(payload.purpose);
  normalized.desiredVehicles = desiredVehicles;
  normalized.vehicle = normalizeVehicle(cleanStringList(payload.vehicle, 1, APPLICATION_FIELD_LIMITS.vehicle)[0] || desiredVehicles[0] || payload.priceCourse);
  if (!normalized.desiredVehicles.length && normalized.vehicle) normalized.desiredVehicles = [normalized.vehicle];
  normalized.name = cleanText(payload.name || `${familyName} ${givenName}`, APPLICATION_FIELD_LIMITS.name);
  normalized.kana = cleanText(payload.kana || `${familyKana} ${givenKana}`, APPLICATION_FIELD_LIMITS.kana);
  const rawCurrentLicense = cleanStringList(payload.currentLicense, 1, APPLICATION_FIELD_LIMITS.currentLicense)[0];
  const licenseKeys = new Set(["none", "moped", "motorcycle", "at_car", "mt_car", "car", "small_at", "small_mt", "motorcycle_at", "motorcycle_mt"]);
  const inferredLicenseLabel = currentLicenses.some((value) => licenseKeys.has(value)) ? "" : currentLicenses.join("、");
  normalized.currentLicense = cleanText(rawCurrentLicense || currentLicenses[0], APPLICATION_FIELD_LIMITS.currentLicense);
  normalized.currentLicenseLabel = cleanText(payload.currentLicenseLabel || inferredLicenseLabel, APPLICATION_FIELD_LIMITS.currentLicenseLabel);
  normalized.currentLicenses = currentLicenses;
  normalized.optionPlans = optionPlans;
  normalized.howKnown = howKnown;
  normalized.admissionMotives = admissionMotives;
  normalized.privacyConsent = acceptedPrivacyConsent(payload.privacyConsent) ? "同意済み" : "";
  normalized.applicationId = `CDS-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  normalized.submittedAt = new Date().toISOString();
  normalized.landingPage = cleanUrl(payload.landingPage || referer);
  normalized.referrer = cleanUrl(payload.referrer || referer);
  normalized.userAgent = cleanText(request.headers.get("user-agent"), 500);
  normalized.source = requestUrl.hostname;
  normalized.formVersion = normalized.formVersion || "3-step-v1";
  return normalized;
}

function validateApplicationPayload(payload) {
  const requiredFields = ["purpose", "name", "phone", "email", "privacyConsent"];
  if (payload.purpose === "仮入校申し込み") {
    requiredFields.push("gender", "birthdate", "postalCode", "address", "occupation", "lessonPlan", "paymentMethod");
  }
  const missing = requiredFields.filter((field) => !hasApplicationValue(payload[field]));
  if (!hasApplicationValue(payload.desiredVehicles) && !hasApplicationValue(payload.vehicle)) missing.push("desiredVehicles");
  if (
    payload.purpose === "仮入校申し込み"
    && !hasApplicationValue(payload.currentLicenses)
    && !hasApplicationValue(payload.currentLicense)
  ) {
    missing.push("currentLicenses");
  }
  if (missing.length) {
    throw new ApplicationRequestError("VALIDATION_REQUIRED", `必須項目が不足しています: ${missing.join(", ")}`, 400);
  }
  if (!ALLOWED_PURPOSES.has(payload.purpose)) {
    throw new ApplicationRequestError("VALIDATION_PURPOSE", "お問い合わせ種別を選び直してください。", 400);
  }
  const requestedVehicles = payload.desiredVehicles.length ? payload.desiredVehicles : [payload.vehicle];
  if (requestedVehicles.some((vehicle) => !ALLOWED_VEHICLES.has(vehicle))) {
    throw new ApplicationRequestError("VALIDATION_VEHICLE", "希望する免許・講習を選び直してください。", 400);
  }
  if (payload.kana && !/^[ァ-ヶヴー・\s]+$/.test(payload.kana)) {
    throw new ApplicationRequestError("VALIDATION_KANA", "フリガナは全角カタカナで入力してください。", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new ApplicationRequestError("VALIDATION_EMAIL", "メールアドレスの形式を確認してください。", 400);
  }
  const phoneDigits = payload.phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    throw new ApplicationRequestError("VALIDATION_PHONE", "電話番号の形式を確認してください。", 400);
  }
  if (payload.postalCode && !/^\d{3}-?\d{4}$/.test(payload.postalCode)) {
    throw new ApplicationRequestError("VALIDATION_POSTAL_CODE", "郵便番号の形式を確認してください。", 400);
  }
  if (payload.birthdate) {
    const birthdate = new Date(`${payload.birthdate}T00:00:00+09:00`);
    if (Number.isNaN(birthdate.getTime()) || birthdate.getTime() >= Date.now()) {
      throw new ApplicationRequestError("VALIDATION_BIRTHDATE", "生年月日を確認してください。", 400);
    }
  }
}

async function createSubmissionKey(payload) {
  const keyFields = {
    purpose: payload.purpose,
    vehicle: payload.vehicle,
    name: payload.name,
    kana: payload.kana,
    phone: payload.phone.replace(/\D/g, ""),
    email: payload.email.toLowerCase(),
    desiredEntryDate: payload.desiredEntryDate,
    desiredVehicles: payload.desiredVehicles,
    priceCourse: payload.priceCourse,
    currentLicense: payload.currentLicense,
    currentLicenses: payload.currentLicenses,
    userType: payload.userType,
    pricePlan: payload.pricePlan,
    lessonPlan: payload.lessonPlan,
    optionPlans: payload.optionPlans,
    materialDelivery: payload.materialDelivery,
    howKnown: payload.howKnown,
    admissionMotives: payload.admissionMotives
  };
  return sha256Hex(canonicalStringify(keyFields));
}

async function createProxyEnvelope(payload, secret) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const message = `${timestamp}.${nonce}.${canonicalStringify(payload)}`;
  return {
    timestamp,
    nonce,
    signature: await hmacSha256Hex(message, secret)
  };
}

async function sendDeferredNotifications(payload, applicationId, env) {
  const notificationPayload = { ...payload, applicationId, notificationOnly: true };
  const proxy = await createProxyEnvelope(notificationPayload, env.GAS_SHARED_SECRET);
  const body = JSON.stringify({ ...notificationPayload, _proxy: proxy });

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(env.GAS_APPLICATION_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body
      }, GAS_TIMEOUT_MS);
      const result = await response.json();
      if (response.ok && result.ok !== false) return;
      throw new Error(result.error || `Notification response ${response.status}`);
    } catch (error) {
      if (attempt === 2) {
        console.error("Deferred application notification failed", applicationId, error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
}

function applicationConfiguration(env) {
  const gasConfigured = Boolean(env.GAS_APPLICATION_WEBHOOK_URL);
  const gasSignatureConfigured = Boolean(env.GAS_SHARED_SECRET);
  return {
    configured: gasConfigured && gasSignatureConfigured,
    gasConfigured,
    gasSignatureConfigured
  };
}

function shouldProxyPreviewApi(request, env) {
  const hostname = new URL(request.url).hostname;
  return hostname.endsWith(".chikushino-driving-school.pages.dev")
    && hostname !== "chikushino-driving-school.pages.dev"
    && !env.GAS_APPLICATION_WEBHOOK_URL;
}

function proxyPreviewApi(request) {
  const target = new URL(request.url);
  target.protocol = "https:";
  target.host = new URL(PRODUCTION_API_ORIGIN).host;
  return fetch(new Request(target.toString(), request));
}

async function handleApplication(request, env, context) {
  const configuration = applicationConfiguration(env);

  if (request.method === "GET") {
    return applicationResponse({
      ok: true,
      service: "application",
      ...configuration,
      message: configuration.configured ? "受付フォームのサーバー設定は完了しています。" : "受付フォームに未設定のサーバー項目があります。"
    });
  }

  if (request.method !== "POST") {
    return applicationResponse({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405);
  }

  let payload;
  try {
    payload = await readApplicationJson(request);

    // 人間には表示されない欄。ボットへ判定理由を返さず、GASにも転送しない。
    if (String(payload.honeypot || "").trim()) {
      return applicationResponse({ ok: true, ignored: true, applicationId: `CDS-SPAM-${Date.now()}` });
    }

    if (!env.GAS_APPLICATION_WEBHOOK_URL) {
      throw new ApplicationRequestError("GAS_WEBHOOK_NOT_CONFIGURED", "受付フォームの保存先が未設定です。", 503);
    }
    if (!env.GAS_SHARED_SECRET) {
      throw new ApplicationRequestError("GAS_SHARED_SECRET_NOT_CONFIGURED", "受付フォームの署名キーが未設定です。", 503);
    }

    const normalized = normalizeApplicationPayload(payload, request);
    validateApplicationPayload(normalized);
    normalized.submissionKey = await createSubmissionKey(normalized);
    const deferNotifications = Boolean(context && typeof context.waitUntil === "function");
    const savePayload = { ...normalized, deferNotifications };
    const proxy = await createProxyEnvelope(savePayload, env.GAS_SHARED_SECRET);
    const body = JSON.stringify({ ...savePayload, _proxy: proxy });

    let response;
    try {
      response = await fetchWithTimeout(env.GAS_APPLICATION_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body
      }, GAS_TIMEOUT_MS);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new ApplicationRequestError(
          "GAS_TIMEOUT",
          "受付処理に時間がかかっています。連続して送信せず、1分ほど待って受付メールをご確認ください。",
          504
        );
      }
      throw new ApplicationRequestError(
        "GAS_UNAVAILABLE",
        "受付先へ接続できませんでした。通信状況を確認して再度お試しください。",
        503
      );
    }
    const responseText = await response.text();
    let gasPayload;
    try {
      gasPayload = JSON.parse(responseText);
    } catch (error) {
      throw new ApplicationRequestError("GAS_INVALID_RESPONSE", "受付先から正しい応答を受け取れませんでした。", 502);
    }

    const gasStatus = Number(gasPayload.status || response.status || 500);
    if (!response.ok || gasPayload.ok === false) {
      const publicStatus = gasStatus >= 400 && gasStatus < 600 ? gasStatus : 502;
      throw new ApplicationRequestError(
        gasPayload.code || "GAS_APPLICATION_ERROR",
        gasPayload.error || "受付先でエラーが発生しました。",
        publicStatus
      );
    }

    const applicationId = gasPayload.applicationId || normalized.applicationId;
    if (deferNotifications && gasPayload.notificationsDeferred) {
      context.waitUntil(sendDeferredNotifications(normalized, applicationId, env));
    }

    return applicationResponse({
      ok: true,
      configured: true,
      duplicate: Boolean(gasPayload.duplicate),
      applicationId,
      quote: gasPayload.quote || null,
      materialStatus: gasPayload.materialStatus || "確認待ち",
      warnings: Array.isArray(gasPayload.warnings) ? gasPayload.warnings : []
    });
  } catch (error) {
    const known = error instanceof ApplicationRequestError;
    return applicationResponse({
      ok: false,
      configured: configuration.configured,
      code: known ? error.code : "APPLICATION_PROXY_ERROR",
      error: known ? error.message : "受付処理でエラーが発生しました。時間をおいて再度お試しください。"
    }, known ? error.status : 502);
  }
}

async function handlePublicSchedule(env) {
  const fallback = () => jsonResponse({
    ok: true,
    stale: true,
    warning: "最新の日程を取得できなかったため、受付での確認をご案内しています。",
    schedule: {
      updatedAt: new Date().toISOString(),
      today: [],
      week: [],
      month: []
    }
  }, 200, "public, max-age=15, stale-while-revalidate=300");
  const gasEndpoint = env.PUBLIC_SCHEDULE_GAS_URL || env.GAS_APPLICATION_WEBHOOK_URL;
  if (!gasEndpoint) {
    return fallback();
  }
  try {
    const url = new URL(gasEndpoint);
    url.searchParams.set("action", "public-schedule");
    const response = await fetchWithTimeout(url.toString(), {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 60, cacheEverything: true }
    }, GAS_TIMEOUT_MS);
    const payload = await response.json();
    if (!response.ok || payload.ok === false || !payload.schedule) {
      return fallback();
    }
    return jsonResponse({ ok: true, schedule: payload.schedule }, 200, "public, max-age=60, stale-while-revalidate=300");
  } catch (error) {
    return fallback();
  }
}

async function handleWordPressPosts(request, env) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Math.min(Math.max(requestedLimit || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const feedUrl = (env && env.WORDPRESS_FEED_URL) || WORDPRESS_FEED_URL;

  try {
    const response = await fetchWithTimeout(feedUrl, {
      headers: {
        "user-agent": "chikushino-driving-school-site/1.0"
      },
      cf: { cacheTtl: 300, cacheEverything: true }
    }, FEED_TIMEOUT_MS);

    if (!response.ok) {
      return jsonResponse({
        ok: false,
        source: feedUrl,
        error: `WordPress feed returned ${response.status}`
      }, 502);
    }

    const xml = await response.text();
    const posts = parseFeed(xml, limit);
    return jsonResponse({
      ok: true,
      source: feedUrl,
      fetchedAt: new Date().toISOString(),
      count: posts.length,
      posts
    }, 200, "public, max-age=300");
  } catch (error) {
    return jsonResponse({
      ok: false,
      source: feedUrl,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if ((url.pathname === "/api/application" || url.pathname === "/api/public-schedule") && shouldProxyPreviewApi(request, env)) {
      return proxyPreviewApi(request);
    }
    if (url.pathname === "/api/wordpress-posts") {
      return handleWordPressPosts(request, env);
    }
    if (url.pathname === "/api/application") {
      return handleApplication(request, env, context);
    }
    if (url.pathname === "/api/public-schedule") {
      return handlePublicSchedule(env);
    }
    const response = await env.ASSETS.fetch(request);
    // pages.dev（プレビュー用ドメイン）は検索エンジンに載せない。
    // 本番ドメイン（chikushi-ds.com）に切り替えた後の重複インデックスを防ぐ。
    if (url.hostname.endsWith(".pages.dev")) {
      const noindexed = new Response(response.body, response);
      noindexed.headers.set("X-Robots-Tag", "noindex");
      return noindexed;
    }
    return response;
  }
};
