const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, hubspot } = require('../index');
let server, base;
const originalToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const originalGet = hubspot.get;
const originalPost = hubspot.post;
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    process.env.HUBSPOT_PRIVATE_APP_TOKEN = 'test-only-token';
});
after(() => {
    hubspot.get = originalGet;
    hubspot.post = originalPost;
    if (originalToken === undefined) delete process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    else process.env.HUBSPOT_PRIVATE_APP_TOKEN = originalToken;
    return new Promise(resolve => server.close(resolve));
});

test('form contains all three inputs and required navigation', async () => {
    const response = await fetch(`${base}/update-cobj`);
    const html = await response.text();
    assert.equal(response.status, 200);
    for (const name of ['item_name', 'price', 'category']) assert.ok(html.includes(`name="${name}"`));
    assert.ok(html.includes('Return to the homepage'));
    assert.ok(html.includes('Update Custom Object Form | Integrating With HubSpot I Practicum'));
});

test('homepage retrieves every page with custom properties and escapes values', async () => {
    const calls = [];
    hubspot.get = async (url, options) => {
        calls.push({ url, params: options.params });
        return { data: { results: [{ properties: {
            item_name: calls.length === 1 ? '<script>alert(1)</script>' : 'Soup', price: '0', category: 'Starter'
        } }], ...(calls.length === 1 ? { paging: { next: { after: '101' } } } : {}) } };
    };
    const response = await fetch(base);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].params.after, '101');
    assert.equal(calls[0].params.properties, 'item_name,price,category');
    assert.equal(calls[0].url, '/crm/v3/objects/2-254835852');
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('Soup'));
    assert.ok(html.includes('Add to this table'));
});
