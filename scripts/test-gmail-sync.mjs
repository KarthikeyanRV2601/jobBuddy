import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const output = await mkdtemp(join(tmpdir(), 'jobbuddy-test-'));
const realFetch = globalThis.fetch;
const realTimeout = globalThis.setTimeout;
const realNow = Date.now;
let now = realNow();
// Advance virtual time so retry and Retry-After checks run without real delays.
Date.now = () => now;
globalThis.setTimeout = (fn, ms) => realTimeout(() => { now += ms; fn(); }, 0);
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers });
const refs = (...ids) => ids.map(id => ({ id, threadId: id }));
const message = id => json({ id, threadId: id, payload: { mimeType: 'text/plain', headers: [
  { name: 'Subject', value: 'Thank you for applying for Developer position' },
  { name: 'From', value: 'Example Careers <jobs@example.com>' },
] } });
const options = { accessToken: 'test-only', query: 'application' };
try {
  await build({ entryPoints: ['src/utils/gmailApi.ts', 'src/utils/gmailAutomation.ts', 'src/utils/gmailUi.ts'], bundle: true, platform: 'node', format: 'esm', outdir: output });
  const { fetchGmailMessages } = await import(join(output, 'gmailApi.js'));
  const { syncGmailAndBuildTracker } = await import(join(output, 'gmailAutomation.js'));
  const { getSyncSummary } = await import(join(output, 'gmailUi.js'));

  let active = 0, peak = 0, done = 0;
  globalThis.fetch = async url => {
    const u = new URL(url);
    if (u.pathname.endsWith('/messages')) {
      assert.equal(u.searchParams.get('maxResults'), '50');
      if (u.searchParams.has('pageToken')) {
        assert.equal(done, 7, 'drain first page before listing second');
        return json({ messages: refs('h') });
      }
      return json({ messages: refs('a','b','c','d','e','f','g'), nextPageToken: 'page-2' });
    }
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => realTimeout(resolve, 0));
    active--; done++;
    return message(u.pathname.split('/').at(-1));
  };
  let result = await fetchGmailMessages(options);
  assert.equal(result.messages.length, 8); assert.equal(peak, 3); assert.ok(result.complete);
  console.log('PASS pagination drains pages and caps concurrency at three');

  for (const status of [429, 403, 503]) {
    let attempts = 0;
    globalThis.fetch = async url => new URL(url).pathname.endsWith('/messages')
      ? json({ messages: refs('retry') })
      : ++attempts === 1 ? json({ error: { errors: [{ reason: 'userRateLimitExceeded' }] } }, status, { 'Retry-After': '2' }) : message('retry');
    const start = now;
    result = await fetchGmailMessages(options);
    assert.ok(result.complete); assert.equal(attempts, 2); assert.ok(now - start >= 2000);
  }
  console.log('PASS 429, rate-limit 403, and 503 retry with Retry-After');

  let failedAttempts = 0;
  globalThis.fetch = async url => {
    const path = new URL(url).pathname;
    if (path.endsWith('/profile')) return json({}, 403);
    if (path.endsWith('/messages')) return json({ messages: refs('good','bad') });
    if (path.endsWith('/bad')) { failedAttempts++; return json({}, 404); }
    return message('good');
  };
  const partial = await syncGmailAndBuildTracker(options, [], []);
  assert.equal(partial.complete, false); assert.equal(partial.failedCount, 1);
  assert.equal(partial.fetchedCount, 1); assert.equal(partial.signals.length, 1);
  assert.equal(partial.applications.length, 1); assert.equal(partial.profile, null);
  assert.equal(failedAttempts, 1, 'permanent errors must not retry');
  assert.match(getSyncSummary(partial), /Partial sync/);
  console.log('PASS partial sync saves successful signals and applications despite message/profile failure');

  const downloads = [];
  globalThis.fetch = async url => {
    const path = new URL(url).pathname;
    if (path.endsWith('/profile')) return json({ emailAddress: 'test@example.com' });
    if (path.endsWith('/messages')) return json({ messages: refs('good','bad') });
    downloads.push(path.split('/').at(-1)); return message(path.split('/').at(-1));
  };
  const retried = await syncGmailAndBuildTracker(options, partial.applications, partial.signals);
  assert.deepEqual(downloads, ['bad']); assert.equal(retried.skippedCount, 1);
  assert.equal(retried.signals.length, 2); assert.ok(retried.complete);
  console.log('PASS next sync retries missing messages and retains existing results');

  let attempts = 0;
  globalThis.fetch = async url => new URL(url).pathname.endsWith('/messages')
    ? json({ messages: refs('good','limited','other','deferred') })
    : new URL(url).pathname.endsWith('/limited') ? (attempts++, json({}, 429)) : message('good');
  result = await fetchGmailMessages(options);
  assert.equal(attempts, 4); assert.equal(result.complete, false);
  assert.equal(result.messages.length, 2); assert.equal(result.failedCount, 2);
  console.log('PASS exhausted rate limits stop further batches without losing successes');

  for (const retryAfter of ['120', new Date(now + 120_000).toUTCString()]) {
    attempts = 0;
    globalThis.fetch = async url => new URL(url).pathname.endsWith('/messages')
      ? json({ messages: refs('limited') })
      : (attempts++, json({}, 429, { 'Retry-After': retryAfter }));
    result = await fetchGmailMessages(options);
    assert.equal(attempts, 1); assert.equal(result.complete, false);
  }
  console.log('PASS long numeric/date Retry-After never retries early');

  globalThis.fetch = async url => {
    const u = new URL(url);
    if (u.searchParams.has('pageToken')) return json({}, 401);
    if (u.pathname.endsWith('/messages')) return json({ messages: refs('good'), nextPageToken: 'next' });
    return message('good');
  };
  result = await fetchGmailMessages(options);
  assert.equal(result.messages.length, 1); assert.equal(result.complete, false);
  assert.match(result.warnings.join(), /401/);
  console.log('PASS later page failure retains earlier page results');

  globalThis.fetch = async () => json({}, 401);
  await assert.rejects(fetchGmailMessages(options), /401/);
  console.log('PASS initial authentication failure is reported');
} finally {
  globalThis.fetch = realFetch; globalThis.setTimeout = realTimeout; Date.now = realNow;
  await rm(output, { recursive: true, force: true });
}
