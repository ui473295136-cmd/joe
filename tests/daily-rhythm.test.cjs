const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('daily-rhythm-v1.js', 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeDom(nowIso, dayIndex = 1, xhrSummary = null) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div id="simpleItinerary"><button class="day-chip on" data-day="${dayIndex}">day</button></div>
    <details id="cwDailySummary"><summary><div><b>这一天</b><span>当天结束后自动生成</span></div></summary><div class="cw-summary-body"><div><span>当天记账</span><b>¥88 · 2笔</b></div><div><span>上传照片</span><b>6 张</b></div></div></details>
  </body></html>`, { url: 'https://example.com/app-v4.html?person=%E7%91%9E%E5%AD%90', runScripts: 'outside-only' });
  const RealDate = dom.window.Date;
  const fixed = new RealDate(nowIso).getTime();
  class FakeDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  }
  dom.window.Date = FakeDate;
  dom.window.CWSession = { get: () => ({ token: 'abcdefghijklmnopqrstuvwxyz123456' }) };
  class XHR {
    open() {}
    setRequestHeader() {}
    send() {
      this.status = 200;
      this.responseText = JSON.stringify({ summary: xhrSummary || {} });
      setTimeout(() => this.onload?.(), 0);
    }
  }
  dom.window.XMLHttpRequest = XHR;
  return dom;
}

test('05:00-20:00 shows the current day attention items', async () => {
  const dom = makeDom('2026-10-03T05:30:00+08:00');
  dom.window.eval(source);
  await sleep(180);
  const text = dom.window.document.querySelector('#cwDailySummary').textContent;
  assert.match(text, /今日注意事项/);
  assert.match(text, /05:00/);
  assert.match(text, /雅安 → 泸定 → 康定 → 折多山 → 新都桥/);
  assert.match(text, /折多山海拔约4298m/);
  assert.match(text, /20:00/);
  dom.window.close();
});

test('20:00 onward switches the same card to an automatic day summary', async () => {
  const dom = makeDom('2026-10-03T20:05:00+08:00', 1, {
    date: '2026-10-03',
    places: ['雅安', '泸定', '康定', '折多山', '新都桥'],
    distance_km: 276.4,
    drive_minutes: 428,
    first_move_at: '2026-10-02T22:01:00.000Z',
    last_move_at: '2026-10-03T10:12:00.000Z',
    gps_samples: 620,
    source: 'GPS轨迹',
  });
  dom.window.eval(source);
  await sleep(220);
  const text = dom.window.document.querySelector('#cwDailySummary').textContent;
  assert.match(text, /今日总结/);
  assert.match(text, /20:00/);
  assert.match(text, /雅安 → 泸定 → 康定 → 折多山 → 新都桥/);
  assert.match(text, /276\.4 km/);
  assert.match(text, /7小时8分/);
  assert.match(text, /¥88 · 2笔/);
  assert.match(text, /6 张/);
  assert.match(text, /GPS轨迹自动统计/);
  dom.window.close();
});
