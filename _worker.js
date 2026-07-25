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
    requiredFields.push("gender", "birthdate", "postalCode", "address", "occupation", "lessonPlan", "paymentMethod", "desiredEntryDate");
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
  if (payload.desiredEntryDate) {
    const entryDate = new Date(`${payload.desiredEntryDate}T00:00:00+09:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.desiredEntryDate) || Number.isNaN(entryDate.getTime())) {
      throw new ApplicationRequestError("VALIDATION_ENTRY_DATE", "入校希望日を確認してください。", 400);
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

const CMS_JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};
const CMS_MAX_IMAGE_BYTES = 900 * 1024;

function cmsResponse(payload, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CMS_JSON_HEADERS,
      "cache-control": cacheControl
    }
  });
}

function requireCmsDatabase(env) {
  if (!env.CMS_DB) {
    throw new Error("CMS_DB_NOT_CONFIGURED");
  }
  return env.CMS_DB;
}

function isCmsAdmin(request, env) {
  const expected = String(env.CMS_ADMIN_PASSWORD || "");
  if (!expected) return false;
  const authorization = request.headers.get("authorization") || "";
  return authorization === `Bearer ${expected}`;
}

function cmsUnauthorized() {
  return cmsResponse({ ok: false, error: "パスワードが正しくありません。" }, 401);
}

function cleanCmsText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function createCmsSlug(title = "") {
  const base = String(title)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "news"}-${Date.now().toString(36)}`;
}

function formatCmsDate(dateValue = "") {
  const value = String(dateValue);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : value;
}

function cmsPostToPublic(row) {
  return {
    id: row.id,
    slug: row.slug,
    tag: row.tag,
    category: row.tag,
    title: row.title,
    summary: row.summary || "",
    body: row.body || "",
    image: row.image_url || "",
    imageUrl: row.image_url || "",
    published: Boolean(row.published),
    publishedAt: row.published_at,
    date: formatCmsDate(row.published_at),
    link: `article.html?slug=${encodeURIComponent(row.slug)}`
  };
}

async function readCmsJson(request, maxBytes = 1024 * 1024) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  return JSON.parse(text || "{}");
}

