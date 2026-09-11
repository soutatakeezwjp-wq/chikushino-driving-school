'use strict';
// Offline only: private GAS exports, synthetic inputs, no Google writes or email.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),copy=v=>JSON.parse(JSON.stringify(v));
if(!process.env.GAS_SOURCE||!process.env.GAS_BEFORE)throw Error('Set GAS_SOURCE and GAS_BEFORE to private exports.');
const forbidden=()=>{throw Error('External service forbidden');};
function load(file){const c=vm.createContext({console,Date,GmailApp:{sendEmail:forbidden},MailApp:{sendEmail:forbidden},UrlFetchApp:{fetch:forbidden},Utilities:{formatDate:(d,z,f)=>f==='M'?String(d.getUTCMonth()+1):'2026年9月'}});vm.runInContext(fs.readFileSync(file,'utf8'),c);return c;}
const gas=load(process.env.GAS_SOURCE),old=load(process.env.GAS_BEFORE);
const fixture={purpose:'仮入校申し込み',name:'架空 テスト',gender:'男性',birthdate:'2000-01-01',phone:'09000000000',email:'fixture@example.invalid',postalCode:'818-0000',address:'架空市テスト1',occupation:'会社員',lessonPlan:'フリープラン',currentLicenses:['MT普通車'],desiredVehicles:['MT普通二輪車'],desiredEntryDate:'2026-10-01',paymentMethod:'未定',privacyConsent:true};
const q=(p,c=gas)=>copy(c.recalculateQuote(c.normalizeSubmissionLists({...fixture,...p})));
let cases=0;
function amount(p,n){assert.equal(q(p).amount,n,JSON.stringify(p));cases++;}
function review(p,pattern){const v=q(p);assert.equal(v.available,false,JSON.stringify(p));assert.equal(v.amount,'');if(pattern)assert.match(v.reason,pattern);cases++;return v;}
const master=JSON.parse(fs.readFileSync(path.join(root,'data/price-master.json')));
const licenses={none:'持っていない',moped:'原付',motorcycle:'MT普通二輪車',ordinary_car:'MT普通車',at_ordinary_car:'AT普通車',mt_ordinary_car:'MT普通車',at_small_motorcycle:'AT普通二輪車（小型限定）',mt_small_motorcycle:'MT普通二輪車（小型限定）',at_standard_motorcycle:'AT普通二輪車',mt_standard_motorcycle:'MT普通二輪車'};
const vehicles={ordinary_at:'AT普通車',semi_medium:'MT準中型車',motorcycle_large_mt:'MT大型二輪車',motorcycle_mt:'MT普通二輪車',motorcycle_at:'AT普通二輪車',motorcycle_small_mt:'MT普通二輪車（小型限定）',motorcycle_small_at:'AT普通二輪車（小型限定）'};
for(const [category,table] of Object.entries(master.catalog))for(const row of table.mainFeeRows){
 if(row.id==='standard-mt-transition-at-graduation-certificate')continue;
 const course=category==='standardCar'?'ordinary_at':category==='semiMedium'?'semi_medium':row.id.startsWith('large-')?'motorcycle_large_mt':row.id.startsWith('small-')?(row.transmission==='AT'?'motorcycle_small_at':'motorcycle_small_mt'):(row.transmission==='AT'?'motorcycle_at':'motorcycle_mt');
 for(const license of row.currentLicenseCodes)for(const user of ['student','general'])for(const plan of ['day','free']){
  const p={desiredVehicles:[vehicles[course]],currentLicenses:[licenses[license]],occupation:user==='student'?'大学生':'会社員',lessonPlan:plan==='day'?'デイプラン':'フリープラン'},expected=row.prices[plan][user];
  amount(p,expected);assert.equal(q(p,old).amount,expected);
  if(course==='ordinary_at')amount({...p,desiredVehicles:['MT普通車']},expected+36300);
 }
}
const tariffCases=cases;
const resolved=[{desiredVehicles:['MT普通車'],currentLicenses:['MT普通二輪車','原付'],occupation:'パート・アルバイト',lessonPlan:'デイプラン'},{desiredVehicles:['MT普通二輪車'],currentLicenses:['MT準中型車']},{desiredVehicles:['MT大型二輪車'],currentLicenses:['MT8t限定中型車']}];
for(const [i,p] of resolved.entries()){assert.equal(q(p,old).amount,'');amount(p,[290450,129520,233910][i]);}
amount({...resolved[0],currentLicenses:'ＭＴ普通二輪車、原付'},290450);
amount({...resolved[0],currentLicenses:['原付','MT普通二輪車']},290450);
amount({...resolved[0],currentLicenses:['motorcycle_at','moped']},290450);
review({...resolved[0],desiredVehicles:['AT普通車']},/複数/);
review({...resolved[0],currentLicenses:['MT大型二輪車','原付']},/複数/);
review({...resolved[0],currentLicenses:['MT普通二輪車（小型限定）','原付']},/複数/);
review({...resolved[0],currentLicenses:['MT普通二輪車','原付','仮免許']},/区分/);
assert.notEqual(q({...resolved[0],currentLicenses:'ＭＴ普通二輪車、原付'},old).amount,'','old joined-string misclassification reproduced');
for(const license of ['大型特殊','けん引','大特農耕限定','仮免許'])review({currentLicenses:[license]},/区分/);
amount({currentLicenses:['MT普通車','MT準中型車']},129520);
review({currentLicenses:['MT普通車','大型特殊']},/大型特殊/);
assert.equal(q({currentLicenses:['MT普通車','MT準中型車']},old).amount,129520,'old unsupported-license discard reproduced');
review({currentLicenses:['MT普通車','普通二輪車']},/区分/);
review({currentLicenses:['持っていない','原付']},/同時/);
review({currentLicenses:['持っていない','MT普通車']},/同時/);
review({currentLicenses:[],currentLicense:''},/未選択/);
review({currentLicenses:['普通車仮免許']},/区分/);
review({currentLicenses:['MT普通車原付']},/区分/);
amount({currentLicenses:['MT普通車','AT普通車']},129520);
amount({currentLicenses:'ＭＴ普通車、ＡＴ普通車'},129520);
amount({currentLicenses:['mt 普通自動車','ＡＴ普通車']},129520);
amount({desiredVehicles:['mt普通二輪車'],currentLicenses:['ＭＴ普通車']},129520);
amount({desiredVehicles:['AT普通車'],currentLicenses:['small_at']},276150);
amount({currentLicenses:['at_car','mt_car']},129520);
amount({currentLicenses:['none','持っていない']},197390);
amount({desiredVehicles:['MT大型二輪車'],currentLicenses:['motorcycle_mt']},124570);
amount({desiredVehicles:['MT準中型車'],currentLicenses:['ＡＴ普通自動車']},193760);
review({desiredVehicles:['MT準中型車'],currentLicenses:['普通車']},/区分/);
review({desiredVehicles:['AT普通車','MT普通二輪車'],priceCourse:'ordinary_at'},/複数/);
review({desiredVehicles:['AT普通車','ペーパードライバー']},/対象外/);
review({desiredVehicles:['普通車MT限定解除'],priceCourse:'ordinary_mt'},/対象外/);
for(const desired of ['AT大型二輪車','AT準中型車','限定解除','ペーパードライバー'])review({desiredVehicles:[desired]},/対象外/);
review({desiredVehicles:['AT普通車'],priceCourse:'ordinary_mt'},/一致/);
review({desiredVehicles:['未登録の普通車']},/対象外/);
review({desiredVehicles:['ATMT普通車']},/対象外/);
review({desiredVehicles:[],vehicle:'',priceCourse:'constructor'},/学校/);
assert.deepEqual(copy(vm.runInContext('PRICE_MASTER',gas)),copy(vm.runInContext('PRICE_MASTER',old)),'tariff master unchanged');
amount({desiredVehicles:['ordinary_at','AT普通車'],currentLicenses:['none'],priceCourse:'ordinary_at'},349850);
amount({desiredVehicles:[],vehicle:'',priceCourse:'motorcycle_mt'},129520);
amount({desiredVehicles:['AT普通車'],currentLicenses:['持っていない'],occupation:'大学生',lessonPlan:'デイプラン',optionPlans:['コミコミプラン']},333850);
amount({desiredVehicles:['AT普通車'],currentLicenses:['持っていない'],occupation:'大学生',optionPlans:['合宿風ハイスピードプラン'],desiredEntryDate:'2026-10-01'},399850);
amount({desiredVehicles:['AT普通車'],currentLicenses:['持っていない'],occupation:'大学生',optionPlans:['合宿風ハイスピードプラン'],desiredEntryDate:'2026-12-01'},421850);
for(const bad of ['',null,0]){vm.runInContext('PRICE_MASTER.motorcycle_mt.licenses.car.general.free='+JSON.stringify(bad),gas);review({},/未設定/);}
vm.runInContext('PRICE_MASTER.motorcycle_mt.licenses.car.general.free=129520',gas);
// School-approved upper car categories: all existing motorcycle tariffs, both users and plans.
const approvedStart=cases;
for(const course of ['motorcycle_large_mt','motorcycle_mt','motorcycle_at','motorcycle_small_mt','motorcycle_small_at']){
 for(const held of ['MT準中型車','MT5t限定準中型車','AT5t限定準中型車','中型車','MT8t限定中型車','AT8t限定中型車','大型車','ＭＴ８ｔ限定中型車'])for(const user of ['student','general'])for(const plan of ['day','free']){
  const expected=vm.runInContext('PRICE_MASTER['+JSON.stringify(course)+'].licenses.car['+JSON.stringify(user)+']['+JSON.stringify(plan)+']',gas);
  amount({desiredVehicles:[vehicles[course]],currentLicenses:[held],occupation:user==='student'?'大学生':'会社員',lessonPlan:plan==='day'?'デイプラン':'フリープラン'},expected);
 }
}
amount({currentLicenses:['MT普通車','AT普通車','MT準中型車'],occupation:'大学生',lessonPlan:'デイプラン'},113520);
review({desiredVehicles:['MT準中型車'],currentLicenses:['中型車']},/区分/);
review({desiredVehicles:['AT普通車'],currentLicenses:['MT準中型車']},/区分/);
review({desiredVehicles:['MT大型二輪車'],currentLicenses:['MT準中型車','MT普通二輪車']},/複数/);
const approvedRuleCases=cases-approvedStart;
const original=JSON.stringify(fixture);q(fixture);assert.equal(JSON.stringify(fixture),original);
// Actual appendApplication, appendQuote, appendRecord with only Google storage replaced.
const saved=new Map();
class Sheet{
 constructor(name,headers){this.name=name;this.rows=[headers,['legacy-fixture',...headers.slice(1).map(()=>''),'=1+2']];}
 getName(){return this.name;}getLastColumn(){return this.rows[0].length;}getLastRow(){return this.rows.length;}
 getRange(row,col,height=1,width=1){const range={getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>this.rows[row+r-1]?.[col+c-1]??'')),insertCheckboxes:()=>range,setValue:v=>{this.rows[row-1][col-1]=v;return range;}};return range;}
 appendRow(row){this.rows.push(copy(row));}
}
const schemas=vm.runInContext('({a:APPLICATION_MANAGEMENT_HEADERS,q:HEADERS.priceQuotes})',gas);
for(const [name,h] of [['仮申し込みの人',schemas.a],['price_quotes',schemas.q]])saved.set(name,new Sheet(name,[...copy(h)].reverse()));
gas.SpreadsheetApp={getActiveSpreadsheet:()=>({getSheetByName:name=>saved.get(name)})};
vm.runInContext('refreshApplicationManagementRow_=function(){};syncApplicationMasterRowToMonth_=function(){};',gas);
const originals=copy([...saved.values()].map(s=>s.rows));
function record(name,id){const s=saved.get(name),r=s.rows.find(r=>r[s.rows[0].indexOf('受付ID')]===id);return Object.fromEntries(s.rows[0].map((h,i)=>[h,r?.[i]]));}
let n=0;
for(const p of [fixture,...resolved,{currentLicenses:['大型特殊']}]){
 const payload={...fixture,...p},quote=q(p),id='synthetic-'+(++n);gas.appendApplication(id,'offline-key',new Date('2026-09-11'),payload,quote,'');gas.appendQuote(id,new Date('2026-09-11'),quote);
 const a=record('仮申し込みの人',id),r=record('price_quotes',id);assert.equal(a['見積金額'],quote.amount);assert.equal(r['見積金額'],quote.amount);assert.equal(a['所持免許'],payload.currentLicenses.join('、'));
 if(!quote.available){assert.equal(r['計算結果'],quote.reason);assert.equal(r['所持免許名'],payload.currentLicenses.join('、'));assert.equal(r['学生/一般'],'一般');assert.ok(r['技能プラン']);}
 if(quote.available){assert.equal(r['計算結果'],'サーバー再計算済み');assert.equal(r['所持免許'],quote.licenseKey);assert.equal(r['基本料金'],quote.amount);assert.equal(r['オプション料金'],0);}
}
assert.deepEqual(copy([...saved.values()].map(s=>s.rows.slice(0,2))),originals,'old rows/formula unchanged');
(async()=>{
 global.fetch=forbidden;
 const source=fs.readFileSync(path.join(root,'_worker.js'),'utf8')+'\nexport {normalizeApplicationPayload,validateApplicationPayload};';
 const worker=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 for(const p of [fixture,...resolved,{currentLicenses:['大型特殊']}]){const input=worker.normalizeApplicationPayload({...fixture,...p},new Request('https://offline.example.invalid/api/application'));worker.validateApplicationPayload(input);assert.equal(gas.recalculateQuote(gas.normalizeSubmissionLists(input)).amount,q(p).amount);}
 console.log(JSON.stringify({ok:true,tariffCases,selectionCases:cases-tariffCases-approvedRuleCases,approvedRuleCases,repairedAmounts:resolved.map(p=>q(p).amount),checks:['PDF tariff matrix','old bugs reproduced','spelling and legacy keys','unknown and multiple course review','actual memory storage and reason context','Worker to GAS normalization','existing rows/formulas unchanged','no network or mail']},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
