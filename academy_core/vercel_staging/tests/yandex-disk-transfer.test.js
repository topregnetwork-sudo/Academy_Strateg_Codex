const test = require('node:test')
const assert = require('node:assert/strict')
const { listFolder, uploadFile, publishResource } = require('../lib/yandex-disk')

test('lists a folder with bounded fields', async () => {
  const calls = []
  const result = await listFolder('root/folder', 'secret', async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ type: 'dir', _embedded: { items: [] } }), { status: 200 })
  })
  assert.equal(result.type, 'dir')
  assert.match(calls[0].url, /resources\?/)
  assert.equal(calls[0].options.headers.Authorization, 'OAuth secret')
})

test('uploads only through provider upload href', async () => {
  const calls = []
  const result = await uploadFile('root/file.bin', Buffer.from('ok'), 'secret', async (url, options = {}) => {
    calls.push({ url: String(url), options })
    if (calls.length === 1) return new Response(JSON.stringify({ href: 'https://upload.example/once' }), { status: 200 })
    return new Response('', { status: 201 })
  })
  assert.deepEqual(result, { created: true, existed: false })
  assert.equal(calls[1].url, 'https://upload.example/once')
  assert.equal(calls[1].options.method, 'PUT')
})

test('publishes and requires public url readback', async () => {
  let count = 0
  const result = await publishResource('root/folder', 'secret', async () => {
    count += 1
    if (count === 1) return new Response('', { status: 202 })
    return new Response(JSON.stringify({ type: 'dir', public_url: 'https://disk.yandex.test/public' }), { status: 200 })
  })
  assert.equal(result.public_url, 'https://disk.yandex.test/public')
})