async function handleCmsEvents(request, env, admin = false) {
  const db = requireCmsDatabase(env);
  const url = new URL(request.url);
  if (!admin && request.method === "GET") {
    const anchorValue = url.searchParams.get("today") || new Date().toISOString().slice(0, 10);
    const anchor = /^\d{4}-\d{2}-\d{2}$/.test(anchorValue) ? anchorValue : new Date().toISOString().slice(0, 10);
    const base = new Date(`${anchor}T12:00:00+09:00`);
    const day = base.getDay() || 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monthStart = `${anchor.slice(0, 7)}-01`;
    const monthEndDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
    const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const rows = await db.prepare(
      "SELECT id, event_date, title, details, category FROM cms_events WHERE event_date BETWEEN ?1 AND ?2 ORDER BY event_date ASC, id ASC"
    ).bind(monthStart, monthEnd).all();
    const events = (rows.results || []).map((row) => ({
      id: row.id,
      date: row.event_date,
      title: row.title,
      note: row.details || "",
      category: row.category || "教習"
    }));
    return cmsResponse({
      ok: true,
      generatedAt: new Date().toISOString(),
      schedule: {
        updatedAt: new Date().toISOString(),
        today: events.filter((event) => event.date === anchor),
        week: events.filter((event) => event.date >= iso(monday) && event.date <= iso(sunday)),
        month: events
      }
    }, 200, "public, max-age=30, stale-while-revalidate=120");
  }

  if (!isCmsAdmin(request, env)) return cmsUnauthorized();
  if (request.method === "GET") {
    const rows = await db.prepare(
      "SELECT id, event_date, title, details, category, created_at, updated_at FROM cms_events ORDER BY event_date DESC, id DESC LIMIT 200"
    ).all();
    const events = (rows.results || []).map((row) => ({
      id: row.id,
      eventDate: row.event_date,
      title: row.title,
      details: row.details || "",
      category: row.category || "教習",
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    return cmsResponse({ ok: true, events });
  }

  if (request.method === "POST") {
    const input = await readCmsJson(request);
    const eventDate = cleanCmsText(input.eventDate, 10);
    const title = cleanCmsText(input.title, 120);
    const details = cleanCmsText(input.details, 500);
    const category = cleanCmsText(input.category || "教習", 30);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !title) {
      return cmsResponse({ ok: false, error: "日付とタイトルを入力してください。" }, 400);
    }
    const result = await db.prepare(
      "INSERT INTO cms_events (event_date, title, details, category) VALUES (?1, ?2, ?3, ?4)"
    ).bind(eventDate, title, details, category).run();
    return cmsResponse({ ok: true, id: result.meta.last_row_id }, 201);
  }

  const id = Number(url.pathname.split("/").pop());
  if (!Number.isInteger(id) || id <= 0) return cmsResponse({ ok: false, error: "予定が見つかりません。" }, 404);
  if (request.method === "PUT") {
    const input = await readCmsJson(request);
    const eventDate = cleanCmsText(input.eventDate, 10);
    const title = cleanCmsText(input.title, 120);
    const details = cleanCmsText(input.details, 500);
    const category = cleanCmsText(input.category || "教習", 30);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !title) {
      return cmsResponse({ ok: false, error: "日付とタイトルを入力してください。" }, 400);
    }
    await db.prepare(
      "UPDATE cms_events SET event_date = ?1, title = ?2, details = ?3, category = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5"
    ).bind(eventDate, title, details, category, id).run();
    return cmsResponse({ ok: true });
  }
  if (request.method === "DELETE") {
    await db.prepare("DELETE FROM cms_events WHERE id = ?1").bind(id).run();
    return cmsResponse({ ok: true });
  }
  return cmsResponse({ ok: false, error: "Method not allowed" }, 405);
}

async function handleCmsPosts(request, env, admin = false) {
  const db = requireCmsDatabase(env);
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const last = decodeURIComponent(parts[parts.length - 1] || "");
  const isSinglePublic = !admin && parts.length > 3;

  if (!admin && request.method === "GET") {
    if (isSinglePublic) {
      const row = await db.prepare(
        "SELECT * FROM cms_posts WHERE slug = ?1 AND published = 1 LIMIT 1"
      ).bind(last).first();
      if (!row) return cmsResponse({ ok: false, error: "記事が見つかりません。" }, 404);
      return cmsResponse({ ok: true, post: cmsPostToPublic(row) }, 200, "public, max-age=60");
    }
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 100);
    const tag = cleanCmsText(url.searchParams.get("tag"), 20);
    const statement = tag
      ? db.prepare("SELECT * FROM cms_posts WHERE published = 1 AND tag = ?1 ORDER BY published_at DESC, id DESC LIMIT ?2").bind(tag, limit)
      : db.prepare("SELECT * FROM cms_posts WHERE published = 1 ORDER BY published_at DESC, id DESC LIMIT ?1").bind(limit);
    const rows = await statement.all();
    return cmsResponse({ ok: true, posts: (rows.results || []).map(cmsPostToPublic) }, 200, "public, max-age=30, stale-while-revalidate=120");
  }

  if (!isCmsAdmin(request, env)) return cmsUnauthorized();
  if (request.method === "GET") {
    const rows = await db.prepare("SELECT * FROM cms_posts ORDER BY published_at DESC, id DESC LIMIT 200").all();
    const posts = (rows.results || []).map((row) => ({
      ...cmsPostToPublic(row),
      isPublished: Boolean(row.published)
    }));
    return cmsResponse({ ok: true, posts });
  }

  if (request.method === "POST") {
    const input = await readCmsJson(request);
    const title = cleanCmsText(input.title, 160);
    const body = cleanCmsText(input.body, 12000);
    const tag = input.tag === "重要" ? "重要" : "お知らせ";
    const summary = cleanCmsText(input.summary, 240);
    const imageUrl = cleanCmsText(input.imageUrl, 500);
    const publishedAt = cleanCmsText(input.publishedAt, 25) || new Date().toISOString();
    const published = input.isPublished === false || input.isPublished === "false" ? 0 : 1;
    if (!title || !body) return cmsResponse({ ok: false, error: "タイトルと本文を入力してください。" }, 400);
    const slug = createCmsSlug(title);
    const result = await db.prepare(
      "INSERT INTO cms_posts (slug, tag, title, summary, body, image_url, published, published_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
    ).bind(slug, tag, title, summary, body, imageUrl, published, publishedAt).run();
    return cmsResponse({ ok: true, id: result.meta.last_row_id, slug }, 201);
  }

  const id = Number(last);
  if (!Number.isInteger(id) || id <= 0) return cmsResponse({ ok: false, error: "記事が見つかりません。" }, 404);
  if (request.method === "PUT") {
    const input = await readCmsJson(request);
    const title = cleanCmsText(input.title, 160);
    const body = cleanCmsText(input.body, 12000);
    const tag = input.tag === "重要" ? "重要" : "お知らせ";
    const summary = cleanCmsText(input.summary, 240);
    const imageUrl = cleanCmsText(input.imageUrl, 500);
    const publishedAt = cleanCmsText(input.publishedAt, 25) || new Date().toISOString();
    const published = input.isPublished === false || input.isPublished === "false" ? 0 : 1;
    if (!title || !body) return cmsResponse({ ok: false, error: "タイトルと本文を入力してください。" }, 400);
    await db.prepare(
      "UPDATE cms_posts SET tag = ?1, title = ?2, summary = ?3, body = ?4, image_url = ?5, published = ?6, published_at = ?7, updated_at = CURRENT_TIMESTAMP WHERE id = ?8"
    ).bind(tag, title, summary, body, imageUrl, published, publishedAt, id).run();
    return cmsResponse({ ok: true });
  }
  if (request.method === "DELETE") {
    await db.prepare("DELETE FROM cms_posts WHERE id = ?1").bind(id).run();
    return cmsResponse({ ok: true });
  }
  return cmsResponse({ ok: false, error: "Method not allowed" }, 405);
}

