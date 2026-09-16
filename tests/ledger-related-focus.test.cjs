const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('ledger-related-focus-v1.js', 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('与我有关 jumps to unread related item and read state returns to normal', async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <button data-ledgerview="mine">与我有关</button>
    <div id="ledgerList">
      <div class="ledger-item cw-ledger-unread" id="unread">
        <div class="ledger-top"><div><b>住宿</b><div class="ledger-meta">付款人：航子</div></div><b class="ledger-amt">¥100.00</b></div>
        <div class="ledger-actions"><button data-ledger="ack" data-id="e1">我已知晓</button></div>
      </div>
      <div class="ledger-item" id="normal"><div class="ledger-top"><div><b>油费</b><div class="ledger-meta">已读</div></div></div></div>
    </div>
  </body></html>`, { url: 'https://example.com/app-v4.html?person=%E7%91%9E%E5%AD%90', runScripts: 'outside-only' });
  dom.window.HTMLElement.prototype.scrollIntoView = function () { this.dataset.scrolled = '1'; };
  dom.window.eval(source);
  await sleep(100);
  const unread = dom.window.document.querySelector('#unread');
  assert.match(unread.textContent, /与我有关 · 未读/);
  assert.equal(unread.querySelector('[data-ledger="ack"]').textContent, '标记已读');

  dom.window.document.querySelector('[data-ledgerview="mine"]').click();
  await sleep(520);
  assert.equal(unread.dataset.scrolled, '1');
  assert.equal(unread.classList.contains('cw-related-jump'), true);

  unread.classList.remove('cw-ledger-unread');
  await sleep(160);
  assert.equal(unread.querySelector('.cw-related-unread-label'), null);
  dom.window.close();
});
