(()=>{
'use strict';
const ME=new URLSearchParams(location.search).get('person')||localStorage.getItem('cw-person')||'瑞子';
const DAYS=[
 {date:'2026-10-02',km:190,points:[['16:00','天府国际机场'],['17:15','天府国际机场'],['19:00','服务区'],['21:00','雅安']]},
 {date:'2026-10-03',km:280,points:[['06:00','雅安'],['08:30','泸定'],['10:30','康定'],['13:00','折多山'],['15:00','新都桥'],['18:00','新都桥']]},
 {date:'2026-10-04',km:160,points:[['07:00','新都桥'],['09:30','塔公'],['11:45','八美'],['16:00','丹巴'],['17:00','中路藏寨']]},
 {date:'2026-10-05',km:120,points:[['06:30','丹巴'],['07:45','小金'],['09:45','双桥沟'],['13:30','双桥沟'],['16:30','双桥沟'],['17:00','四姑娘山镇']]},
 {date:'2026-10-06',km:285,points:[['05:30','四姑娘山镇'],['08:30','卧龙'],['10:00','映秀'],['11:00','都江堰'],['16:00','天府国际机场']]},
 {date:'2026-10-07',km:12,points:[['05:15','机场酒店'],['05:40','机场酒店'],['06:10','还车点'],['06:40','天府国际机场']]}
];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function cnDate(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})}
function cnHM(){return new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false})}
function fmt(t){return t?new Date(t).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}):'—'}
function money(n){return'¥'+Number(n||0).toLocaleString('zh-CN',{maximumFractionDigits:2})}
function state(){try{return JSON.parse(localStorage.getItem(`cw-assist-state-${ME}`)||'null')?.data||{progress:[],daily_stats:{}}}catch{return{progress:[],daily_stats:{}}}}
function summaryReady(d){const today=cnDate();return d<today||(d===today&&cnHM()>='20:00')}
function decorate(di){const box=$('#simpleItinerary'),d=DAYS[di];if(!box||!d)return;const st=state(),today=cnDate();box.querySelectorAll('.simple-stop').forEach((row,i)=>{row.querySelector('.cw-progress-actions')?.remove();const rec=(st.progress||[]).find(x=>x.day_date===d.date&&Number(x.stop_index)===i),wrap=document.createElement('div');wrap.className='cw-progress-actions';let html='';if(rec?.arrived_at)html+=`<span class="cw-progress-stamp">到达 ${fmt(rec.arrived_at)}</span>`;if(rec?.departed_at)html+=`<span class="cw-progress-stamp">出发 ${fmt(rec.departed_at)}</span>`;if(d.date===today){if(!rec?.arrived_at)html+=`<button type="button" class="cw-progress-btn primary" data-progress-kind="arrival" data-progress-day="${d.date}" data-progress-index="${i}">记录到达</button>`;else if(!rec?.departed_at)html+=`<button type="button" class="cw-progress-btn" data-progress-kind="departure" data-progress-day="${d.date}" data-progress-index="${i}">记录出发</button>`}if(html){wrap.innerHTML=html;row.querySelector('div')?.appendChild(wrap)}});
 $('#cwDailySummary')?.remove();const card=document.createElement('details');card.id='cwDailySummary';card.className='card cw-summary';if(!summaryReady(d.date)){card.innerHTML='<summary><div><b>这一天</b><span>当天结束后自动生成</span></div><span>›</span></summary><div class="cw-future-summary">会汇总已到达节点、记账金额和照片数量。</div>';box.appendChild(card);return}
 const rows=(st.progress||[]).filter(x=>x.day_date===d.date&&x.arrived_at),max=rows.reduce((m,x)=>Math.max(m,Number(x.stop_index)),0),ratio=rows.length?Math.min(1,max/Math.max(1,d.points.length-1)):0,km=Math.round(d.km*ratio),ds=st.daily_stats?.[d.date]||{expense_total:0,expense_count:0,photo_count:0},deps=(st.progress||[]).filter(x=>x.day_date===d.date&&x.departed_at).sort((a,b)=>new Date(a.departed_at)-new Date(b.departed_at)),arrs=[...rows].sort((a,b)=>new Date(b.arrived_at)-new Date(a.arrived_at));card.innerHTML=`<summary><div><b>这一天</b><span>${rows.length}/${d.points.length} 个节点 · 约 ${km}km</span></div><span>展开</span></summary><div class="cw-summary-body"><div><span>路线完成</span><b>${rows.length}/${d.points.length} 个节点</b></div><div><span>估算里程</span><b>约 ${km} km</b></div><div><span>当天记账</span><b>${money(ds.expense_total)} · ${ds.expense_count||0}笔</b></div><div><span>上传照片</span><b>${ds.photo_count||0} 张</b></div><div><span>首次记录出发</span><b>${deps[0]?fmt(deps[0].departed_at):'—'}</b></div><div><span>最后记录到达</span><b>${arrs[0]?fmt(arrs[0].arrived_at):'—'}</b></div></div><div class="cw-next-note">里程按已记录行程节点估算，不冒充车辆真实里程。</div>`;box.appendChild(card)}
function current(){return Number($('#simpleItinerary .day-chip.on')?.dataset.day||0)}
document.addEventListener('click',e=>{const d=e.target.closest?.('[data-day]');if(!d)return;const i=Number(d.dataset.day);setTimeout(()=>decorate(i),260)},true);
const wait=()=>{if(!$('#simpleItinerary'))return setTimeout(wait,120);setTimeout(()=>decorate(current()),220)};wait();
window.addEventListener('focus',()=>setTimeout(()=>decorate(current()),120));
})();