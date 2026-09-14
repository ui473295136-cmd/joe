(()=>{
'use strict';
const TEAM=['瑞子','普子','航子','辉子'];
const qs=new URLSearchParams(location.search),ME=qs.get('person')||localStorage.getItem('cw-person')||'';
const AUTH='https://wpfqcztbxxarsrruuuce.supabase.co/functions/v1/trip-auth',TRIP='chuanxi2026';
const reveal=()=>{document.documentElement.style.visibility='';document.documentElement.classList.add('cw-auth-ready')};
if(qs.get('qa')==='1'){sessionStorage.setItem('cw-admin',ME==='瑞子'?'1':'0');window.__CW_AUTH_OK=true;reveal();return}
if(!TEAM.includes(ME)){location.replace('./');return}
const token=sessionStorage.getItem(`cw-auth-${ME}`)||'',exp=sessionStorage.getItem(`cw-auth-exp-${ME}`)||'';
if(!token){location.replace(`./?person=${encodeURIComponent(ME)}`);return}
const expMs=exp?new Date(exp).getTime():0;
if(expMs&&expMs<=Date.now()){sessionStorage.removeItem(`cw-auth-${ME}`);sessionStorage.removeItem(`cw-auth-exp-${ME}`);location.replace(`./?person=${encodeURIComponent(ME)}`);return}
localStorage.setItem('cw-person',ME);sessionStorage.setItem('cw-admin',ME==='瑞子'?'1':'0');window.__CW_AUTH_OK=true;reveal();
const c=new AbortController(),t=setTimeout(()=>c.abort(),6500);
fetch(AUTH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trip_slug:TRIP,action:'validate',payload:{person:ME,token}}),signal:c.signal}).then(async r=>{clearTimeout(t);if(r.ok)return;sessionStorage.removeItem(`cw-auth-${ME}`);sessionStorage.removeItem(`cw-auth-exp-${ME}`);location.replace(`./?person=${encodeURIComponent(ME)}`)}).catch(()=>{clearTimeout(t)});
})();