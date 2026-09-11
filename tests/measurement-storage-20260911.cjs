'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
(async()=>{
  if(!process.env.GAS_SOURCE)throw Error('GAS_SOURCE must point to the existing exported GAS74 outside the public site');
  global.crypto||=webcrypto;
  const source=fs.readFileSync(path.join(root,'_worker.js'),'utf8')+'\nexport { normalizeApplicationPayload };';
  const worker=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const payload=worker.normalizeApplicationPayload({purpose:'仮入校申し込み',name:'架空 テスト',utmSource:'instagram',utmMedium:'paid_social',utmCampaign:'2026_autumn',utmContent:'video_a',landingPage:'https://chikushi-ds.com/detail.html?page=standard',referrer:'https://www.google.com/'},new Request('https://chikushi-ds.com/api/application'));
  const saved=[];const headers=['受付ID','受付日時','UTM source','UTM medium','UTM campaign','UTM content','LP','参照元','どこで知ったか','ユーザーエージェント'];
  const gas=vm.createContext({console,Date});vm.runInContext(fs.readFileSync(process.env.GAS_SOURCE,'utf8'),gas);
  gas.getSheet=()=>({getLastColumn:()=>headers.length,getRange:()=>({getValues:()=>[headers]}),appendRow:row=>saved.push(row)});
  gas.appendUtmLog('OFFLINE-ONLY',new Date('2026-09-11T00:00:00Z'),gas.normalizeSubmissionLists(payload));
  assert.equal(saved.length,1);assert.deepEqual(Array.from(saved[0]).slice(2,8),['instagram','paid_social','2026_autumn','video_a','https://chikushi-ds.com/detail.html?page=standard','https://www.google.com/']);
  console.log('PASS actual Worker normalizer → GAS74 normalizeSubmissionLists → appendUtmLog in memory; no real Google/Sheets/mail calls.');
})().catch(e=>{console.error(e);process.exitCode=1;});
