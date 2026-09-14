(()=>{
'use strict';
if(new URLSearchParams(location.search).get('qa')!=='1')return;
const TEAM=['瑞子','普子','航子','辉子'];
const qaPerson=new URLSearchParams(location.search).get('person')||'瑞子';
sessionStorage.setItem('cw-admin',qaPerson==='瑞子'?'1':'0');
window.__qaProfileCalls=[];
const now=new Date().toISOString();
const svgAvatar=(person,i)=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="hsl(${i*70+150} 55% 45%)"/><text x="40" y="51" font-size="34" text-anchor="middle" fill="white">${person[0]}</text></svg>`)}`;
const positions=TEAM.map((person,i)=>({trip_slug:'chuanxi2026',person,lat:39.814313+i*.0003,lon:116.577886+i*.00025,accuracy:7+i,altitude:42+i,updated_at:now,status:'在线'}));
const profiles=TEAM.map((person,i)=>({trip_slug:'chuanxi2026',person,nickname:person+'昵称',role:{瑞子:'酒店 / 账本',普子:'攻略 / 路况',航子:'机票 / 航班',辉子:'租车 / 车务'}[person],last_seen:now,updated_at:now,avatar_url:svgAvatar(person,i)}));
const expenses=TEAM.map((payer,i)=>({id:'qa-exp-'+i,trip_slug:'chuanxi2026',category:i===0?'住宿':i===1?'吃饭':i===2?'机票':'油费',amount:[400,286,6320,350][i],note:'QA测试账单',payer,participants:[...TEAM],status:'paid',created_at:now}));
const baseState={expenses,repayments:[],person_positions:positions,trip_state:{trip_slug:'chuanxi2026',fuel_level:46,current_driver:'辉子'},milestones:[],memories:[],parking:null,bookings:[],emergency_contacts:[],preferences:{trip_slug:'chuanxi2026',trip_budget:12000,active_driver:'辉子'},profiles,logs:[],ledger_acks:[]};
let trash={expenses:[{archive_id:'qa-trash-1',original_id:'qa-old-exp',trip_slug:'chuanxi2026',category:'吃饭',amount:88,note:'误删测试',payer:'普子',participants:[...TEAM],deleted_at:now}],repayments:[]};
try{const g=navigator.geolocation;if(g){g.watchPosition=(ok)=>{const id=setTimeout(()=>ok({coords:{latitude:39.814313,longitude:116.577886,accuracy:8,altitude:42,speed:0,heading:0},timestamp:Date.now()}),25);return id};g.getCurrentPosition=(ok)=>setTimeout(()=>ok({coords:{latitude:39.814313,longitude:116.577886,accuracy:8,altitude:42,speed:0,heading:0},timestamp:Date.now()}),25);g.clearWatch=id=>clearTimeout(id)}}catch(e){}
const realFetch=window.fetch.bind(window);const res=(obj,status=200)=>Promise.resolve(new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json'}}));
window.fetch=async(input,init={})=>{const url=String(typeof input==='string'?input:input?.url||'');let b={};try{b=JSON.parse(init.body||'{}')}catch(e){}
  if(url.includes('/functions/v1/trip-profile')){const a=b.action;window.__qaProfileCalls.push(a||'unknown');if(a==='list_profiles')return res({profiles});if(a==='update_profile'){const i=profiles.findIndex(x=>x.person===b.payload?.person);if(i>=0)profiles[i]={...profiles[i],nickname:b.payload.nickname,role:b.payload.role,updated_at:new Date().toISOString()};return res({ok:true,profile:profiles[i]})}if(a==='upload_avatar'){const i=profiles.findIndex(x=>x.person===b.payload?.person);if(i>=0)profiles[i]={...profiles[i],avatar_url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',updated_at:new Date().toISOString()};return res({ok:true,profile:profiles[i]})}return res({ok:true})}
  if(url.includes('/functions/v1/trip-sync')){const a=b.action;if(a==='get_state')return res({...baseState,profiles:[...profiles]});if(a==='heartbeat'||a==='update_person_position'||a==='acknowledge_expense'||a==='update_profile'||a==='upload_avatar'||a==='add_expense'||a==='update_expense'||a==='delete_expense'||a==='add_repayment'||a==='update_repayment'||a==='delete_repayment'||a==='attach_receipt')return res({ok:true,row:{id:'qa-row'}});return res({ok:true})}
  if(url.includes('/functions/v1/trip-trash')){if(b.action==='list_trash')return res(trash);if(b.action==='restore_expense'){trash.expenses=[];return res({ok:true,row:{id:'qa-old-exp'}})}if(b.action==='restore_repayment')return res({ok:true,row:{id:'qa-old-rp'}});return res({ok:true})}
  if(url.includes('api.open-meteo.com'))return res({current:{temperature_2m:21,apparent_temperature:20,weather_code:0,precipitation:0,wind_speed_10m:8},daily:{time:['2026-10-02'],weather_code:[0],temperature_2m_max:[18],temperature_2m_min:[9],precipitation_probability_max:[10],wind_speed_10m_max:[15]}});
  return realFetch(input,init)};
window.__CW_QA_MOCK=1;
})();