async function handleCmsMedia(request, env) {
  const db = requireCmsDatabase(env);
  const url = new URL(request.url);
  if (url.pathname.startsWith("/cms-media/") && request.method === "GET") {
    const id = cleanCmsText(url.pathname.split("/").pop(), 80);
    const row = await db.prepare("SELECT content_type, data FROM cms_media WHERE id = ?1").bind(id).first();
    if (!row) return new Response("Not found", { status: 404 });
    const binary = Uint8Array.from(atob(row.data), (char) => char.charCodeAt(0));
    return new Response(binary, {
      headers: {
        "content-type": row.content_type,
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  }
  if (!isCmsAdmin(request, env)) return cmsUnauthorized();
  if (request.method !== "POST") return cmsResponse({ ok: false, error: "Method not allowed" }, 405);
  const input = await readCmsJson(request, 2 * 1024 * 1024);
  const match = String(input.dataUrl || "").match(/^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return cmsResponse({ ok: false, error: "JPEG、PNG、WebP画像を選んでください。" }, 400);
  const estimatedBytes = Math.floor(match[2].length * 0.75);
  if (estimatedBytes > CMS_MAX_IMAGE_BYTES) return cmsResponse({ ok: false, error: "画像サイズを小さくしてください。" }, 413);
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare("INSERT INTO cms_media (id, content_type, data) VALUES (?1, ?2, ?3)")
    .bind(id, match[1], match[2]).run();
  return cmsResponse({ ok: true, url: `/cms-media/${id}` }, 201);
}

async function handleCmsRequest(request, env) {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/cms/admin/session") {
      if (request.method === "POST") {
        const input = await readCmsJson(request, 4096);
        const expected = String(env.CMS_ADMIN_PASSWORD || "");
        return expected && String(input.password || "") === expected
          ? cmsResponse({ ok: true })
          : cmsUnauthorized();
      }
      return isCmsAdmin(request, env)
        ? cmsResponse({ ok: true })
        : cmsUnauthorized();
    }
    if (url.pathname === "/api/cms/events") return handleCmsEvents(request, env, false);
    if (url.pathname === "/api/cms/posts" || url.pathname.startsWith("/api/cms/posts/")) return handleCmsPosts(request, env, false);
    if (url.pathname.startsWith("/cms-media/") || url.pathname === "/api/cms/admin/media") return handleCmsMedia(request, env);
    if (url.pathname === "/api/cms/admin/events" || url.pathname.startsWith("/api/cms/admin/events/")) return handleCmsEvents(request, env, true);
    if (url.pathname === "/api/cms/admin/posts" || url.pathname.startsWith("/api/cms/admin/posts/")) return handleCmsPosts(request, env, true);
    return cmsResponse({ ok: false, error: "Not found" }, 404);
  } catch (error) {
    const message = error?.message === "CMS_DB_NOT_CONFIGURED"
      ? "更新用データベースが未設定です。"
      : error?.message === "PAYLOAD_TOO_LARGE"
        ? "送信内容が大きすぎます。"
        : "処理中にエラーが発生しました。";
    return cmsResponse({ ok: false, error: message }, error?.message === "PAYLOAD_TOO_LARGE" ? 413 : 500);
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
    if (url.pathname.startsWith("/api/cms/") || url.pathname.startsWith("/cms-media/")) {
      return handleCmsRequest(request, env);
    }
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
