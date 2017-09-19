/* eslint-disable no-unused-vars*/
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
  const STATUS_TEXT = 'Whoops!!!'
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

  const { headers, status, statusText } = res
  t.true(headers['Content-Type'] === 'application/json')
  t.true(headers['Content-Length'] === 57)
})

test.todo('buffering the body of an incoming message')
test.todo('returning a stream')
test.todo('returning an object')
test.todo('returning a string')
test.todo('returning a buffer')
