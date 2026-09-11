'use strict';
// Synthetic data only. This test never submits to Google or sends mail.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=process.env.GAS_SOURCE;
if(!src)throw Error('GAS_SOURCE must name the private candidate.');
const forbidden=()=>{throw Error('External access forbidden');};
const gas=vm.createContext({console,Date,Utilities:{formatDate:()=> '2026年9月'},GmailApp:{sendEmail:forbidden},MailApp:{sendEmail:forbidden},UrlFetchApp:{fetch:forbidden}});
vm.runInContext(fs.readFileSync(src,'utf8'),gas);
const master=JSON.parse(fs.readFileSync(path.join(root,'data/price-master.json')));
const fixture={purpose:'仮入校申し込み',name:'架空 テスト',kana:'カクウ テスト',gender:'男性',birthdate:'2000-01-01',phone:'09000000000',email:'fixture@example.invalid',postalCode:'818-0000',address:'架空市テスト1',occupation:'会社員',lessonPlan:'フリープラン',currentLicenses:['AT普通車','MT普通二輪車'],desiredVehicles:['四輪限定解除（普通車AT解除）'],desiredEntryDate:'2026-10-01',paymentMethod:'未定',privacyConsent:true,optionPlans:[]};
const copy=v=>JSON.parse(JSON.stringify(v)),q=p=>copy(gas.recalculateQuote(gas.normalizeSubmissionLists({...fixture,...p})));
const entries=[
 ['四輪限定解除（普通車AT解除）','standardCar',0,'AT普通車','MT大型二輪車'],
 ['四輪限定解除（準中型5t解除）','semiMedium',0,'AT5t限定準中型車','MT普通二輪車'],
 ['四輪限定解除（準中型5t解除）','semiMedium',1,'MT5t限定準中型車','AT普通二輪車'],
 ['二輪限定解除（普通二輪MT）','motorcycle',0,'AT普通二輪車（小型限定）','MT8t限定中型車'],
 ['二輪限定解除（普通二輪MT）','motorcycle',1,'MT普通二輪車（小型限定）','AT普通車'],
 ['二輪限定解除（普通二輪MT）','motorcycle',2,'AT普通二輪車','MT準中型車'],
 ['二輪限定解除（普通二輪AT）','motorcycle',3,'AT普通二輪車（小型限定）','大型車'],
 ['二輪限定解除（普通二輪AT）','motorcycle',4,'MT普通二輪車（小型限定）','MT5t限定準中型車'],
 ['二輪限定解除（小型二輪AT解除）','motorcycle',5,'AT普通二輪車（小型限定）','AT普通車']
];
const payloads=[];let count=0;
for(const [desired,cat,i,current,opposite] of entries)for(const user of ['student','general'])for(const plan of ['day','free'])for(const held of [[current],[current,opposite,'原付'],[opposite,current],[current,current,opposite]]){
 const p={desiredVehicles:[desired],currentLicenses:held,occupation:user==='student'?'大学生':'会社員',lessonPlan:plan==='free'?'フリープラン':'デイプラン'};
 const actual=q(p);assert.equal(actual.available,true,JSON.stringify(p));assert.equal(actual.amount,master.catalog[cat].licenseChangeRows[i].prices[plan][user]);assert.equal(actual.optionAmount,0);assert.equal(actual.licenseLabel,master.catalog[cat].licenseChangeRows[i].currentLicenseLabel);payloads.push(p);count++;
}
function pending(p,reason){const actual=q(p);assert.equal(actual.available,false,JSON.stringify(p));assert.equal(actual.amount,'');assert.match(actual.reason,reason);count++;}
pending({desiredVehicles:['限定解除']},/種類/);
pending({desiredVehicles:['四輪限定解除']},/種類/);
pending({desiredVehicles:['二輪限定解除']},/種類/);
pending({desiredVehicles:['MT普通二輪車','限定解除']},/併願/);
pending({desiredVehicles:[entries[0][0],entries[3][0]]},/併願/);
pending({currentLicenses:['AT普通車','MT普通車','AT普通二輪車']},/取得済み/);
pending({currentLicenses:['持っていない','AT普通車']},/持っていない/);
pending({currentLicenses:['MT大型二輪車']},/同じ系統/);
pending({currentLicenses:['AT普通車','不明な免許']},/不明/);
pending({currentLicenses:['普通車','MT普通二輪車']},/未対応/);
pending({currentLicenses:['AT普通車','仮免許']},/不明/);
pending({desiredVehicles:[entries[1][0]],currentLicenses:['AT5t限定準中型車','MT5t限定準中型車','AT普通二輪車']},/複数の審査区分/);
pending({desiredVehicles:[entries[3][0]],currentLicenses:['AT普通二輪車','MT普通二輪車','AT普通車']},/取得済み/);
pending({desiredVehicles:[entries[3][0]],currentLicenses:['AT普通二輪車','AT普通二輪車（小型限定）','AT普通車']},/複数の審査区分/);
for(const options of [['合宿風ハイスピードプラン'],['コミコミプラン'],['スケジュールプラン'],['未登録']])pending({optionPlans:options},/オプション/);
pending({occupation:''},/学生/);pending({lessonPlan:''},/プラン/);pending({priceCourse:'ordinary_mt'},/一致/);
assert.equal(q({desiredVehicles:['四輪限定解除（普通車ＡＴ解除）'],currentLicenses:'ＭＴ普通二輪車、ＡＴ普通車'}).amount,72650);
assert.equal(q({currentLicenses:['at_car','motorcycle_mt']}).amount,72650);
for(const bad of ['',null,0]){vm.runInContext('LIMITED_CHANGE_PRICE_MASTER.limited_ordinary_mt.licenses.at_car.general.free='+JSON.stringify(bad),gas);pending({},/未設定/);}
vm.runInContext('LIMITED_CHANGE_PRICE_MASTER.limited_ordinary_mt.licenses.at_car.general.free=72650',gas);
// Real persistence functions with in-memory sheet boundaries. Preserve original license labels and older rows.
const sheets=new Map();
class Sheet{constructor(headers){this.rows=[copy(headers),headers.map((_,i)=>i?'':'legacy')];}getLastColumn(){return this.rows[0].length;}getLastRow(){return this.rows.length;}getRange(r,c,h=1,w=1){const range={getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>this.rows[r+i-1]?.[c+j-1]??'')),insertCheckboxes:()=>range,setValue:v=>{this.rows[r-1][c-1]=v;return range;}};return range;}appendRow(row){this.rows.push(copy(row));}}
const headers=vm.runInContext('({application:APPLICATION_MANAGEMENT_HEADERS,quote:HEADERS.priceQuotes})',gas);
sheets.set('仮申し込みの人',new Sheet(headers.application));sheets.set('price_quotes',new Sheet(headers.quote));
gas.SpreadsheetApp={getActiveSpreadsheet:()=>({getSheetByName:n=>sheets.get(n)})};
vm.runInContext('refreshApplicationManagementRow_=function(){};syncApplicationMasterRowToMonth_=function(){};',gas);
const original=copy([...sheets.values()].map(s=>s.rows));
const actual=q({});gas.appendApplication('synthetic-limited','fixture',new Date(),fixture,actual,'');gas.appendQuote('synthetic-limited',new Date(),actual);
const app=sheets.get('仮申し込みの人');assert.equal(app.rows[2][app.rows[0].indexOf('所持免許')],fixture.currentLicenses.join('、'));assert.equal(app.rows[2][app.rows[0].indexOf('見積金額')],72650);
assert.deepEqual(copy([...sheets.values()].map(s=>s.rows.slice(0,2))),original);
(async()=>{global.fetch=forbidden;const w=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,'_worker.js'),'utf8')+'\nexport {normalizeApplicationPayload,validateApplicationPayload};').toString('base64'));
 for(const p of payloads){const input=w.normalizeApplicationPayload({...fixture,...p},new Request('https://offline.example.invalid/api/application'));try{w.validateApplicationPayload(input);}catch(e){throw Error(e.code+": "+JSON.stringify(input.desiredVehicles));}assert.equal(gas.recalculateQuote(gas.normalizeSubmissionLists(input)).amount,q(p).amount);}
 console.log(JSON.stringify({ok:true,cases:count,tariffs:36,workerRoundTrips:payloads.length,storage:'original held licenses retained; old rows unchanged',externalRequests:0}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
