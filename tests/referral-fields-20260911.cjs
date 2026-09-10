'use strict';
// Offline only: actual Worker + locally exported GAS, mocked Google services.
// GAS_SOURCE points outside the public site; no production URLs or credentials are read.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createServer } = require('node:http');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const gasPath = process.env.GAS_SOURCE;
if (!gasPath) throw new Error('Set GAS_SOURCE to the local Code.after.gs (outside the public site).');
const plain = value => JSON.parse(JSON.stringify(value));
const secret = 'offline-fixture-secret';
const envelopes = [], mails = [], sheets = new Map();
class MemorySheet {
  constructor(name, rows = []) { this.name = name; this.rows = rows; }
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map(r => r.length)); }
  setFrozenRows() { return this; }
  getRange(row, col, height = 1, width = 1) {
    return {
      getValues: () => Array.from({length:height}, (_, r) => Array.from({length:width}, (_, c) => this.rows[row+r-1]?.[col+c-1] ?? '')),
      setValues: values => values.forEach((line,r) => line.forEach((v,c) => {
        this.rows[row+r-1] ||= []; this.rows[row+r-1][col+c-1] = v;
      })),
      setValue: value => { this.rows[row-1] ||= []; this.rows[row-1][col-1] = value; }
    };
  }
  appendRow(row) { this.rows.push(plain(row)); }
}
const ss = {
  getSheetByName: name => sheets.get(name),
  insertSheet: name => { const sheet = new MemorySheet(name); sheets.set(name,sheet); return sheet; }
};
const cache = new Map();
const gas = vm.createContext({
  console, Date,
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
  CacheService: { getScriptCache: () => ({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)}) },
  LockService: {getScriptLock:()=>({tryLock:()=>true, releaseLock:()=>{}})},
  Utilities: {
    Charset: {UTF_8:'UTF-8'},
    computeHmacSha256Signature: (message,key) => [...crypto.createHmac('sha256',key).update(message).digest()],
    formatDate: (date,zone,format) => format === 'yyyy年M月' ? '2026年9月' : '2026-09-11'
  },
  ContentService: {MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
  GmailApp: {sendEmail:(...args)=>mails.push(args)},
  MailApp: {sendEmail:()=>{throw new Error("MailApp is not enabled in the current manifest");}}
});
vm.runInContext(fs.readFileSync(gasPath,'utf8'),gas,{filename:'Code.after.gs'});
const schemas = vm.runInContext('Object.entries(HEADERS).map(([key,headers]) => [SHEET_NAMES[key] || key, headers])',gas);
for (const [name,headers] of schemas) sheets.set(name,new MemorySheet(name,[plain(headers)]));
const referral = sheets.get('紹介の人');
const additions = ['入校者郵便番号','入校者住所','入校者希望教習車種','入校者職業'];
const currentHeaders = referral.rows[0].filter(h=>!additions.includes(h));
// Existing columns are deliberately reordered and a school-managed formula is present.
[ currentHeaders[4], currentHeaders[8] ] = [ currentHeaders[8], currentHeaders[4] ];
referral.rows = [[...currentHeaders,'学校独自計算'],['legacy-fixture','','','','旧入校者','','','','旧紹介者','','','','','','','対応中','','',true,'','=1+2']];
const previous = plain(referral.rows);
// Mock unrelated storage/notification coordination. Core signature, validation,
// schema append, appendApplication/appendRecord, and email templates remain real.
vm.runInContext(`
ensureDefaultSettings = function() {};
getSettings = function() { return { notification_emails:'school@example.invalid', enable_auto_reply:'true', school_email:'school@example.invalid' }; };
claimNotificationDelivery_ = function() { return true; };
appendQuote = function() {}; appendUtmLog = function() {}; appendSubmissionKey = function() {};
logEvent = function() {};
`,gas);
gas.updateApplicationFields = (id,fields) => {
  const row = referral.rows.find(r => r[referral.rows[0].indexOf('受付ID')]===id);
  for(const [key,value] of Object.entries(fields)) row[referral.rows[0].indexOf(key)] = value;
};
gas.ensureSpreadsheetStructure();
assert.deepEqual(referral.rows[0], [...previous[0],...additions]);
assert.deepEqual(referral.rows[1], previous[1]);
gas.ensureSpreadsheetStructure();
assert.deepEqual(referral.rows[0], [...previous[0],...additions], 'migration is idempotent');
const fixture = { purpose:'友人・知人紹介',name:'架空 紹介太郎',phone:'09000000000',email:'referrer@example.invalid',friendName:'架空 入校花子',privacyConsent:true };
const complete = {...fixture,friendPostalCode:'818-0000',friendAddress:'テスト県架空市1-2-3 <確認>',friendDesiredVehicles:['AT普通車','MT普通二輪車'],friendOccupation:'その他：架空職業'};
let worker;
async function request(payload) {
  return worker.fetch(new Request('http://127.0.0.1/api/application',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),{GAS_APPLICATION_WEBHOOK_URL:'https://gas.example.invalid/offline',GAS_SHARED_SECRET:secret});
}
function record(id) {
  const row = referral.rows.find(r => r[referral.rows[0].indexOf('受付ID')]===id);
  return Object.fromEntries(referral.rows[0].map((h,i)=>[h,row?.[i]??'']));
}
async function main() {
  // Any attempted external fetch is rejected, including accidental real GAS calls.
  global.fetch = async (url,options) => {
    assert.equal(url,'https://gas.example.invalid/offline');
    const envelope = JSON.parse(options.body); envelopes.push(envelope);
    return new Response(gas.doPost({postData:{type:'application/json',contents:options.body}}).text,{headers:{'content-type':'application/json'}});
  };
  const source = fs.readFileSync(path.join(root,'_worker.js'),'utf8');
  const extra = '\nexport { normalizeApplicationPayload, createSubmissionKey };';
  const module = await import('data:text/javascript;base64,'+Buffer.from(source+extra).toString('base64'));
  worker = module.default;
  const normalize = data => module.normalizeApplicationPayload(data,new Request('http://127.0.0.1/api/application'));
  const baseline = execFileSync('git',['show','HEAD:_worker.js'],{cwd:root,encoding:'utf8'});
  const old = await import('data:text/javascript;base64,'+Buffer.from(baseline+extra).toString('base64'));
  assert.equal(await module.createSubmissionKey(normalize(fixture)), await old.createSubmissionKey(old.normalizeApplicationPayload(fixture,new Request('http://127.0.0.1/api/application'))),'old submission key compatibility');
  const result = await (await request(complete)).json();
  assert.equal(result.ok,true,JSON.stringify(result));
  const saved = record(result.applicationId);
  assert.equal(saved['紹介者氏名'],fixture.name); assert.equal(saved['入校者氏名'],fixture.friendName);
  assert.equal(saved['入校者住所'],complete.friendAddress); assert.equal(saved['入校者郵便番号'],complete.friendPostalCode);
  assert.equal(saved['入校者希望教習車種'],'AT普通車、MT普通二輪車');
  assert.equal(saved['入校者職業'],'その他:架空職業');
  assert.equal(mails.length,2); assert.equal(mails[0][0],'school@example.invalid'); assert.equal(mails[1][0],fixture.email);
  assert.ok(mails[0][2].includes('ご入校者 住所：'+complete.friendAddress));
  for(const value of ['AT普通車、MT普通二輪車','その他:架空職業','818-0000']) {assert.ok(mails[0][2].includes(value));assert.ok(mails[0][3].htmlBody.includes(value));}
  assert.ok(mails[0][3].htmlBody.includes('&lt;確認&gt;')); assert.ok(!mails[0][3].htmlBody.includes('<確認>'));
  const duplicate = await (await request(complete)).json(); assert.equal(duplicate.duplicate,true); assert.equal(mails.length,2);
  for(const [key,value] of Object.entries({friendAddress:'別の架空住所',friendPostalCode:'818-0001',friendDesiredVehicles:['MT普通車'],friendOccupation:'会社員'})) {
    assert.notEqual(await module.createSubmissionKey(normalize({...complete,[key]:value})),await module.createSubmissionKey(normalize(complete)), key+' corrections saved separately');
  }
  const legacy = await (await request(fixture)).json(); assert.equal(legacy.ok,true,JSON.stringify(legacy));
  for(const header of additions) assert.equal(record(legacy.applicationId)[header],'');
  const empty = await (await request({...fixture,friendPostalCode:'',friendAddress:'',friendDesiredVehicles:[],friendOccupation:''})).json(); assert.equal(empty.duplicate,true);
  const beforeInvalid = envelopes.length;
  for(const [patch,code] of [
    [{friendPostalCode:'123'},'VALIDATION_FRIEND_POSTAL_CODE'],[{friendDesiredVehicles:['飛行機']},'VALIDATION_FRIEND_VEHICLE'],
    [{friendName:''},'VALIDATION_REQUIRED'],[{privacyConsent:false},'VALIDATION_REQUIRED'],
    [{friendEmail:'invalid'},'VALIDATION_FRIEND_EMAIL'],[{friendPhone:'1'},'VALIDATION_FRIEND_PHONE']
  ]) { const res=await request({...fixture,...patch}); assert.equal(res.status,400); assert.equal((await res.json()).code,code); }
  assert.equal(envelopes.length,beforeInvalid,'invalid input must not reach GAS');
  const normalized=normalize({...complete,friendAddress:'あ'.repeat(350),friendOccupation:'あ'.repeat(100),friendDesiredVehicles:['AT普通車','AT普通車','MT普通車']});
  assert.equal(normalized.friendAddress.length,300);assert.equal(normalized.friendOccupation.length,80);assert.deepEqual(normalized.friendDesiredVehicles,['AT普通車','MT普通車']);
  const literal=await (await request({...fixture,friendAddress:'=1+2',friendName:'数式 テスト'})).json();assert.equal(record(literal.applicationId)['入校者住所'],"'=1+2");
  assert.throws(()=>gas.validatePayload(gas.normalizeSubmissionLists({...fixture,friendName:''})),e=>e.code==='VALIDATION_REQUIRED');
  assert.throws(()=>gas.validatePayload(gas.normalizeSubmissionLists({...fixture,friendPostalCode:'123'})),e=>e.code==='VALIDATION_FRIEND_POSTAL_CODE');
  // Old validation mismatch is reproduced; candidate handles referral without generic fields.
  const oldGas = vm.createContext({console,Date});
  vm.runInContext(fs.readFileSync(gasPath.replace('Code.after.gs','Code.before.gs'),'utf8'),oldGas);
  assert.throws(()=>oldGas.validatePayload(oldGas.normalizeSubmissionLists(fixture)),e=>e.code==='VALIDATION_REQUIRED');
  const application = {...fixture,purpose:'資料請求',gender:'女性',birthdate:'2000-01-01',postalCode:'818-0000',address:'架空住所',occupation:'会社員',desiredVehicles:['AT普通車']};
  gas.validatePayload(gas.normalizeSubmissionLists(application));
  assert.throws(()=>gas.validatePayload(gas.normalizeSubmissionLists({...application,occupation:''})),e=>e.code==='VALIDATION_REQUIRED');
  assert.deepEqual(referral.rows[1],previous[1],'legacy row and formula unchanged');
  console.log('PASS: Worker → HMAC verification → GAS doPost → in-memory sheet / notification templates; optional & legacy, multi-select, validation, duplicates, escaping, preserved columns/formulas.');
  if(process.argv.includes('--serve')) {
    const server=createServer(async(req,res)=>{
      try {
        const url=new URL(req.url,'http://127.0.0.1');
        if(url.pathname==='/api/application'&&req.method==='POST') {
          let body='';for await(const chunk of req) body+=chunk;
          const response=await request(JSON.parse(body));res.writeHead(response.status,{'content-type':'application/json'});res.end(await response.text());return;
        }
        if(req.method!=='GET') {res.writeHead(405);res.end();return;}
        if(url.pathname==='/__test/results') {res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({records:referral.rows.slice(2).map(r=>Object.fromEntries(referral.rows[0].map((h,i)=>[h,r[i]??'']))),lastEnvelope:envelopes.at(-1),mailCount:mails.length}));return;}
        const relative=url.pathname==='/'?'detail.html':decodeURIComponent(url.pathname.slice(1));
        const target=path.resolve(root,relative);
        if(!target.startsWith(root+path.sep)||(!/^(assets|data|images)\//.test(relative)&&relative!=='detail.html')) {res.writeHead(404);res.end();return;}
        const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
        res.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream','content-security-policy':"default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:"});res.end(fs.readFileSync(target));
      }catch(error){res.writeHead(500);res.end('Offline fixture error');console.error(error.message);}
    });
    server.listen(8765,'127.0.0.1',()=>console.log('Local mock preview: http://127.0.0.1:8765/detail.html?page=referral (no real sends)'));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
