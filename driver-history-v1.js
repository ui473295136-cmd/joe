(()=>{
  'use strict';
  const TEAM=['瑞子','普子','航子','辉子'];
  const ME=new URLSearchParams(location.search).get('person')||localStorage.getItem('cw-person')||'瑞子';
  if(!TEAM.includes(ME))return;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function p(date){return window.CWChinaClock?.parts?window.CWChinaClock.parts(date):(()=>{const o={};new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).forEach(x=>{if(x.type!=='literal')o[x.type]=x.value});return o})()}
  function dateLabel(t){const x=p(new Date(t));return `${Number(x.month)}月${Number(x.day)}日`}
  function hm(t){const x=p(new Date(t));return `${x.hour}:${x.minute}`}
  function duration(start,end){let sec=Math.max(0,((end?new Date(end).getTime():Date.now())-new Date(start).getTime())/1000);const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);if(h&&m)return `${h}h${m}m`;if(h)return `${h}h`;return `${Math.max(1,m)}m`}
  function read(){try{return JSON.parse(localStorage.getItem(`cw-social-cache-${ME}`)||'null')?.data||null}catch{return null}}
  function render(){
    const box=$('#cwDriverBox');if(!box)return;
    const data=read(),rows=(data?.driver_sessions||[]).slice().sort((a,b)=>new Date(b.started_at)-new Date(a.started_at));
    const profiles=data?.profiles||[];const pname=person=>profiles.find(x=>x.person===person)?.nickname||person;const pimg=person=>profiles.find(x=>x.person===person)?.avatar_url||'';
    let host=$('#cwDriverHistory');if(!host){host=document.createElement('div');host.id='cwDriverHistory';host.className='cw-driver-history';box.appendChild(host)}
    const sig=rows.map(x=>`${x.id||''}|${x.person}|${x.started_at}|${x.ended_at||''}`).join(';');if(host.dataset.sig===sig)return;host.dataset.sig=sig;
    if(!rows.length){host.innerHTML='<div class="cw-driver-history-head"><b>驾驶记录</b><span>会记录谁在什么时候开过</span></div><div class="cw-driver-history-empty">还没有驾驶记录</div>';return}
    host.innerHTML=`<div class="cw-driver-history-head"><b>驾驶记录</b><span>起止时间 · 实际时长</span></div><div class="cw-driver-history-list">${rows.map((x,i)=>{const startDate=dateLabel(x.started_at),endDate=x.ended_at?dateLabel(x.ended_at):startDate,cross=endDate!==startDate;const range=x.ended_at?(cross?`${startDate} ${hm(x.started_at)} → ${endDate} ${hm(x.ended_at)}`:`${startDate} ${hm(x.started_at)}–${hm(x.ended_at)}`):`${startDate} ${hm(x.started_at)}–现在`;const img=pimg(x.person);return `<div class="cw-driver-history-row ${x.ended_at?'':'live'} ${i>=5?'is-extra':''}"><span class="cw-driver-history-avatar">${img?`<img src="${esc(img)}" alt="${esc(pname(x.person))}" style="width:100%;height:100%;object-fit:cover">`:esc(x.person?.[0]||'驾')}</span><div class="cw-driver-history-main"><b>${esc(pname(x.person))}${x.ended_at?'':' · 正在开'}</b><span>${esc(range)}</span></div><span class="cw-driver-history-duration">${duration(x.started_at,x.ended_at)}</span></div>`}).join('')}</div>${rows.length>5?`<button type="button" class="cw-driver-history-more" data-driver-history-more>查看全部驾驶记录（${rows.length}）</button>`:''}`;
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-driver-history-more]');if(!b)return;const h=$('#cwDriverHistory');if(!h)return;const on=h.classList.toggle('expanded');b.textContent=on?'收起驾驶记录':`查看全部驾驶记录（${h.querySelectorAll('.cw-driver-history-row').length}）`});
  const start=()=>{const box=$('#cwDriverBox');if(!box)return setTimeout(start,120);new MutationObserver(()=>setTimeout(render,0)).observe(box,{childList:true,subtree:true});render();setInterval(render,15000)};
  start();
})();
