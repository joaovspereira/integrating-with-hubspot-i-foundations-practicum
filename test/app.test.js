const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../index');
const properties = { project_name: 'Reading Week', project_type: 'Literacy', target_audience: 'Preschool', project_status: 'Planned' };
async function run(client, action) {
  const server = createApp({ token: 'test-only', objectType: '2-123', client }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await action('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('configuration requires a token and a custom object ID', () => {
  assert.throws(() => createApp({ token: '', objectType: '2-123' }));
  assert.throws(() => createApp({ token: 'test', objectType: 'educational_project' }));
});
test('homepage renders properties safely and provides pagination', async () => {
  await run({ get: async (url, options) => { assert.equal(options.params.after, '123'); return { data: { results: [{ id: '7', properties: { ...properties, project_name: '<script>bad</script>' } }], paging: { next: { after: '456' } } } }; } }, async base => {
    const response = await fetch(base + '/?after=123'); const html = await response.text();
    assert.equal(response.status, 200); assert.match(html, /&lt;script&gt;/); assert.match(html, /after=456/); assert.match(html, /project-form\?id=7/);
  });
});
test('blank form and edit form display expected values', async () => {
  await run({ get: async url => { assert.equal(url, '/7'); return { data: { properties } }; } }, async base => {
    assert.equal((await fetch(base + '/project-form')).status, 200);
    const html = await (await fetch(base + '/project-form?id=7')).text(); assert.match(html, /Reading Week/); assert.match(html, /value="7"/);
    assert.equal((await fetch(base + '/project-form?id=bad')).status, 400);
  });
});
for (const editing of [false, true]) test(editing ? 'updates via PATCH and redirects' : 'creates via POST and redirects', async () => {
  let called = false;
  const write = async (url, data) => { called = true; assert.equal(url, editing ? '/7' : ''); assert.deepEqual(data, { properties }); };
  await run(editing ? { patch: write } : { post: write }, async base => {
    const response = await fetch(base + '/project-form', { method: 'POST', body: new URLSearchParams({ ...properties, record_id: editing ? '7' : '' }), redirect: 'manual' });
    assert.equal(response.status, 303); assert.equal(response.headers.get('location'), '/'); assert.ok(called);
  });
});
test('invalid inputs and cross-origin submissions never reach HubSpot', async () => {
  await run({ post: async () => { assert.fail('Must not call HubSpot'); } }, async base => {
    assert.equal((await fetch(base + '/project-form', { method: 'POST', body: new URLSearchParams({ project_name: 'Only a name' }) })).status, 400);
    assert.equal((await fetch(base + '/project-form', { method: 'POST', headers: { Origin: 'https://other.example' } })).status, 403);
    assert.equal((await fetch(base + '/?after=bad')).status, 400);
  });
});
test('upstream errors return a response without disclosing credentials', async () => {
  await run({ get: async () => { throw { response: { status: 401 }, message: 'secret-token' }; } }, async base => {
    const response = await fetch(base); const html = await response.text(); assert.equal(response.status, 502); assert.doesNotMatch(html, /secret-token/);
  });
});
test('failed save preserves entered fields', async () => {
  await run({ post: async () => { throw { response: { status: 429 } }; } }, async base => {
    const response = await fetch(base + '/project-form', { method: 'POST', body: new URLSearchParams(properties) });
    assert.equal(response.status, 503); assert.match(await response.text(), /Reading Week/);
  });
});
