(()=>{
'use strict';
const qs=new URLSearchParams(location.search),ME=qs.get('person')||localStorage.getItem('cw-person')||'瑞子';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
const ok=(name,pass,detail='')=>results.push({name,pass:!!pass,detail});
const waitFor=async(fn,ms=8000,step=80)=>{const st=Date.now();while(Date.now()-st<ms){try{const v=fn();if(v)return v}catch(e){}await sleep(step)}return null};
const click=el=>{if(!el)return false;el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true};
async function run(){
  const d=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});localStorage.setItem(`cw-daily-${ME}-${d}`,'1');
  localStorage.setItem('cw-lastpos-v4',JSON.stringify({lat:39.814313,lon:116.577886,accuracy:8,altitude:42,time:Date.now()}));
  await waitFor(()=>!$('#app')?.hidden,5000);
  await waitFor(()=>$('#decisionHub'),8000);
  $('#dailyOk')?.click();
  ok('页面启动',!!$('#app')&&!$('#app').hidden);
  ok('身份标题',document.title.includes(ME),document.title);
  ok('底部导航5项',$$('#bottomNav button[data-view]').length===5,String($$('#bottomNav button[data-view]').length));
  ok('四人卡片',$$('#teamStrip .team-one').length===4,String($$('#teamStrip .team-one').length));
  const ha=$('#homeAvatar'),hb=ha&&(getComputedStyle(ha).backgroundImage||ha.style.backgroundImage);ok('真人头像/头像回退',!!ha&&(hb!=='none'||ha.textContent.trim().length>0),hb||'');
  const payer=$('#expPayer');ok('记账默认付款人',payer?.value===ME,payer?.value||'');
  for(const v of ['today','trip','me','now']){click($(`#bottomNav button[data-view="${v}"]`));await sleep(80);ok(`导航-${v}`,$(`#view-${v}`)?.classList.contains('on'))}
  click($('#sosTop'));await sleep(80);ok('SOS打开',$('#sosOverlay')?.classList.contains('show'));click($('#sosOverlay [data-close="sos"]'));await sleep(50);ok('SOS关闭',!$('#sosOverlay')?.classList.contains('show'));
  click($('#bottomNav button[data-view="map"]'));await waitFor(()=>$('#cwMapCanvas'),3000);ok('地图容器',!!$('#cwMapCanvas'));
  const mapReady=await waitFor(()=>{const s=$('#fullMap')?.dataset.mapState;return s==='ready'||s==='fallback'?s:null},7000);ok('地图不会空白卡死',!!mapReady,mapReady||$('#fullMapStatus')?.textContent||'');
  ok('地图中文快捷项',$$('.cw-map-quick button').length>=5,String($$('.cw-map-quick button').length));
  ok('地图本人头像',!!$('.cw-person-marker.me'));
  click($('#mapOverlay [data-mapact="route"]'));await sleep(1000);ok('今日路线按钮',!!$('#cwMapRoute'));
  click($('#closeMapBtn'));await sleep(80);ok('地图关闭',!$('#mapOverlay')?.classList.contains('show'));
  ok('现在去哪入口',!!$('#decisionHub')&&$$('#decisionHub [data-dec-cat]').length===6,String($$('#decisionHub [data-dec-cat]').length));
  click($('#decisionHub [data-dec-cat="photo"]'));await sleep(100);ok('摄影推荐弹层',$('#decisionOverlay')?.classList.contains('show'));click($('#decisionOverlay [data-close-decision]'));await sleep(50);
  click($('#bottomNav button[data-view="trip"]'));await sleep(80);ok('旅途日志分类',$$('#logCats [data-logcat]').length>=5,String($$('#logCats [data-logcat]').length));ok('相册上传',!!$('#uploadPhotos')&&!!$('#photoInput'));ok('账本表单',!!$('#expenseForm')&&!!$('#expAmount'));ok('预订表单',!!$('#bookingForm'));
  click($('#uploadPhotos'));await sleep(20);ok('无照片上传保护',$('#toast')?.classList.contains('show'));
  $('#expAmount').value='';$('#expenseForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await sleep(20);ok('空金额记账保护',$('#toast')?.classList.contains('show'));
  click($('#bottomNav button[data-view="me"]'));await sleep(100);ok('个人资料',!!$('#nicknameInput')&&!!$('#changeAvatar')&&!!$('#saveProfile'));ok('账本管理',!!$('#ledgerList'));
  ok('未读控制',!!$('#unreadControl')&&!!$('#readAll')&&!!$('#jumpUnread'));
  ok('微信式红点位置',$('#navBadge')?.parentElement?.dataset.view==='me',$('#navBadge')?.parentElement?.dataset.view||'');
  const editBtn=$('#ledgerList [data-ledger="edit-exp"],#ledgerList [data-ledger="edit-repay"]');if(editBtn){click(editBtn);await sleep(80);ok('账单逐笔编辑',$('#editOverlay')?.classList.contains('show'));click($('#editOverlay [data-close="edit"]'));}else ok('账单逐笔编辑',true,'当前没有可编辑记录');
  const ids=$$('[id]').map(x=>x.id),dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];ok('无重复DOM ID',dup.length===0,dup.join(','));
  ok('无PIN入口',!/PIN|pin不正确|PIN不正确/.test(document.body.innerText));
  const errs=(window.__cwErrors||[]).filter(x=>x&&!/ResizeObserver loop/i.test(x));ok('无未捕获脚本错误',errs.length===0,errs.join(' | '));
  const fail=results.filter(x=>!x.pass),pre=document.createElement('pre');pre.id='qaResult';pre.dataset.status=fail.length?'fail':'pass';pre.style.cssText='position:fixed;left:-9999px;top:0;white-space:pre-wrap';pre.textContent=(fail.length?'QA_FAIL':'QA_PASS')+'|'+ME+'|'+results.map(x=>`${x.pass?'✓':'✗'}${x.name}${x.detail?'('+x.detail+')':''}`).join('|');document.body.appendChild(pre);
  if(fail.length)console.error(pre.textContent);else console.log(pre.textContent);
}
run().catch(e=>{const pre=document.createElement('pre');pre.id='qaResult';pre.dataset.status='fail';pre.textContent='QA_FAIL|'+ME+'|probe exception:'+String(e?.stack||e);document.body.appendChild(pre);console.error(e)});
})();