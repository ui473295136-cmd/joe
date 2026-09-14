(()=>{
'use strict';
const TEAM=['瑞子','普子','航子','辉子'];
const DEFAULT_ROLE={瑞子:'酒店 / 账本',普子:'攻略 / 路况',航子:'机票 / 航班',辉子:'租车 / 车务'};
const TRIP='chuanxi2026';
const ENDPOINT='https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-profile';
const ME=new URLSearchParams(location.search).get('person')||localStorage.getItem('cw-person')||'瑞子';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let profiles=[];
let busy=false;
const channel='BroadcastChannel' in window?new BroadcastChannel('cw-profile-sync'):null;
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]))}
function toast(msg){const el=$('#toast');if(el){el.textContent=msg;el.classList.add('show');clearTimeout(el._pt);el._pt=setTimeout(()=>el.classList.remove('show'),2400)}else console.log(msg)}
function api(action,payload={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);return fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trip_slug:TRIP,action,payload}),signal:c.signal}).then(async r=>{clearTimeout(t);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'同步失败');return j}).catch(e=>{clearTimeout(t);throw e})}
function profile(p){return profiles.find(x=>x.person===p)||{person:p,nickname:p,role:DEFAULT_ROLE[p]||'',avatar_url:null}}
function mergeProfile(x){if(!x?.person)return;const i=profiles.findIndex(p=>p.person===x.person);if(i>=0)profiles[i]={...profiles[i],...x};else profiles.push(x)}
function cssUrl(bg){const m=String(bg||'').match(/url\(["']?(.*?)["']?\)/);return m?m[1]:''}
function fallbackUrl(p){const direct=window.CHUANXI_AVATARS?.[p[0]]||window.CW_AVATARS?.[p[0]]||'';if(direct)return direct;const seed=$(`#avatarSeeds .avatar[data-person="${p}"]`);if(!seed)return'';return cssUrl(getComputedStyle(seed).backgroundImage||seed.style.backgroundImage)}
function avatarUrl(p){return profile(p).avatar_url||fallbackUrl(p)||''}
function paintAvatar(el,p){if(!el)return;const u=avatarUrl(p);el.dataset.person=p;el.textContent=u?'':p[0];if(u){el.style.backgroundImage=`url("${u.replace(/"/g,'%22')}")`;el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.style.color='transparent'}else{el.style.backgroundImage='';el.style.color=''}}
function paintAll(){
  TEAM.forEach(p=>$$(`.avatar[data-person="${p}"]`).forEach(el=>paintAvatar(el,p)));
  paintAvatar($('#homeAvatar'),ME);paintAvatar($('#profileAvatar'),ME);paintAvatar($('#miniAvatar'),ME);
  const me=profile(ME);
  const hello=$('#helloName');if(hello)hello.textContent=`${me.nickname||ME}，今天先看这些`;
  const role=$('#helloRole');if(role)role.textContent=me.role||DEFAULT_ROLE[ME]||'';
  const nick=$('#nicknameInput');if(nick&&document.activeElement!==nick)nick.value=me.nickname||ME;
  const roleInput=$('#roleInput');if(roleInput&&document.activeElement!==roleInput)roleInput.value=me.role||DEFAULT_ROLE[ME]||'';
  renderIdentityGrid();
  $$('#teamStrip .team-one').forEach(card=>{const av=card.querySelector('.avatar[data-person]');if(!av)return;const p=av.dataset.person;paintAvatar(av,p);const b=card.querySelector('b');if(b)b.textContent=profile(p).nickname||p;const small=card.querySelector('small');if(small){const dot=small.querySelector('.dot');const onlineText=dot?.classList.contains('on')?'在线':'离线';small.innerHTML='';if(dot)small.appendChild(dot);small.append(`${onlineText} · ${profile(p).role||DEFAULT_ROLE[p]||''}`)}});
}
function renderIdentityGrid(){const el=$('#identityGrid');if(!el)return;el.innerHTML=TEAM.map(p=>{const x=profile(p);return`<button type="button" class="identity-item ${p===ME?'on':''}" data-switch-person="${p}"><span class="identity-avatar" data-profile-avatar="${p}">${p[0]}</span><span><b>${esc(x.nickname||p)}</b><small>${esc(x.role||DEFAULT_ROLE[p]||'')}</small></span>${p===ME?'<em>当前</em>':''}</button>`}).join('');TEAM.forEach(p=>paintAvatar(el.querySelector(`[data-profile-avatar="${p}"]`),p))}
function removeMapTab(){const tab=$('#bottomNav button[data-view="map"]');if(tab){tab.hidden=true;tab.setAttribute('aria-hidden','true');tab.tabIndex=-1}$('#bottomNav')?.classList.add('cw-four-tabs');
  if(!$('#quickMapBtn')){const head=$('.now-card .section-head');if(head){const box=document.createElement('div');box.className='cw-now-actions';box.innerHTML='<button type="button" class="ghost" id="quickMapBtn">查看地图</button>';head.appendChild(box);$('#quickMapBtn').onclick=()=>{const old=$('#openMapBtn');if(old)old.click();else toast('地图暂不可用')}}}
}
function compressAvatar(file){return new Promise((resolve,reject)=>{if(!file||!/^image\//.test(file.type||''))return reject(new Error('请选择图片文件'));const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{const side=Math.min(img.naturalWidth||img.width,img.naturalHeight||img.height),sx=((img.naturalWidth||img.width)-side)/2,sy=((img.naturalHeight||img.height)-side)/2,c=document.createElement('canvas');c.width=c.height=360;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,side,side,0,0,360,360);URL.revokeObjectURL(url);let data=c.toDataURL('image/jpeg',.82);if(data.length>700000)data=c.toDataURL('image/jpeg',.7);resolve(data)}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('图片读取失败'))};img.src=url})}
async function refresh(showError=false){try{const j=await api('list_profiles');profiles=j.profiles||[];paintAll()}catch(e){if(showError)toast('资料同步失败：'+e.message)}}
function bindProfileActions(){
  const save=$('#saveProfile');if(save)save.onclick=async()=>{if(busy)return;const nickname=$('#nicknameInput')?.value.trim(),role=$('#roleInput')?.value.trim()||'';if(!nickname)return toast('昵称不能为空');busy=true;save.disabled=true;const state=$('#avatarState');if(state)state.textContent='正在同步资料…';try{const j=await api('update_profile',{person:ME,nickname,role});mergeProfile(j.profile);paintAll();channel?.postMessage({type:'profile',profile:j.profile});document.dispatchEvent(new Event('visibilitychange'));if(state)state.textContent='昵称和职责已同步给所有人';toast('个人资料已同步')}catch(e){if(state)state.textContent='同步失败：'+e.message;toast('同步失败：'+e.message)}finally{busy=false;save.disabled=false}};
  const change=$('#changeAvatar'),input=$('#avatarInput');if(change&&input){change.onclick=()=>{input.value='';input.click()};input.onchange=async e=>{const file=e.target.files?.[0];if(!file||busy)return;const old=profile(ME);const state=$('#avatarState');busy=true;change.disabled=true;if(state)state.textContent='正在处理头像…';try{const data=await compressAvatar(file);mergeProfile({...old,avatar_url:data});paintAll();if(state)state.textContent='正在上传并同步…';const j=await api('upload_avatar',{person:ME,data_url:data});mergeProfile(j.profile);paintAll();channel?.postMessage({type:'profile',profile:j.profile});document.dispatchEvent(new Event('visibilitychange'));if(state)state.textContent='头像已同步给所有人';toast('头像更换成功')}catch(err){mergeProfile(old);paintAll();if(state)state.textContent='头像上传失败：'+err.message;toast('头像上传失败')}finally{busy=false;change.disabled=false;input.value=''}}}
}
function bind(){document.addEventListener('click',e=>{const sw=e.target.closest('[data-switch-person]');if(!sw)return;const p=sw.dataset.switchPerson;if(!TEAM.includes(p)||p===ME)return;e.preventDefault();e.stopPropagation();localStorage.setItem('cw-person',p);location.replace(`./app-v4.html?person=${encodeURIComponent(p)}`)},true);channel?.addEventListener('message',e=>{if(e.data?.type==='profile'&&e.data.profile){mergeProfile(e.data.profile);paintAll()}});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false)});window.addEventListener('focus',()=>refresh(false));}
async function init(){removeMapTab();bindProfileActions();bind();await refresh(false);paintAll();setInterval(()=>{if(!document.hidden)refresh(false)},15000);document.documentElement.classList.add('profile-sync-ready')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,80),{once:true});else setTimeout(init,80);
})();