(function () {
  "use strict";
  if (window.CDSMeasurement) return;
  const config = window.CDS_MEASUREMENT_CONFIG || {};
  const current = new URL(location.href);
  const production = current.protocol === "https:" && ["chikushi-ds.com", "www.chikushi-ds.com"].includes(current.hostname);
  const excluded = ["preview", "test", "staff", "debug_mode", "gtm_debug"].some(key => current.searchParams.has(key));
  const ATTR_KEY = "cds_attribution_v1";
  const CONSENT_KEY = "cds_analytics_consent_v1";
  const STAFF_KEY = "cds_measurement_staff";
  const TTL = 30 * 60 * 1000;
  const CONSENT_TTL = 180 * 24 * 60 * 60 * 1000;
  const pages = new Set("admission courses standard camp_price semi_medium bike limited paper senior motorcycle price access school students teaching syuryokentei sotsugyoukentei application topics instructors facilities faq recruit introduction referral license training company privacy sitemap".split(" "));
  const aliases = { entry: "application", contact: "application", procedure: "admission", map: "access", about: "company", "camp-price": "camp_price", "semi-medium": "semi_medium", student: "students", "map-bk": "access", "teaching-2208x": "teaching", "syuryokentei-x": "syuryokentei", "sotsugyoukentei-x": "sotsugyoukentei", news: "topics", "sitemap.html": "sitemap" };
  const sources = new Set(["google", "bing", "yahoo", "instagram", "facebook", "line", "youtube", "tiktok", "x", "newsletter", "flyer"]);
  const media = new Set(["cpc", "ppc", "paid_search", "paid_social", "social", "organic", "email", "referral", "qr", "display", "video"]);
  const referrals = new Set(["google.com", "www.google.com", "google.co.jp", "www.google.co.jp", "search.yahoo.co.jp", "bing.com", "www.bing.com", "instagram.com", "www.instagram.com", "l.instagram.com", "facebook.com", "www.facebook.com", "l.facebook.com", "lm.facebook.com", "t.co", "youtube.com", "www.youtube.com", "line.me", "tiktok.com", "www.tiktok.com"]);
  function read(storage, key) { try { return JSON.parse(window[storage].getItem(key)); } catch (_) { return null; } }
  function write(storage, key, value) { try { window[storage].setItem(key, JSON.stringify(value)); } catch (_) { /* 閲覧・申込は継続 */ } }
  function remove(storage, key) { try { window[storage].removeItem(key); } catch (_) {} }
  // クエリ・ハッシュ・自由なslug/タイトルを送らず、固定された公開ページだけ識別する。
  function pageInfo(url) {
    if (!["chikushi-ds.com", "www.chikushi-ds.com"].includes(url.hostname)) return null;
    if (["/", "/index.html"].includes(url.pathname)) return { key: "home", path: "/" };
    if (["/reasons/", "/reasons/index.html"].includes(url.pathname)) return { key: "reasons", path: "/reasons/" };
    if (url.pathname === "/article.html") return { key: "article", path: "/article.html" };
    if (url.pathname !== "/detail.html") return null;
    const requested = url.searchParams.get("page") || "admission";
    const page = aliases[requested] || requested;
    if (!pages.has(page)) return null;
    const purpose = url.searchParams.get("purpose") || "";
    const material = page === "application" && (purpose === "material_request" || purpose.includes("資料"));
    return { key: material ? "material_request" : page, path: "/detail.html?page=" + page + (material ? "&purpose=material_request" : "") };
  }
  const page = pageInfo(current);
  const canonical = page ? "https://chikushi-ds.com" + page.path : "";
  function cleanReferrer(raw) {
    try {
      const url = new URL(raw);
      if (!/^https?:$/.test(url.protocol)) return "";
      const info = pageInfo(url);
      if (info) return "https://chikushi-ds.com" + info.path;
      return referrals.has(url.hostname) ? "https://" + url.hostname + "/" : "";
    } catch (_) { return ""; }
  }
  const referrer = cleanReferrer(document.referrer);
  if (production && current.searchParams.get("staff") === "1") write("localStorage", STAFF_KEY, true);
  if (production && current.searchParams.get("staff") === "0") remove("localStorage", STAFF_KEY);
  const staff = read("localStorage", STAFF_KEY) === true;
  const eligible = production && !!page && !excluded && !staff;
  const configured = config.enabled === true && config.enhancedMeasurementDisabled === true && /^G-[A-Z0-9]{6,20}$/.test(config.measurementId || "") && !config.measurementId.includes("XXXX");
  function registered(value, list) { return typeof value === "string" && Array.isArray(list) && list.includes(value) && /^[a-z0-9_-]{1,64}$/.test(value) ? value : ""; }
  function safeCampaign(value) {
    return {
      utmSource: sources.has(value?.utmSource) ? value.utmSource : "",
      utmMedium: media.has(value?.utmMedium) ? value.utmMedium : "",
      utmCampaign: registered(value?.utmCampaign, config.campaignCodes),
      utmContent: registered(value?.utmContent, config.contentCodes)
    };
  }
  const emptyAttribution = () => ({ utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", landingPage: canonical, referrer });
  const loadedAt = Date.now();
  let attribution = emptyAttribution();
  if (eligible) {
    const old = read("sessionStorage", ATTR_KEY);
    if (old && Date.now() - old.touchedAt >= 0 && Date.now() - old.touchedAt < TTL) {
      const clean = safeCampaign(old);
      let oldPage;
      try { oldPage = pageInfo(new URL(old.landingPage)); } catch (_) {}
      attribution = { ...clean, landingPage: oldPage ? "https://chikushi-ds.com" + oldPage.path : canonical, referrer: cleanReferrer(old.referrer) };
    }
    const params = current.searchParams;
    // 新たなUTMが1つでもあればセット全体を置換。古い広告名を混ぜない。
    if (["utm_source", "utm_medium", "utm_campaign", "utm_content"].some(k => params.has(k))) {
      const clean = safeCampaign({ utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"), utmCampaign: params.get("utm_campaign"), utmContent: params.get("utm_content") });
      attribution = clean.utmSource && clean.utmMedium ? { ...clean, landingPage: canonical, referrer } : emptyAttribution();
    }
    write("sessionStorage", ATTR_KEY, { ...attribution, touchedAt: Date.now() });
  }
  let active = false;
  let pageSent = false;
  const completed = new Set(); // 受付IDはこのページのメモリ内で重複確認するだけ。解析へ送らない。
  const started = new WeakSet();
  function context() { return { page_location: canonical, page_referrer: referrer, page_title: "筑紫野自動車学校 | " + page.key }; }
  function event(name, values) {
    if (!active || !eligible) return;
    window.gtag("event", name, { ...context(), ...values, send_to: config.measurementId });
  }
  function start() {
    if (active || !eligible || !configured) return;
    active = true;
    window["ga-disable-" + config.measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("set", { ...context(), allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true });
    const campaign = safeCampaign(Date.now() - loadedAt < TTL ? attribution : {});
    window.gtag("config", config.measurementId, { ...context(), send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_flags: "SameSite=Lax;Secure", ...(campaign.utmSource && campaign.utmMedium ? { campaign_source: campaign.utmSource, campaign_medium: campaign.utmMedium, campaign_name: campaign.utmCampaign || "unregistered", campaign_content: campaign.utmContent || "unregistered" } : {}) });
    const script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + config.measurementId;
    document.head.appendChild(script);
    if (!pageSent) { pageSent = true; event("page_view", {}); }
  }
  function consent() {
    const saved = read("localStorage", CONSENT_KEY);
    return saved && ["granted", "denied"].includes(saved.value) && Date.now() - saved.at >= 0 && Date.now() - saved.at < CONSENT_TTL ? saved.value : null;
  }
  function clearAnalyticsCookies() {
    document.cookie.split(";").forEach(item => {
      const name = item.split("=")[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      ["", ";domain=" + location.hostname, ";domain=.chikushi-ds.com"].forEach(domain => { document.cookie = name + "=;Max-Age=0;path=/" + domain + ";SameSite=Lax;Secure"; });
    });
  }
  function setConsent(value) {
    if (!eligible || !configured || !["granted", "denied"].includes(value)) return;
    write("localStorage", CONSENT_KEY, { value, at: Date.now() });
    const wasActive = active;
    if (value === "granted") start();
    else { active = false; window["ga-disable-" + config.measurementId] = true; clearAnalyticsCookies(); }
    document.getElementById("cds-measurement-choice")?.remove();
    // 読込済みタグを確実に停止する。拒否後はタグそのものを読み込まない。
    if (wasActive && value === "denied") location.reload();
  }
  function showChoice() {
    if (!eligible || !configured || document.getElementById("cds-measurement-choice")) return;
    const panel = document.createElement("section");
    panel.id = "cds-measurement-choice";
    panel.setAttribute("aria-label", "アクセス解析の設定");
    panel.innerHTML = '<p>サイトの改善のため、Google Analyticsで閲覧や申込完了を集計してよいですか。フォームの氏名・連絡先・入力内容は送信しません。拒否してもお申し込みいただけます。<a href="/detail.html?page=privacy#access-analytics">詳しく見る</a></p><div><button type="button" data-choice="granted">許可する</button><button type="button" data-choice="denied">許可しない</button></div>';
    panel.querySelectorAll("button").forEach(button => button.addEventListener("click", () => setConsent(button.dataset.choice)));
    document.body.appendChild(panel);
  }
  function formType(purpose) { return ({ "仮入校申し込み": "application", "資料請求": "material_request", "友人・知人紹介": "referral" })[purpose] || ""; }
  window.CDSMeasurement = Object.freeze({
    attribution: () => Date.now() - loadedAt < TTL ? ({ ...attribution }) : emptyAttribution(),
    complete(response, result, purpose) {
      const type = formType(purpose);
      if (!active || !type || response?.ok !== true || result?.ok !== true || result.duplicate || typeof result.applicationId !== "string" || !result.applicationId || completed.has(result.applicationId)) return;
      completed.add(result.applicationId);
      event(type + "_complete", { form_type: type });
    },
    setConsent,
    showChoice
  });
  function ready() {
    if (!eligible || !configured) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "cds-measurement-settings";
    button.textContent = "アクセス解析の設定";
    button.addEventListener("click", showChoice);
    document.body.appendChild(button);
    if (consent() === "granted") start();
    else if (!consent()) showChoice();
    document.addEventListener("input", e => {
      const form = e.target?.closest("#applicationForm, #referralForm, #application-form");
      const type = formType(form?.querySelector('[name="purpose"]')?.value);
      if (!active || !form || !type || started.has(form) || ["hidden", "submit"].includes(e.target.type)) return;
      started.add(form);
      event("form_start", { form_type: type });
    });
    document.addEventListener("click", e => {
      const link = e.target?.closest('a[href^="tel:"]');
      if (link && /^tel:(?:\+81[- ]?92|092)[- ]?710[- ]?2188$/.test(link.getAttribute("href"))) event("phone_click", {});
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();
