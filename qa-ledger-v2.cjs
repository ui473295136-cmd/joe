const puppeteer=require('puppeteer-core');
const chrome=process.env.CHROME;
const base=process.env.QA_BASE||'http://127.0.0.1:8000';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  if(!chrome)throw new Error('Chrome not found');
  const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  try{
    const page=await browser.newPage();
    await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await page.goto(`${base}/app-v4.html?person=${encodeURIComponent('瑞子')}&qa=1`,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>document.documentElement.classList.contains('cw-ledger-v2-ready'),{timeout:12000});
    await page.evaluate(()=>{
      window.__ledgerRequests=[];
      const old=window.fetch;
      window.fetch=async(input,init={})=>{
        try{
          const url=String(typeof input==='string'?input:input?.url||'');
          const body=JSON.parse(init.body||'{}');
          if(url.includes('/functions/v1/trip-sync')&&body.action==='add_expense')window.__ledgerRequests.push(body.payload);
        }catch{}
        return old(input,init);
      };
      const state={
        expenses:[{id:'rent1',category:'租车',amount:1887,payer:'辉子',participants:['瑞子','普子','航子','辉子'],note:'租车',status:'paid',created_at:new Date().toISOString()}],
        repayments:[],profiles:[],logs:[],memories:[],bookings:[],person_positions:[],ledger_acks:[],emergency_contacts:[]
      };
      window.dispatchEvent(new CustomEvent('cw:state',{detail:{state}}));
    });
    await page.waitForFunction(()=>/我应付给\s*辉子/.test(document.querySelector('#settlementLines')?.innerText||''),{timeout:3000});
    let settlement=await page.$eval('#settlementLines',e=>e.innerText);
    if(!settlement.includes('¥471.75')||/辉子\s*应付给我/.test(settlement))throw new Error('PAYER_SETTLEMENT_FAIL '+settlement);

    await page.evaluate(()=>{const p=document.querySelector('#expPayer');p.value='辉子';p.dispatchEvent(new Event('change',{bubbles:true}))});
    await page.click('.cw-quick-chip[data-exp-cat="油费"]');
    await sleep(80);
    const payerAfterQuick=await page.$eval('#expPayer',e=>e.value);
    if(payerAfterQuick!=='辉子')throw new Error('QUICK_RESET_PAYER '+payerAfterQuick);

    await page.evaluate(()=>{const a=document.querySelector('#expAmount');a.value='1887';a.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.waitForFunction(()=>/辉子实际付款/.test(document.querySelector('#cwExpensePreview')?.innerText||''),{timeout:1500});
    const preview=await page.$eval('#cwExpensePreview',e=>e.innerText);
    if(!preview.includes('由瑞子代记账，不改变收款人'))throw new Error('PREVIEW_FAIL '+preview);
    await page.$eval('#expenseForm',f=>f.requestSubmit());
    await sleep(450);
    const payload=await page.evaluate(()=>window.__ledgerRequests.at(-1));
    if(!payload||payload.payer!=='辉子'||payload.actor!=='瑞子'||Number(payload.amount)!==1887)throw new Error('ADD_PAYLOAD_FAIL '+JSON.stringify(payload));

    const before=await page.evaluate(()=>window.__ledgerRequests.length);
    await page.evaluate(()=>{const a=document.querySelector('#expAmount');a.value='10000000';a.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#expenseForm').requestSubmit()});
    await sleep(120);
    const after=await page.evaluate(()=>window.__ledgerRequests.length);
    if(after!==before)throw new Error('MAX_LIMIT_NOT_BLOCKED');
    const maxAttr=await page.$eval('#expAmount',e=>e.max);
    if(maxAttr!=='9999999.99')throw new Error('MAX_ATTR_FAIL '+maxAttr);

    await page.evaluate(()=>{
      const state={
        expenses:[{id:'rent1',category:'租车',amount:1887,payer:'辉子',participants:['瑞子','普子','航子','辉子'],note:'租车',status:'paid',created_at:new Date().toISOString()}],
        repayments:[{id:'rp1',from_person:'瑞子',to_person:'辉子',amount:100,note:'先还100',created_at:new Date().toISOString()}],profiles:[],logs:[],memories:[],bookings:[],person_positions:[],ledger_acks:[],emergency_contacts:[]
      };
      window.dispatchEvent(new CustomEvent('cw:state',{detail:{state}}));
    });
    await page.waitForFunction(()=>/¥371\.75/.test(document.querySelector('#settlementLines')?.innerText||''),{timeout:2000});
    settlement=await page.$eval('#settlementLines',e=>e.innerText);
    if(!settlement.includes('我应付给 辉子'))throw new Error('REPAY_PAIR_FAIL '+settlement);
    const errs=await page.evaluate(()=>(window.__cwErrors||[]).filter(x=>x&&!/ResizeObserver loop/i.test(x)));
    if(errs.length)throw new Error('PAGE_ERRORS '+errs.join(' | '));
    console.log('LEDGER_V2_QA_PASS');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});