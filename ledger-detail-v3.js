(()=>{
'use strict';
const TEAM=['瑞子','普子','航子','辉子'];
const FN='https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-sync';
const TRIP='chuanxi2026';
const ME=new URLSearchParams(location.search).get('person')||localStorage.getItem('cw-person')||'瑞子';
if(!TEAM.includes(ME))return;
const $=s=>document.querySelector(s);
let S=null,renderQueued=false,detailCtx=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cents=n=>Math.round(Number(n||0)*100);
const moneyCt=ct=>'¥'+(Number(ct||0)/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const money=n=>'¥'+Number(n||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const when=t=>t?new Date(t).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'—';
function profileName(p){
  try{return window.CWProfiles?.get?.(p)?.nickname||p}catch{return p}
}
function paidExpenses(){return (S?.expenses||[]).filter(e=>e.status!=='budget')}
function normalizeParts(arr){
  const src=Array.isArray(arr)&&arr.length?arr:TEAM;
  const set=new Set(src.filter(p=>TEAM.includes(p)));
  return TEAM.filter(p=>set.has(p));
}
function shareMap(e){
  const ps=normalizeParts(e.participants),amt=cents(e.amount),out={};
  if(!ps.length||amt<=0)return out;
  const base=Math.floor(amt/ps.length),rem=amt%ps.length;
  ps.forEach((p,i)=>out[p]=base+(i<rem?1:0));
  return out;
}
function pairLedger(from,to){
  const rows=[];
  let net=0;
  for(const e of paidExpenses()){
    const shares=shareMap(e),cat=e.category||'其他',note=e.note||cat;
    if(e.payer===to&&from!==to&&shares[from]){
      const ct=shares[from];net+=ct;
      rows.push({ct,kind:'expense',label:`${cat} · ${note}`,meta:`${profileName(to)}垫付 ${money(e.amount)} · ${normalizeParts(e.participants).length}人分摊`,time:e.created_at});
    }
    if(e.payer===from&&from!==to&&shares[to]){
      const ct=-shares[to];net+=ct;
      rows.push({ct,kind:'offset',label:`${cat} · ${note}`,meta:`${profileName(from)}垫付，抵扣对 ${profileName(to)} 的欠款`,time:e.created_at});
    }
  }
  for(const r of S?.repayments||[]){
    const ct=cents(r.amount);if(ct<=0)continue;
    if(r.from_person===from&&r.to_person===to){
      net-=ct;rows.push({ct:-ct,kind:'repay',label:r.note||'已还款',meta:`${profileName(from)} → ${profileName(to)}`,time:r.created_at});
    }else if(r.from_person===to&&r.to_person===from){
      net+=ct;rows.push({ct,kind:'repay-reverse',label:r.note||'对方已还款',meta:`${profileName(to)} → ${profileName(from)}，形成反向抵扣`,time:r.created_at});
    }
  }
  return{from,to,net,rows};
}
function pairwisePlan(){
  const out=[];
  for(let i=0;i<TEAM.length;i++)for(let j=i+1;j<TEAM.length;j++){
    const a=TEAM[i],b=TEAM[j],q=pairLedger(a,b);
    if(q.net>0)out.push({from:a,to:b,ct:q.net});
    else if(q.net<0)out.push({from:b,to:a,ct:-q.net});
  }
  return out;
}
function summary(p){
  const ex=paidExpenses();
  const paidCt=ex.filter(e=>e.payer===p).reduce((s,e)=>s+cents(e.amount),0);
  const shareCt=ex.reduce((s,e)=>s+(shareMap(e)[p]||0),0);
  const sentCt=(S?.repayments||[]).filter(r=>r.from_person===p).reduce((s,r)=>s+cents(r.amount),0);
  const recvCt=(S?.repayments||[]).filter(r=>r.to_person===p).reduce((s,r)=>s+cents(r.amount),0);
  const pl=pairwisePlan(),gets=pl.filter(x=>x.to===p),owes=pl.filter(x=>x.from===p);
  return{paidCt,shareCt,sentCt,recvCt,outflowCt:paidCt+sentCt-recvCt,gets,owes,getCt:gets.reduce((s,x)=>s+x.ct,0),oweCt:owes.reduce((s,x)=>s+x.ct,0)};
}
function ackSet(id){return new Set((S?.ledger_acks||[]).filter(a=>a.item_type==='expense'&&a.item_id===id).map(a=>a.person))}
function pendingCount(p){return paidExpenses().filter(e=>e.payer!==p&&normalizeParts(e.participants).includes(p)&&!ackSet(e.id).has(p)).length}
function cardHtml(p){
  const m=summary(p),cards=[
    ['outflow','我已花',m.outflowCt,'实际现金净支出'],
    ['share','我的消费',m.shareCt,'按参与人精确分摊'],
    ['get','我该收',m.getCt,'按人与人逐笔结算','recv'],
    ['owe','我该付',m.oweCt,'按人与人逐笔结算','pay']
  ];
  return cards.map(([kind,label,ct,tip,cls=''])=>`<div class="${cls}" data-ledger-kind="${kind}" data-ledger-person="${esc(p)}" role="button" tabindex="0" aria-label="查看${label}明细"><span>${label}</span><b>${moneyCt(ct)}</b><em>${tip} · 明细 ›</em></div>`).join('');
}
function settlementHtml(p){
  const m=summary(p),rows=[
    ...m.gets.map(x=>`<div class="settle-line" data-ledger-pair="${esc(x.from)}|${esc(x.to)}" role="button" tabindex="0"><span>${esc(profileName(x.from))} 应付给我 <small>查看明细 ›</small></span><b>${moneyCt(x.ct)}</b></div>`),
    ...m.owes.map(x=>`<div class="settle-line" data-ledger-pair="${esc(x.from)}|${esc(x.to)}" role="button" tabindex="0"><span>我应付给 ${esc(profileName(x.to))} <small>查看明细 ›</small></span><b>${moneyCt(x.ct)}</b></div>`)
  ];
  return rows.join('')||'<div class="settle-line"><span>当前无需结算</span><b>✓</b></div>';
}
function patchFinanceTip(){
  const host=$('#personalTips');if(!host||!S)return;
  const tip=[...host.querySelectorAll('.tip')].find(x=>x.querySelector('b')?.textContent.trim()==='账本');
  if(!tip)return;
  const m=summary(ME),pc=pendingCount(ME),bits=[];
  if(m.getCt)bits.push(`应收 ${moneyCt(m.getCt)}`);
  if(m.oweCt)bits.push(`应付 ${moneyCt(m.oweCt)}`);
  if(!bits.length)bits.push('当前无需转账');
  if(pc)bits.push(`另有 ${pc} 笔共同支出待确认`);
  const p=tip.querySelector('p');if(p)p.textContent=bits.join('；');
}
function render(){
  renderQueued=false;if(!S)return;
  for(const sel of ['#homeMoney','#meMoney']){
    const el=$(sel);if(el&&el.querySelector('[data-ledger-kind]')===null)el.innerHTML=cardHtml(ME);
    else if(el){
      const expected=cardHtml(ME);
      if(el.innerHTML!==expected)el.innerHTML=expected;
    }
  }
  const lines=$('#settlementLines');if(lines){const html=settlementHtml(ME);if(lines.innerHTML!==html)lines.innerHTML=html}
  patchFinanceTip();
  document.documentElement.classList.add('cw-ledger-detail-v3-ready');
}
function schedule(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(render)}
function ensureOverlay(){
  if($('#ledgerDetailOverlay'))return;
  const style=document.createElement('style');style.id='cwLedgerDetailV3Style';style.textContent=`
.money4>[data-ledger-kind]{position:relative;cursor:pointer;min-height:82px;padding-bottom:25px;transition:transform .12s ease,box-shadow .12s ease}.money4>[data-ledger-kind]:active{transform:scale(.985)}.money4>[data-ledger-kind]:focus-visible,.settle-line[data-ledger-pair]:focus-visible{outline:3px solid #38b4c4;outline-offset:2px}.money4>[data-ledger-kind] em{position:absolute;left:10px;right:8px;bottom:8px;font-size:7px;font-style:normal;color:#91a2a9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.settle-line[data-ledger-pair]{cursor:pointer;align-items:center}.settle-line[data-ledger-pair] small{display:block;margin-top:3px;color:#91a2a9;font-size:7px;font-weight:500}.ledger-detail-modal{width:min(640px,100%);max-height:min(86vh,780px);overflow:auto;background:#fff;border-radius:20px;padding:16px;box-shadow:0 28px 80px #001c2d66}.ledger-detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;position:sticky;top:-16px;margin:-16px -16px 10px;padding:16px;background:#fffffff5;backdrop-filter:blur(14px);border-bottom:1px solid var(--line);z-index:2}.ledger-detail-head h2{margin:2px 0;font-size:19px}.ledger-detail-head p{margin:4px 0 0;color:var(--muted);font-size:9px;line-height:1.5}.ledger-detail-head button{border:0;background:#edf3f4;width:38px;height:38px;border-radius:50%;font-size:20px;color:var(--ink);flex:0 0 auto}.ledger-detail-total{border:1px solid var(--line);border-radius:14px;padding:12px;background:linear-gradient(135deg,#f7fbfb,#fff);margin-bottom:10px}.ledger-detail-total span{display:block;font-size:9px;color:var(--muted)}.ledger-detail-total b{display:block;font-size:24px;margin-top:4px}.ledger-detail-note{font-size:9px;line-height:1.6;color:#607d87;background:#f3f7f8;border-radius:10px;padding:9px;margin-bottom:10px}.ledger-detail-group{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:9px 0}.ledger-detail-group>header{display:flex;justify-content:space-between;gap:10px;padding:10px 11px;background:#f7fafb;border-bottom:1px solid var(--line)}.ledger-detail-group>header b{font-size:11px}.ledger-detail-group>header span{font-size:11px;font-weight:900}.ledger-detail-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px 11px;border-bottom:1px solid #edf2f3}.ledger-detail-row:last-child{border-bottom:0}.ledger-detail-row b{font-size:10px}.ledger-detail-row p{margin:3px 0 0;color:var(--muted);font-size:8px;line-height:1.45}.ledger-detail-row strong{font-size:11px;white-space:nowrap}.ledger-detail-row strong.minus{color:#2c7b67}.ledger-detail-empty{padding:18px;text-align:center;color:var(--muted);font-size:10px}@media(max-width:560px){.money4{grid-template-columns:repeat(2,1fr)!important}.ledger-detail-modal{align-self:end;max-height:88vh;border-radius:20px 20px 0 0;margin:0 -10px -10px;width:calc(100% + 20px)}#ledgerDetailOverlay{place-items:end center}}`;
  document.head.appendChild(style);
  const ov=document.createElement('div');ov.id='ledgerDetailOverlay';ov.className='overlay';ov.setAttribute('aria-hidden','true');ov.innerHTML='<div class="ledger-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ledgerDetailTitle"><div class="ledger-detail-head"><div><span class="eyebrow">账目明细</span><h2 id="ledgerDetailTitle">账目明细</h2><p id="ledgerDetailSub"></p></div><button type="button" data-ledger-close aria-label="关闭">×</button></div><div id="ledgerDetailBody"></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-ledger-close]'))closeDetail()});
}
function openOverlay(title,sub,html,ctx){
  ensureOverlay();detailCtx=ctx||null;
  $('#ledgerDetailTitle').textContent=title;$('#ledgerDetailSub').textContent=sub||'';$('#ledgerDetailBody').innerHTML=html;
  const ov=$('#ledgerDetailOverlay');ov.classList.add('show');ov.setAttribute('aria-hidden','false');
}
function closeDetail(){const ov=$('#ledgerDetailOverlay');if(!ov)return;ov.classList.remove('show');ov.setAttribute('aria-hidden','true');detailCtx=null}
function rowHtml(label,meta,ct,signMode='normal'){
  const negative=ct<0,shown=(negative?'-':signMode==='plus'&&ct>0?'+':'')+moneyCt(Math.abs(ct));
  return `<div class="ledger-detail-row"><div><b>${esc(label)}</b><p>${esc(meta||'')}</p></div><strong class="${negative?'minus':''}">${shown}</strong></div>`;
}
function outflowDetail(p){
  const m=summary(p),rows=[];
  for(const e of paidExpenses().filter(e=>e.payer===p))rows.push(rowHtml(`${e.category||'其他'} · ${e.note||e.category||'支出'}`,`${when(e.created_at)} · 实际付款人：${profileName(p)}`,cents(e.amount),'plus'));
  for(const r of S?.repayments||[]){
    if(r.from_person===p)rows.push(rowHtml(r.note||'还款',`${when(r.created_at)} · ${profileName(p)} → ${profileName(r.to_person)}`,cents(r.amount),'plus'));
    if(r.to_person===p)rows.push(rowHtml(r.note||'收到还款',`${when(r.created_at)} · ${profileName(r.from_person)} → ${profileName(p)} · 收到的钱从现金净支出中扣除`,-cents(r.amount)));
  }
  return `<div class="ledger-detail-total"><span>我已花＝我实际付款＋我已还款－我收到的还款</span><b>${moneyCt(m.outflowCt)}</b></div><div class="ledger-detail-note">这里统计的是“实际现金净支出”，不是最终应该由你承担的消费。最终个人承担金额请看“我的消费”。</div><div class="ledger-detail-group"><header><b>现金流水明细</b><span>${rows.length}笔</span></header>${rows.join('')||'<div class="ledger-detail-empty">暂无现金流水</div>'}</div>`;
}
function shareDetail(p){
  const m=summary(p),rows=[];
  for(const e of paidExpenses()){
    const sm=shareMap(e),ct=sm[p]||0;if(!ct)continue;
    const ps=normalizeParts(e.participants);
    rows.push(rowHtml(`${e.category||'其他'} · ${e.note||e.category||'消费'}`,`${when(e.created_at)} · 总额 ${money(e.amount)} · ${ps.length}人分摊 · 付款人 ${profileName(e.payer)}`,ct));
  }
  return `<div class="ledger-detail-total"><span>我的消费＝所有我参与账单中，我个人应承担的份额</span><b>${moneyCt(m.shareCt)}</b></div><div class="ledger-detail-note">按“分”精确分摊，遇到不能整除的金额，余下的 1 分会按固定成员顺序分配，确保所有人的消费合计严格等于总账金额。</div><div class="ledger-detail-group"><header><b>个人消费明细</b><span>${rows.length}笔</span></header>${rows.join('')||'<div class="ledger-detail-empty">暂无个人消费</div>'}</div>`;
}
function pairRowsHtml(from,to){
  const q=pairLedger(from,to),rows=q.rows.map(r=>rowHtml(r.label,`${when(r.time)} · ${r.meta}`,r.ct));
  return `<div class="ledger-detail-group"><header><b>${esc(profileName(from))} → ${esc(profileName(to))}</b><span>${q.net>=0?moneyCt(q.net):'-'+moneyCt(-q.net)}</span></header>${rows.join('')||'<div class="ledger-detail-empty">暂无构成明细</div>'}</div>`;
}
function settlementDetail(p,kind){
  const m=summary(p),items=kind==='get'?m.gets:m.owes,total=kind==='get'?m.getCt:m.oweCt,title=kind==='get'?'我该收':'我该付';
  const groups=items.map(x=>pairRowsHtml(x.from,x.to)).join('');
  return `<div class="ledger-detail-total"><span>${title}＝逐人保留原始债权关系后，再扣除双方已经发生的还款</span><b>${moneyCt(total)}</b></div><div class="ledger-detail-note">这里不再把四个人的债务做“全局轧差/自动转移”。谁替谁垫付，就保留谁欠谁，因此不会再出现“普子本来欠瑞子，却被系统转成航子欠瑞子”的情况。</div>${groups||'<div class="ledger-detail-empty">当前没有需要结算的金额</div>'}`;
}
function openKind(kind,p=ME){
  const titleMap={outflow:'我已花明细',share:'我的消费明细',get:'我该收明细',owe:'我该付明细'};
  const html=kind==='outflow'?outflowDetail(p):kind==='share'?shareDetail(p):settlementDetail(p,kind);
  openOverlay(titleMap[kind]||'账目明细',`${profileName(p)} · 所有数字均来自当前云端账本`,html,{kind,p});
}
function openPair(from,to){
  const q=pairLedger(from,to),actual=q.net>=0?`${profileName(from)} 应付 ${profileName(to)}`:`${profileName(to)} 应付 ${profileName(from)}`;
  openOverlay('结算关系明细',`${actual} · 当前净额 ${moneyCt(Math.abs(q.net))}`,`<div class="ledger-detail-total"><span>双方当前净结算额</span><b>${moneyCt(Math.abs(q.net))}</b></div><div class="ledger-detail-note">正向垫付会增加欠款；双方反向垫付或已经发生的还款会自动抵扣。</div>${pairRowsHtml(from,to)}`,{from,to});
}
function handleOpen(target){
  const card=target.closest?.('[data-ledger-kind]');if(card){openKind(card.dataset.ledgerKind,card.dataset.ledgerPerson||ME);return true}
  const pair=target.closest?.('[data-ledger-pair]');if(pair){const [from,to]=pair.dataset.ledgerPair.split('|');openPair(from,to);return true}
  return false;
}
document.addEventListener('click',e=>handleOpen(e.target));
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&handleOpen(e.target)){e.preventDefault()}if(e.key==='Escape')closeDetail()});
window.addEventListener('cw:state',e=>{if(e.detail?.state){S=e.detail.state;schedule()}});
window.addEventListener('cw:profiles',schedule);
const obs=new MutationObserver(muts=>{
  if(!S)return;
  if(muts.some(m=>{
    const t=m.target;
    return t?.id==='homeMoney'||t?.id==='meMoney'||t?.id==='settlementLines'||t?.id==='personalTips'||t?.closest?.('#homeMoney,#meMoney,#settlementLines,#personalTips');
  }))schedule();
});
obs.observe(document.documentElement,{childList:true,subtree:true});
async function load(){
  try{
    const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trip_slug:TRIP,action:'get_state',payload:{}})});
    if(r.ok){S=await r.json();schedule()}
  }catch{}
}
ensureOverlay();load();
window.CWLedgerDetailV3={summary:p=>summary(p||ME),pairwisePlan, pairLedger, refresh:load};
})();