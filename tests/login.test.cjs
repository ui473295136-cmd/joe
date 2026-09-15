const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { root, until } = require('./helpers.cjs');

function login(auth) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://example.test/?choose=1',
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  dom.window.CWSession = { PEOPLE: ['瑞子', '普子', '航子', '辉子'], ...auth };
  dom.window.eval(fs.readFileSync(path.join(root, 'login.js'), 'utf8'));
  return dom;
}

test('login remembers the successful verification choice even if toggled while submitting', async () => {
  const requests = [], saved = [];
  let resolveVerification;
  const dom = login({
    get: () => null,
    save: (...args) => saved.push(args),
    request: async (action, payload) => {
      requests.push({ action, payload });
      if (action === 'status') return { configured: true, remaining_attempts: 5 };
      return new Promise(resolve => { resolveVerification = resolve; });
    },
  });
  try {
    const d = dom.window.document;
    d.querySelector('[data-name="普子"]').click();
    await until(() => !d.querySelector('#pinInput').disabled);
    assert.equal(d.querySelector('#rememberDevice').checked, true);
    const input = d.querySelector('#pinInput');
    input.value = '1234';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(input.value, '');
    assert.equal(requests.at(-1).payload.remember_device, true);
    d.querySelector('#rememberDevice').checked = false;
    resolveVerification({ token: 'fixture-token', expires_at: 'fixture-expiry' });
    await until(() => saved.length === 1);
    assert.equal(saved[0][0], '普子');
    assert.equal(saved[0][2], true);
  } finally { dom.window.close(); }
});

test('a returning remembered person validates and enters without asking for a PIN', async () => {
  const requests = [], saved = [];
  const session = { token: 'fixture-token', expires_at: 'fixture-expiry', remembered: true };
  const dom = login({
    get: () => session,
    validate: async person => { requests.push(person); return session; },
    request: async () => { throw new Error('PIN endpoint should not be called'); },
    save: (...args) => saved.push(args),
  });
  try {
    dom.window.document.querySelector('[data-name="航子"]').click();
    await until(() => saved.length === 1);
    assert.deepEqual(requests, ['航子']);
    assert.equal(dom.window.document.querySelector('#loading').classList.contains('show'), true);
    assert.equal(saved[0][2], true);
  } finally { dom.window.close(); }
});
