(()=>{
  'use strict';
  if(window.__cwChinaTimeCompat)return;
  const rawDate=Date.prototype.toLocaleDateString;
  const rawTime=Date.prototype.toLocaleTimeString;
  const parts=(date)=>{
    try{
      const out={};
      new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).forEach(p=>{if(p.type!=='literal')out[p.type]=p.value});
      return out;
    }catch(e){
      return {year:String(date.getFullYear()),month:String(date.getMonth()+1).padStart(2,'0'),day:String(date.getDate()).padStart(2,'0'),hour:String(date.getHours()).padStart(2,'0'),minute:String(date.getMinutes()).padStart(2,'0'),second:String(date.getSeconds()).padStart(2,'0')};
    }
  };
  const isSv=(locales)=>locales==='sv-SE'||(Array.isArray(locales)&&locales.includes('sv-SE'));
  Date.prototype.toLocaleDateString=function(locales,options){
    if(isSv(locales)&&options?.timeZone==='Asia/Shanghai'){
      const p=parts(this);
      return `${p.year}-${p.month}-${p.day}`;
    }
    return rawDate.apply(this,arguments);
  };
  Date.prototype.toLocaleTimeString=function(locales,options){
    const zh=locales==='zh-CN'||(Array.isArray(locales)&&locales.includes('zh-CN'));
    if(zh&&options?.timeZone==='Asia/Shanghai'&&options?.hour==='2-digit'&&options?.minute==='2-digit'&&options?.hour12===false){
      const p=parts(this);
      return options?.second==='2-digit'?`${p.hour}:${p.minute}:${p.second}`:`${p.hour}:${p.minute}`;
    }
    return rawTime.apply(this,arguments);
  };
  window.CWChinaClock={
    parts,
    date(date=new Date()){const p=parts(date);return `${p.year}-${p.month}-${p.day}`},
    hm(date=new Date()){const p=parts(date);return `${p.hour}:${p.minute}`},
    label(date=new Date()){const p=parts(date);return `${Number(p.month)}月${Number(p.day)}日 ${p.hour}:${p.minute}`}
  };
  window.__cwChinaTimeCompat=1;
})();
