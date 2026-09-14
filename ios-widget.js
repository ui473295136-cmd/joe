(()=>{
const PEOPLE=['瑞子','航子','普子','辉子'];
const ROLE={瑞子:'酒店 · 账本',航子:'机票',普子:'攻略',辉子:'租车 · 车务'};
const q=new URLSearchParams(location.search);
const ME=PEOPLE.includes(q.get('person'))?q.get('person'):(PEOPLE.includes(localStorage.getItem('cw-person'))?localStorage.getItem('cw-person'):'');
if(!ME)return;
window.CW_ME=ME;
localStorage.setItem('cw-person',ME);

const css=document.createElement('style');
css.textContent=`
.meChip{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900}
.meChip i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#a5f1d4;color:#06485f;font-style:normal;font-size:11px}
.person.isMe{border-color:#17818a!important;box-shadow:0 0 0 2px rgba(23,129,138,.14)!important;background:#f1fbf8!important}
.iosModal{position:fixed;inset:0;z-index:99999;display:none;place-items:center;padding:16px;background:rgba(4,31,43,.72);backdrop-filter:blur(10px)}
.iosModal.show{display:grid}.iosBox{width:min(520px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:22px;padding:19px;box-shadow:0 28px 90px rgba(0,0,0,.28);color:#0c3144}.iosBox h3{margin:0 0 5px;font-size:22px}.iosBox .lead{font-size:11px;line-height:1.7;color:#69838e}.iosUrl{display:flex;gap:7px;margin:12px 0}.iosUrl input{flex:1;min-width:0;border:1px solid #d5e5e8;border-radius:10px;padding:10px;font-size:10px;background:#f7faf9}.iosUrl button,.iosActions button,.iosActions a{border:0;border-radius:10px;padding:10px 12px;font-size:10px;font-weight:900;text-decoration:none;text-align:center}.iosUrl button,.iosActions .primary{background:#0b5f78;color:#fff}.iosActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.iosActions .secondary{background:#eef5f4;color:#16495c}.iosSteps{display:grid;gap:8px;margin-top:10px}.iosStep{display:grid;grid-template-columns:28px 1fr;gap:9px;align-items:start;padding:9px;border:1px solid #e0ebed;border-radius:11px;background:#fbfdfd;font-size:10px;line-height:1.55}.iosStep b{width:28px;height:28px;border-radius:9px;background:#dff5ec;color:#176451;display:grid;place-items:center}.iosHint{margin-top:10px;padding:9px 10px;border-radius:10px;background:#fff4dc;border:1px solid #f1d9a9;color:#725b32;font-size:9px;line-height:1.6}.iosClose{width:100%;margin-top:10px;border:1px solid #d5e5e8;background:#fff;border-radius:10px;padding:10px;color:#365d6b;font-weight:900}
`;
document.head.appendChild(css);

function ownUrl(){return `${location.origin}${location.pathname.replace(/dashboard\.html$/,'')}?person=${encodeURIComponent(ME)}&widget=1`}

function addHeroButtons(){
  const host=document.querySelector('.heroActions');
  if(!host)return;
  const who=document.createElement('span');who.className='meChip';who.innerHTML=`<i>${ME.slice(0,1)}</i>${ME} · ${ROLE[ME]}`;host.prepend(who);
  const w=document.createElement('button');w.className='pillbtn';w.type='button';w.textContent='▣ iPhone 小组件';w.onclick=openWidget;host.appendChild(w);
  const s=document.createElement('button');s.className='pillbtn';s.type='button';s.textContent='切换身份';s.onclick=()=>{localStorage.removeItem('cw-person');sessionStorage.removeItem('cw-private');sessionStorage.removeItem('cw-cloud-pin');parent.location.href='./'};host.appendChild(s);
}
function personalize(){
  document.title=`${ME}的川西自驾｜2026`;
  const sub=document.querySelector('.sub');if(sub&&!sub.textContent.includes(ME))sub.textContent=`${ME}专属 · ${sub.textContent}`;
  document.querySelectorAll('.person').forEach(el=>{if(el.textContent.includes(ME))el.classList.add('isMe')});
  const payer=document.getElementById('payer');if(payer&&[...payer.options].some(o=>o.value===ME))payer.value=ME;
  const sf=document.getElementById('settleFrom');if(sf&&[...sf.options].some(o=>o.value===ME))sf.value=ME;
}
function modal(){
  let m=document.getElementById('iosWidgetModal');if(m)return m;
  m=document.createElement('div');m.id='iosWidgetModal';m.className='iosModal';m.innerHTML=`<div class="iosBox"><h3>${ME}的 iPhone 桌面入口</h3><div class="lead">你们都是 iPhone，最稳的做法是用 Apple 自带的「快捷指令」小组件。桌面点击后会直接打开 <b>${ME}</b> 的专属川西页面，不需要重新选名字。</div><div class="iosUrl"><input id="widgetUrl" readonly><button id="copyWidgetUrl">复制专属链接</button></div><div class="iosActions"><a class="primary" href="shortcuts://">打开快捷指令</a><button class="secondary" id="shareWidgetUrl">分享链接</button></div><div class="iosSteps"><div class="iosStep"><b>1</b><div>打开「快捷指令」App，点右上角 <strong>＋</strong> 新建快捷指令。</div></div><div class="iosStep"><b>2</b><div>添加动作「打开 URL」，把上面的 <strong>${ME}专属链接</strong> 粘贴进去，名称建议设为「川西自驾 · ${ME}」。</div></div><div class="iosStep"><b>3</b><div>回到 iPhone 桌面，长按空白处 → <strong>编辑 / 添加小组件</strong> → 搜索「快捷指令」。</div></div><div class="iosStep"><b>4</b><div>选择小号或中号「快捷指令」小组件，并指定「川西自驾 · ${ME}」。以后桌面点一下就进入网页。</div></div></div><div class="iosHint"><b>说明：</b>GitHub Pages / PWA 本身不能直接生成 Apple WidgetKit 原生小组件；但如果目的只是“桌面点小组件立刻进入专属网页”，Apple 自带快捷指令小组件最省事、无需安装第三方 App。网页本身也继续支持「添加到主屏幕」作为独立 App 图标。</div><button class="iosClose" id="closeIosWidget">关闭</button></div>`;document.body.appendChild(m);
  m.querySelector('#widgetUrl').value=ownUrl();
  m.querySelector('#copyWidgetUrl').onclick=async()=>{try{await navigator.clipboard.writeText(ownUrl());m.querySelector('#copyWidgetUrl').textContent='已复制 ✓'}catch(e){m.querySelector('#widgetUrl').select();document.execCommand('copy')}};
  m.querySelector('#shareWidgetUrl').onclick=async()=>{if(navigator.share)try{await navigator.share({title:`川西自驾 · ${ME}`,url:ownUrl()})}catch(e){}else navigator.clipboard?.writeText(ownUrl())};
  m.querySelector('#closeIosWidget').onclick=()=>m.classList.remove('show');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});return m
}
function openWidget(){modal().classList.add('show')}
addHeroButtons();personalize();modal();
if(q.get('widget')==='1')setTimeout(()=>{window.scrollTo({top:0,behavior:'instant'});const drive=document.querySelector('.drive');if(drive)drive.style.boxShadow='0 0 0 2px rgba(23,129,138,.18),0 16px 42px rgba(10,57,77,.09)'},300);
})();