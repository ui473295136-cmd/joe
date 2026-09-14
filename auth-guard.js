(()=>{
'use strict';
const TEAM=['瑞子','普子','航子','辉子'];
const qs=new URLSearchParams(location.search),ME=qs.get('person')||localStorage.getItem('cw-person')||'';
const AUTH='https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-auth',TRIP='chuanxi2026';
const reveal=()=>{document.documentElement.style.visibility='';document.documentElement.classList.add('cw-auth-ready');window.__CW_AUTH_OK=true;window.dispatchEvent(new Event('cw-auth-ready'))};
const clear=()=>{sessionStorage.removeItem(`cw-auth-${ME}`);sessionStorage.removeItem(`cw-auth-exp-${ME}`)};
if(qs.get('qa')==='1'){sessionStorage.setItem('cw-admin',ME==='瑞子'?'1':'0');reveal();return}
if(!TEAM.includes(ME)){location.replace('./');return}
const token=sessionStorage.getItem(`cw-auth-${ME}`)||'',exp=sessionStorage.getItem(`cw-auth-exp-${ME}`)||'';
if(!token){location.replace(`./?person=${encodeURIComponent(ME)}`);return}
const expMs=exp?new Date(exp).getTime():0;
if(expMs&&expMs<=Date.now()){clear();location.replace(`./?person=${encodeURIComponent(ME)}`);return}
localStorage.setItem('cw-person',ME);
const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);
fetch(AUTH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trip_slug:TRIP,action:'validate',payload:{person:ME,token}}),signal:c.signal}).then(async r=>{clearTimeout(t);if(!r.ok){clear();location.replace(`./?person=${encodeURIComponent(ME)}`);return}const j=await r.json().catch(()=>({}));if(!j.valid){clear();location.replace(`./?person=${encodeURIComponent(ME)}`);return}if(j.expires_at)sessionStorage.setItem(`cw-auth-exp-${ME}`,j.expires_at);if(!sessionStorage.getItem('cw-admin'))sessionStorage.setItem('cw-admin',ME==='瑞子'?'1':'0');reveal()}).catch(()=>{clearTimeout(t);clear();location.replace(`./?person=${encodeURIComponent(ME)}&auth_error=1`)})
})();