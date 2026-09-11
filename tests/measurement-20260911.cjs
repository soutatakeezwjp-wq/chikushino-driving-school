'use strict';
// Headless local fixture: every request is intercepted; no Google, GAS or mail traffic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const enabled = {enabled:true,measurementId:'G-TEST123456',enhancedMeasurementDisabled:true,campaignCodes:['2026_autumn'],contentCodes:['video_a']};
const blank = '<!doctype html><html><head><meta charset="utf-8"><script src="/assets/measurement-config.js"></script><script src="/assets/measurement.js"></script></head><body><a href="tel:0927102188">電話</a><form id="applicationForm"><input name="purpose" type="hidden" value="仮入校申し込み"><input name="name"></form></body></html>';
let browser;
async function fixture(url, options={}) {
  const context = await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1280,height:900}});
  const page = await context.newPage();
  const calls=[],payloads=[],errors=[];
  let reply={ok:true,applicationId:'FIXTURE-ONLY-1',duplicate:false},status=200,delay=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*', async route => {
    const request=route.request(),u=new URL(request.url());
    if(u.hostname==='www.googletagmanager.com'){calls.push(u.toString());return route.fulfill({contentType:'text/javascript',body:'window.__mockGoogleLoaded=true;'});}
    if(!['chikushi-ds.com','www.chikushi-ds.com','127.0.0.1','test.chikushino-driving-school.pages.dev'].includes(u.hostname)) return route.abort();
    if(u.pathname==='/assets/measurement-config.js')return route.fulfill({contentType:'text/javascript',body:'window.CDS_MEASUREMENT_CONFIG='+JSON.stringify(options.config||enabled)});
    if(u.pathname==='/api/application'){payloads.push(request.postDataJSON());if(delay)await new Promise(r=>setTimeout(r,delay));return route.fulfill({status,contentType:'application/json',body:JSON.stringify(reply)});}
    if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,posts:[],schedules:[],schedule:[],categories:[]})});
    if(request.isNavigationRequest()&&!options.real)return route.fulfill({contentType:'text/html',body:blank});
    const rel=u.pathname==='/'?'index.html':u.pathname.slice(1),target=path.resolve(root,rel);
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())return route.fulfill({status:404,body:''});
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(target)]||'application/octet-stream';
    return route.fulfill({contentType:mime,body:fs.readFileSync(target)});
  });
  await page.goto(url);
  return {context,page,calls,payloads,errors,reply(v,s=200,ms=0){reply=v;status=s;delay=ms;},events:()=>page.evaluate(()=>Array.from(window.dataLayer||[],x=>Array.from(x)).filter(x=>x[0]==='event')),close:()=>context.close()};
}
async function complete(f,result={ok:true,applicationId:'FIXTURE-ID',duplicate:false},purpose='仮入校申し込み',ok=true){await f.page.evaluate(({result,purpose,ok})=>window.CDSMeasurement.complete({ok},result,purpose),{result,purpose,ok});}
async function fillForm(f,id){
  await f.page.locator(id).waitFor();
  const invalid=await f.page.locator(id).evaluate(form=>{
    form.querySelectorAll('[data-required-group]').forEach(group=>{const el=group.querySelector('input:not(:disabled)');if(el)el.click();});
    form.querySelectorAll('input[required],select[required],textarea[required]').forEach(el=>{
      if(el.disabled||el.type==='hidden')return;
      if(['checkbox','radio'].includes(el.type)){if(!el.checked)el.click();}
      else if(el.tagName==='SELECT'){el.selectedIndex=1;el.dispatchEvent(new Event('change',{bubbles:true}));}
      else {el.value=el.type==='email'?'private-fixture@example.invalid':el.type==='tel'?'09000000000':el.type==='date'?(el.name==='birthdate'?'2000-01-01':'2026-10-01'):el.name.toLowerCase().includes('postal')?'8180000':'架空テスト';el.dispatchEvent(new Event('input',{bubbles:true}));}
    });
    return Array.from(form.querySelectorAll(':invalid'),el=>el.name);
  });
  assert.deepEqual(invalid,[]);
}
(async()=>{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  let checks=0;
  for(const url of ['https://chikushi-ds.com/admin/','https://chikushi-ds.com/detail.html?page=application&preview=1','https://chikushi-ds.com/?test=1','https://chikushi-ds.com/?staff=1','https://test.chikushino-driving-school.pages.dev/','http://127.0.0.1/','https://chikushi-ds.com/detail.html?page=private-name']){
    const f=await fixture(url);await f.page.evaluate(()=>window.CDSMeasurement.setConsent('granted'));assert.equal(f.calls.length,0);assert.equal((await f.events()).length,0);await f.close();checks++;
  }
  for(const config of [{...enabled,enabled:false},{...enabled,measurementId:''},{...enabled,enhancedMeasurementDisabled:false}]){
    const f=await fixture('https://chikushi-ds.com/',{config});await f.page.evaluate(()=>window.CDSMeasurement.setConsent('granted'));assert.equal(f.calls.length,0);await f.close();checks++;
  }
  const f=await fixture('https://chikushi-ds.com/detail.html?page=application&email=private@example.invalid&utm_source=instagram&utm_medium=paid_social&utm_campaign=2026_autumn&utm_content=video_a#private-name');
  assert.equal(f.calls.length,0);await complete(f);assert.equal((await f.events()).length,0);
  assert.deepEqual(f.errors,[]);
  assert.equal(await f.page.locator('#cds-measurement-choice').count(),1,await f.page.content());
  await f.page.getByRole('button',{name:'許可する',exact:true}).click();await f.page.waitForFunction(()=>window.__mockGoogleLoaded);
  await f.page.locator('[name=name]').fill('PRIVATE-PERSON');await f.page.locator('[name=name]').fill('PRIVATE-ADDRESS');
  assert.equal((await f.events()).filter(x=>x[1]==='page_view').length,1);assert.equal((await f.events()).filter(x=>x[1]==='form_start').length,1);
  for(const args of [[{ok:false,applicationId:'a'},'仮入校申し込み',true],[{ok:true,applicationId:'a'},'仮入校申し込み',false],[{ok:true,applicationId:'a',duplicate:true},'仮入校申し込み',true],[{ok:true},'仮入校申し込み',true]])await complete(f,...args);
  assert.equal((await f.events()).filter(x=>x[1].endsWith('_complete')).length,0);
  await complete(f);await complete(f);await complete(f,{ok:true,applicationId:'b'},'資料請求');await complete(f,{ok:true,applicationId:'c'},'友人・知人紹介');
  assert.deepEqual((await f.events()).filter(x=>x[1].endsWith('_complete')).map(x=>x[1]),['application_complete','material_request_complete','referral_complete']);
  await f.page.getByRole('link',{name:'電話',exact:true}).evaluate(el=>el.addEventListener('click',e=>e.preventDefault()));
  await f.page.getByRole('link',{name:'電話',exact:true}).click();
  const all=await f.page.evaluate(()=>JSON.stringify(window.dataLayer));
  for(const forbidden of ['PRIVATE','private@','private-name','FIXTURE-ID','"applicationId"','"email"','utm_'])assert.ok(!all.includes(forbidden),forbidden);
  assert.ok(all.includes('campaign_source'));checks+=12;
  await f.page.goto('https://chikushi-ds.com/detail.html?page=price');
  assert.deepEqual(await f.page.evaluate(()=>window.CDSMeasurement.attribution()),{utmSource:'instagram',utmMedium:'paid_social',utmCampaign:'2026_autumn',utmContent:'video_a',landingPage:'https://chikushi-ds.com/detail.html?page=application',referrer:''});
  await f.page.goto('https://chikushi-ds.com/detail.html?page=application&utm_source=google&utm_medium=cpc');
  assert.equal(await f.page.evaluate(()=>window.CDSMeasurement.attribution().utmCampaign),'');
  await f.page.goto('https://chikushi-ds.com/?utm_source=private-name&utm_medium=cpc&utm_campaign=private@example.invalid');
  assert.equal(await f.page.evaluate(()=>window.CDSMeasurement.attribution().utmSource),'');
  await f.page.evaluate(()=>sessionStorage.setItem('cds_attribution_v1',JSON.stringify({utmSource:'instagram',utmMedium:'paid_social',touchedAt:Date.now()-31*60*1000})));
  await f.page.goto('https://chikushi-ds.com/');assert.equal(await f.page.evaluate(()=>window.CDSMeasurement.attribution().utmSource),'');
  await f.page.getByRole('button',{name:'アクセス解析の設定',exact:true}).click();const oldCalls=f.calls.length;
  await f.page.waitForSelector('[data-choice="denied"]',{timeout:2000}).catch(async e=>{throw new Error(JSON.stringify({errors:f.errors,body:await f.page.content()}));});
  await Promise.all([f.page.waitForEvent('domcontentloaded'),f.page.getByRole('button',{name:'許可しない',exact:true}).click()]);assert.equal(f.calls.length,oldCalls);assert.equal((await f.events()).length,0);checks+=5;await f.close();
  // Existing application UI: delayed provisional receipt must not count a conversion.
  for(const [query,id,expected,mobile]of [['application','#applicationForm','application_complete',false],['application&purpose=資料請求','#applicationForm','material_request_complete',true],['referral','#referralForm','referral_complete',true]]){
    const g=await fixture('https://chikushi-ds.com/detail.html?page='+query,{real:true,mobile});
    await g.page.getByRole('button',{name:'許可する',exact:true}).click();await fillForm(g,id);
    g.reply({ok:true,duplicate:false,applicationId:'OFFLINE-'+expected},200,3500);
    await g.page.locator(id).evaluate(form=>form.requestSubmit());
    await g.page.waitForTimeout(3100);assert.equal((await g.events()).filter(x=>x[1]===expected).length,0);
    await g.page.waitForFunction(()=>Array.from(window.dataLayer||[],x=>Array.from(x)).some(x=>x[0]==='event'&&typeof x[1]==='string'&&x[1].endsWith('_complete')));
    assert.equal((await g.events()).filter(x=>x[1]===expected).length,1);assert.equal(g.payloads.length,1);
    assert.equal(await g.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await fillForm(g,id);g.reply({ok:true,duplicate:true,applicationId:'OFFLINE-'+expected});await g.page.locator(id).evaluate(form=>form.requestSubmit());await g.page.waitForTimeout(100);
    assert.equal((await g.events()).filter(x=>x[1]===expected).length,1);
    await fillForm(g,id);g.reply({ok:false},500);await g.page.locator(id).evaluate(form=>form.requestSubmit());await g.page.waitForTimeout(100);assert.equal((await g.events()).filter(x=>x[1]===expected).length,1);
    assert.deepEqual(g.errors,[]);checks+=6;
    if(process.env.MEASUREMENT_SCREENSHOTS){fs.mkdirSync(process.env.MEASUREMENT_SCREENSHOTS,{recursive:true});await g.page.getByRole('button',{name:'アクセス解析の設定',exact:true}).click();await g.page.screenshot({path:path.join(process.env.MEASUREMENT_SCREENSHOTS,expected+'.png')});}
    await g.close();
  }
  console.log('PASS '+checks+' measurement groups: consent, exclusions, sanitized payloads, UTM retention/replacement/expiry, exact success, delay/duplicate/failure, PC/mobile real forms; all network mocked.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
