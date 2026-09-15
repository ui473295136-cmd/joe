(()=>{
'use strict';
const DAYS=[
 {date:'2026-10-02',route:'天府机场 → 雅安',km:'185–195km',drive:'3.5–4小时'},
 {date:'2026-10-03',route:'雅安 → 泸定 → 康定 → 折多山 → 新都桥',km:'270–290km',drive:'6.5–8小时'},
 {date:'2026-10-04',route:'新都桥 → 塔公 → 八美 → 丹巴中路藏寨',km:'150–170km',drive:'4–5小时'},
 {date:'2026-10-05',route:'丹巴 → 小金 → 四姑娘山双桥沟',km:'110–130km',drive:'3–4小时'},
 {date:'2026-10-06',route:'四姑娘山 → 卧龙 → 映秀 → 都江堰 → 天府机场',km:'270–300km',drive:'8–10小时'},
 {date:'2026-10-07',route:'机场酒店 → 还车 → 航站楼',km:'5–20km',drive:'20–40分钟'}
];
const START=DAYS[0].date,END=DAYS[DAYS.length-1].date,$=s=>document.querySelector(s);
function today(){return window.CWTripStageV2?.chinaDate?.()||new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})}
function selectedIndex(){const n=Number($('#simpleItinerary .day-chip.on')?.dataset.day);return Number.isInteger(n)&&n>=0&&n<DAYS.length?n:0}
function cnFull(date){const [,m,d]=date.split('-');return`${Number(m)}月${String(d).padStart(2,'0')}日`}
function contextFor(date,i){const now=today();if(date===now)return{eyebrow:`旅途中 · Day ${i+1}`,label:'今日行程'};if(now<START)return{eyebrow:'行程计划',label:'行程计划'};if(now>END||date<now)return{eyebrow:'行程回顾',label:'行程回顾'};return{eyebrow:`后续 · Day ${i+1}`,label:'后续行程'}}
function render(i=selectedIndex()){
 const d=DAYS[i],title=$('#view-today .page-title');if(!d||!title)return;
 const ctx=contextFor(d.date,i),ey=title.querySelector('.eyebrow'),h=title.querySelector('h1'),p=title.querySelector('p');
 const hText=`${cnFull(d.date)} · ${ctx.label}`,pText=`${d.route} | ${d.km} | 约${d.drive}`;
 if(ey&&ey.textContent!==ctx.eyebrow)ey.textContent=ctx.eyebrow;
 if(h&&h.textContent!==hText)h.textContent=hText;
 if(p&&p.textContent!==pText)p.textContent=pText;
 title.dataset.selectedDay=String(i+1);
 title.dataset.selectedDate=d.date;
}
function init(){const box=$('#simpleItinerary'),title=$('#view-today .page-title');if(!box||!title)return setTimeout(init,80);render();new MutationObserver(()=>queueMicrotask(()=>render())).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});document.addEventListener('click',e=>{const b=e.target.closest?.('#simpleItinerary [data-day]');if(!b)return;const i=Number(b.dataset.day);setTimeout(()=>render(i),0);setTimeout(()=>render(i),160)},true);window.addEventListener('focus',()=>render());document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});document.documentElement.classList.add('cw-itinerary-heading-ready')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();