const puppeteer=require('puppeteer-core');
const chrome=process.env.CHROME;
const base=process.env.QA_BASE||'http://127.0.0.1:8000';
const people=['瑞子','航子','普子','辉子'];
const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'};
const okJson=(req,obj,status=200)=>req.respond({status,contentType:'application/json',headers:cors,body:JSON.stringify(obj)});
const tap=async(page,pin)=>{for(const n of pin){await page.click(`#keypad button[data-key="${n}"]`);await sleep(55)}};
async function authPage(browser,mode){
  const context=await browser.createBrowserContext();const page=await context.newPage();let setupCalls=0,verifyCalls=0;
  await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await page.setRequestInterception(true);
  page.on('request',req=>{
    const u=req.url();
    if(u.includes('/functions/v1/trip-auth')){
      if(req.method()==='OPTIONS')return okJson(req,{ok:true});
      let b={};try{b=JSON.parse(req.postData()||'{}')}catch{}
      if(b.action==='status')return okJson(req,{configured:mode!=='setup',locked:false,remaining_attempts:5,failed_attempts:0});
      if(b.action==='setup'){setupCalls++;return okJson(req,{ok:true,token:'setup-token-abcdefghijklmnopqrstuvwxyz',expires_at:new Date(Date.now()+3600000).toISOString()})}
      if(b.action==='verify'){
        verifyCalls++;
        if(mode==='wrong'){
          if(verifyCalls>=5)return okJson(req,{error:'密码错误，已锁定20分钟',code:'locked',lock_seconds:1200,remaining_attempts:0},423);
          return okJson(req,{error:'密码错误',code:'wrong_pin',remaining_attempts:5-verifyCalls},401)
        }
        return okJson(req,{ok:true,token:'verify-token-abcdefghijklmnopqrstuvwxyz',expires_at:new Date(Date.now()+3600000).toISOString()})
      }
      if(b.action==='validate')return okJson(req,{valid:true,expires_at:new Date(Date.now()+3600000).toISOString()});
      return okJson(req,{ok:true})
    }
    if(u.includes('wpfqcztbxxarsrruuuce.supabase.co/functions/v1/'))return okJson(req,{expenses:[],repayments:[],profiles:[],person_positions:[],logs:[],ledger_acks:[],bookings:[],memories:[],emergency_contacts:[]});
    req.continue();
  });
  return{page,getSetup:()=>setupCalls,getVerify:()=>verifyCalls};
}
async function pinQA(browser){
  let failed=false;
  {
    const{page,getSetup}=await authPage(browser,'setup');
    await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:15000});
    await page.click('[data-name="普子"]');
    await page.waitForFunction(()=>document.querySelector('#authTitle')?.textContent.includes('设置密码'),{timeout:5000});
    await tap(page,'1234');
    await page.waitForFunction(()=>document.querySelector('#authTitle')?.textContent.includes('再次输入'),{timeout:2000});
    await tap(page,'1234');
    await page.waitForSelector('#setupActions.show',{timeout:2000});
    await page.click('#setupCancel');await sleep(100);
    const hidden=await page.$eval('#authOverlay',e=>!e.classList.contains('show'));
    if(getSetup()!==0||!hidden){failed=true;console.error('PIN_FAIL setup cancel wrote data',getSetup(),hidden)}
    await page.click('[data-name="普子"]');
    await page.waitForFunction(()=>document.querySelector('#authTitle')?.textContent.includes('设置密码'),{timeout:5000});
    await tap(page,'2468');await page.waitForFunction(()=>document.querySelector('#authTitle')?.textContent.includes('再次输入'),{timeout:2000});
    await tap(page,'2468');await page.waitForSelector('#setupActions.show',{timeout:2000});
    await page.click('#setupConfirm');
    await page.waitForFunction(()=>location.href.includes('app-v4.html'),{timeout:5000}).catch(()=>{});
    if(getSetup()!==1){failed=true;console.error('PIN_FAIL setup confirm count',getSetup())}
    await page.close();
  }
  {
    const{page,getVerify}=await authPage(browser,'wrong');
    await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:15000});await page.click('[data-name="辉子"]');
    await page.waitForFunction(()=>document.querySelector('#authTitle')?.textContent.includes('请输入'),{timeout:5000});
    for(let i=0;i<5;i++){
      await tap(page,'9999');
      if(i<4)await page.waitForFunction(n=>document.querySelector('#authMsg')?.textContent.includes(`还剩 ${n} 次机会`),{timeout:2500},4-i);
      else await page.waitForFunction(()=>document.querySelector('#authMsg')?.textContent.includes('已锁定'),{timeout:2500});
      await sleep(130);
    }
    const disabled=await page.$$eval('#keypad button[data-key]',x=>x.every(b=>b.disabled));
    if(getVerify()!==5||!disabled){failed=true;console.error('PIN_FAIL five wrong attempts did not lock',getVerify(),disabled)}
    await page.close();
  }
  {
    const{page,getVerify}=await authPage(browser,'ok');
    await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:15000});await page.click('[data-name="航子"]');
    await page.waitForFunction(()=>document.querySelector('#authTitle')?.textContent.includes('请输入'),{timeout:5000});
    await tap(page,'2468');
    await page.waitForFunction(()=>location.href.includes('app-v4.html'),{timeout:5000}).catch(()=>{});
    if(getVerify()!==1){failed=true;console.error('PIN_FAIL correct 4 digits did not auto verify',getVerify())}
    await page.close();
  }
  if(failed)throw new Error('PIN interaction QA failed');
  console.log('PIN_QA_PASS');
}
async function appQA(browser){
  let failed=false;
  for(const person of people){
    const page=await browser.newPage();
    await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const errors=[];
    page.on('pageerror',e=>errors.push('pageerror:'+e.message));
    page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('net::ERR'))errors.push('console:'+m.text())});
    await page.setRequestInterception(true);
    page.on('request',req=>{const u=req.url();if(u.includes('webrd0')||u.includes('map.geoq.cn'))return req.respond({status:200,contentType:'image/png',body:tiny});req.continue()});
    await page.goto(`${base}/app-v4.html?person=${encodeURIComponent(person)}&qa=1&probe=1`,{waitUntil:'domcontentloaded',timeout:20000});
    try{await page.waitForFunction(()=>document.querySelector('#qaResult')?.dataset.status,{timeout:32000})}catch{}
    const result=await page.$eval('#qaResult',e=>({status:e.dataset.status,text:e.textContent})).catch(()=>({status:'missing',text:'qaResult missing'}));
    const bodyPin=await page.evaluate(()=>/PIN不正确|pin不正确/i.test(document.body.innerText));
    const visibleNav=await page.$$eval('#bottomNav button[data-view]:not([hidden])',x=>x.length);
    console.log(person,result.text);
    if(result.status!=='pass'||errors.length||bodyPin||visibleNav!==4){failed=true;console.error('APP_FAIL',person,{result,errors,bodyPin,visibleNav})}
    await page.close();
  }
  const slow=await browser.newPage();
  await slow.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await slow.setRequestInterception(true);
  slow.on('request',req=>{const u=req.url();if(u.includes('webrd0'))return setTimeout(()=>req.abort('timedout').catch(()=>{}),2600);if(u.includes('map.geoq.cn'))return req.respond({status:200,contentType:'image/png',body:tiny});req.continue()});
  await slow.goto(`${base}/app-v4.html?person=${encodeURIComponent('瑞子')}&qa=1&probe=1`,{waitUntil:'domcontentloaded',timeout:20000});
  await slow.waitForSelector('#quickMapBtn',{timeout:10000});await slow.click('#quickMapBtn');
  try{await slow.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('#fullMap')?.dataset.mapState),{timeout:8000})}catch{}
  const state=await slow.$eval('#fullMap',e=>e.dataset.mapState||'');if(!['ready','fallback'].includes(state)){failed=true;console.error('APP_FAIL stalled primary map did not fail over',state)}
  await slow.close();if(failed)throw new Error('Four identity mobile regression failed');console.log('APP_QA_PASS')
}
(async()=>{if(!chrome)throw new Error('Chrome not found');const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});try{await pinQA(browser);await appQA(browser)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});