const test = require('ava')
const { createIncomingMessage, createServerResponse } = require('http-interfaces')
const { createHandler, buffer } = require('../src/index.js')

test('async handler creation', async function (t) {
  const CONTENT = 'body { background: cornFlourBlue  }'
  const STATUS_TEXT = 'BOOM!'

  /**
   * A minimal handler.
   */
  const fn = async function (req, res) {
    res.writeHead(200, STATUS_TEXT, { 'Content-Type': 'text/css' })
    return CONTENT
  }

  const req = createIncomingMessage('irrelevant content')
  const res = createServerResponse()

  const ret = await createHandler(fn)(req, res)
  t.true(ret === undefined)

  const d = await res.buffer().then(b => b.toString())
  t.true(d === CONTENT)

  const { headers, status, statusText } = res
  t.true(headers['Content-Type'] === 'text/css')
  t.true(headers['Content-Length'] === 35)
  t.true(status === 200)
  t.true(statusText === STATUS_TEXT)
})

// TODO: Catch the error thrown... pass a number or something.
test('async handler with an error handler', async function (t) {
  const ERROR_MESSAGE = 'some error!!!'
  const MESSAGE = '/** ¯\_(ツ)_/¯ */' // eslint-disable-line no-useless-escape

  const fn = async function () {
    throw new Error(ERROR_MESSAGE)
  }

  const handler = async function (_, res, err) {
    const data = Buffer.from(JSON.stringify({
      error: err.message,
      message: MESSAGE,
    }))

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Length', Buffer.byteLength(data))
    res.end(data)
  }

  const req = createIncomingMessage()
  const res = createServerResponse()

  const ret = await createHandler(fn, handler)(req, res)
  t.true(ret === undefined)

  const { error, message } = await res.buffer().then(b => JSON.parse(b.toString()))
  t.true(error === ERROR_MESSAGE)
  t.true(message === MESSAGE)

  const { headers } = res
  t.true(headers['Content-Type'] === 'application/json')
  t.true(headers['Content-Length'] === 57)
})

// TODO: What about rejection because of a client error?
test('buffering the body of an incoming message', async function (t) {
  const CONTENT = 'some text content of the incoming message'
  let req = createIncomingMessage(CONTENT)

  const data = await buffer(req)
  t.true(data.toString() === CONTENT)

  req = createIncomingMessage(CONTENT)
  let err = false
  try {
    /**
     * TODO: There is a bug here... this errors... but since the promise is
     * shared it will stop buffering even if some other call to buffer
     * requires a greater limit.
     */
    await buffer(req, 16)
  } catch (_) { err = true }
  t.true(err)
})

// TODO: All of the tests below require header inspection.
test('returning a stream', async function (t) {
  const CONTENT = 'some echo content... just passing through'

  const fn = req => Promise.resolve(req)

  const req = createIncomingMessage(CONTENT)
  const res = createServerResponse()

  const ret = await createHandler(fn)(req, res)
  t.true(ret === undefined)

  const data = await res.buffer().then(b => b.toString())
  t.true(data === CONTENT)

  // TODO: Inspect the headers.
})

test('returning an object', async function (t) {
  const CONTENT = 'ROFL'

  const fn = async function () {
    return { content: CONTENT }
  }

  const req = createIncomingMessage(CONTENT)
  const res = createServerResponse()

  const ret = await createHandler(fn)(req, res)
  t.true(ret === undefined)

  const { content } = await res.buffer().then(b => JSON.parse(b.toString()))
  t.true(content === CONTENT)
})

test('returning a string', async function (t) {
  const CONTENT = 'ROFL'

  const fn = () => Promise.resolve(CONTENT)

  const req = createIncomingMessage()
  const res = createServerResponse()

  const ret = await createHandler(fn)(req, res)
  t.true(ret === undefined)

  const data = await res.buffer().then(b => b.toString())
  t.true(data === CONTENT)
})

test('returning a buffer', async function (t) {
  const CONTENT = Buffer.from('ROFL')

  const fn = async () => CONTENT

  const req = createIncomingMessage()
  const res = createServerResponse()

  const ret = await createHandler(fn)(req, res)
  t.true(ret === undefined)

  const data = await res.buffer().then(b => b.toString())
  t.true(data === CONTENT.toString())
})
