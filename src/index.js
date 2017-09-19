const { STATUS_CODES } = require('http')
const { Readable } = require('stream')

const LIMIT_EXCEEDED = '@@ASYNC_HANDLER/LIMIT_EXCEEDED'
const SERIALIZATION_FAILURE = '@@ASYNC_HANDLER/JSON_SERIALIZATION_FAILURE'
const UNKNOWN_TYPE = '@@ASYNC_HANDLER/UNKNOWN_TYPE'
const CLIENT_ERROR = '@@ASYNC_HANDLER/CLIENT_ERROR'

const CONTENT_TYPE = 'Content-Type'
const CONTENT_LENGTH = 'Content-Length'

// TODO: Possibly Wrap this in a call to `createBufferer`... so that the limit is inherant.
const map = new WeakMap()

const buffer = function (incomingMessage, limit = 1000000) {
  // `map` allows multiple calls toe buffer to work as expected.
  if (map.has(incomingMessage)) return Promise.reject(new Error('multiple attempts to buffer same message'))

  // If there's nothing in the cache... return a promise.
  const p = new Promise(function (resolve, reject) {
    let len = 0
    const chunks = []

    incomingMessage.on('data', function (chunk) {
      len += chunk.length
      if (len > limit) return reject(LIMIT_EXCEEDED)
      return chunks.push(chunk)
    })

    incomingMessage.on('end', function () {
      return resolve(Buffer.concat(chunks, len))
    })

    incomingMessage.on('error', function () {
      return reject(CLIENT_ERROR)
    })
  })

  map.set(incomingMessage, p)
  return p
}

const createHandler = function (fn, catcher) {
  return function (req, res) {
    const _catcher = typeof catcher === 'function' ? catcher : function (_, _res) {
      _res.writeHead(500, STATUS_CODES[500], { [CONTENT_LENGTH]: 0 })
      return _res.end()
    }

    fn(req, res).then(function (data) {
      res.statusCode = res.statusCode || 200

      // Nothing was returned... everything has been handled.
      if (data === undefined) return undefined

      if (data === null) {
        res.writeHead(200, STATUS_CODES[200], { [CONTENT_LENGTH]: 0 })
        return res.end()
      }

      // Deal with reabable streams... pipe into the response.ßß
      if (data instanceof Readable) {
        if (!res.getHeader(CONTENT_TYPE)) res.setHeader(CONTENT_TYPE, 'application/octet-stream')
        return data.pipe(res)
      }

      // Deal with an `Object`
      if (typeof data === 'object') {
        try {
          data = JSON.stringify(data, null, 2)
          res.setHeader(CONTENT_TYPE, 'application/json')
        } catch (err) {
          return Promise.reject(SERIALIZATION_FAILURE)
        }
      }

      // We can deal with strings by just converting them to buffers.
      if (typeof data === 'string') data = Buffer.from(data)

      // Deal with `Buffer`
      if (Buffer.isBuffer(data)) {
        if (!res.getHeader(CONTENT_TYPE)) res.setHeader(CONTENT_TYPE, 'application/octet-stream')
        res.setHeader(CONTENT_LENGTH, Buffer.byteLength(data))
        return res.end(data)
      }

      return Promise.reject(UNKNOWN_TYPE)
    }).catch(err => _catcher(res, res, err))
  }
}

module.exports.LIMIT_EXCEEDED = LIMIT_EXCEEDED
module.exports.SERIALIZATION_FAILURE = SERIALIZATION_FAILURE
module.exports.UNKNOWN_TYPE = UNKNOWN_TYPE
module.exports.CLIENT_ERROR = CLIENT_ERROR

module.exports.buffer = buffer
module.exports.createHandler = createHandler
