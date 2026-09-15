const puppeteer=require('puppeteer-core');
const chrome=process.env.CHROME;
const base=process.env.QA_BASE||'http://127.0.0.1:8000';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(browser,date,time='09:00'){
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await page.goto(`${base}/app-v4.html?person=${encodeURIComponent('瑞子')}&qa=1&qaDate=${date}&qaTime=${encodeURIComponent(time)}`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>document.documentElement.classList.contains('cw-trip-stage-ready'),{timeout:12000});
  return page;
}
(async()=>{
  if(!chrome)throw new Error('Chrome not found');
  const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  try{
    let p=await open(browser,'2026-09-15');
    await p.waitForFunction(()=>/距离川西还有\s*17\s*天/.test(document.querySelector('#nextTripCard')?.innerText||''),{timeout:6000});
    await p.waitForFunction(()=>document.querySelector('#helloName')?.textContent.includes('出发前')&&document.querySelector('#todayTag')?.textContent.includes('17天'),{timeout:4000});
    const pre=await p.evaluate(()=>({hello:document.querySelector('#helloName')?.textContent||'',tag:document.querySelector('#todayTag')?.textContent||'',card:document.querySelector('#nextTripCard')?.innerText||'',wx:document.querySelector('#cwHourlyRouteWeather')?.innerText||''}));
    if(!pre.hello.includes('出发前')||!pre.tag.includes('17天')||!/机票/.test(pre.card)||!/酒店/.test(pre.card)||!/四人准备度/.test(pre.card)||!/暂无可靠天气预报/.test(pre.wx)||/下一站/.test(pre.card))throw new Error('PRE_STAGE_FAIL '+JSON.stringify(pre));
    await p.close();
    p=await open(browser,'2026-10-03','12:30');
    await p.waitForSelector('#bottomNav button[data-view="today"]',{timeout:8000});
    await p.click('#bottomNav button[data-view="today"]');
    await sleep(120);
    await p.waitForSelector('#simpleItinerary [data-day="1"]',{timeout:8000});
    await p.evaluate(()=>document.querySelector('#simpleItinerary [data-day="1"]')?.click());
    await p.waitForFunction(()=>document.querySelector('#todayTag')?.textContent.includes('旅途中 · Day 2'),{timeout:4000});
    await p.waitForFunction(()=>/折多山/.test(document.querySelector('#cwHourlyRouteWeather')?.innerText||'')&&/建议短停/.test(document.querySelector('#cwHourlyRouteWeather')?.innerText||''),{timeout:7000});
    const trip=await p.evaluate(()=>({tag:document.querySelector('#todayTag')?.textContent||'',wx:document.querySelector('#cwHourlyRouteWeather')?.innerText||''}));
    for(const needle of ['旅途中 · Day 2','13:00','折多山','预计 4℃','体感 0℃','风速 37km/h','降雨概率 48%','建议短停'])if(!(trip.tag+' '+trip.wx).includes(needle))throw new Error('TRIP_WEATHER_FAIL '+needle+' '+JSON.stringify(trip));
    await p.close();
    p=await open(browser,'2026-10-08');
    await p.waitForFunction(()=>/旅程完成/.test(document.querySelector('#nextTripCard')?.innerText||'')&&document.querySelector('#todayTag')?.textContent.includes('旅程完成'),{timeout:5000});
    const done=await p.$eval('#nextTripCard',e=>e.innerText);
    if(!done.includes('查看旅行报告'))throw new Error('DONE_STAGE_FAIL '+done);
    await p.close();
    console.log('STAGE_QA_PASS');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});