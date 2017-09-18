const { STATUS_CODES } = require('http')
const { Readable } = require('stream')

const LIMIT_EXCEEDED = '@@ASYNC_HANDLER/LIMIT_EXCEEDED'
const SERIALIZATION_FAILURE = '@@ASYNC_HANDLER/JSON_SERIALIZATION_FAILURE'
const UNKNOWN_TYPE = '@@ASYNC_HANDLER/UNKNOWN_TYPE'
const CLIENT_ERROR = '@@ASYNC_HANDLER/CLIENT_ERROR'

const CONTENT_TYPE = 'Content-Type'
const CONTENT_LENGTH = 'Content-Length'

const map = new WeakMap()

const buffer = function (incomingMessage, limit = 1000000) {
  if (map.has(incomingMessage)) return map.get(incomingMessage)

  // Otherwise this is the first cache hit... create the new promise.
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
    const p = fn(res, res)

    /**
     * Handle a promise resolution.
     */
    const x = p.then(function (data) {
      res.statusCode = res.statusCode || 200

      // Nothing was returned... everything has been handled.
      if (data === undefined) return undefined

      // Deal with `stream.Readable`
      if (data === null) {
        res.writeHead(200, STATUS_CODES[200], { [CONTENT_LENGTH]: 0 })
        return res.end()
      }

      if (data instanceof Readable) {
        if (!res.getHeader(CONTENT_TYPE)) res.setHeader(CONTENT_TYPE, 'application/octet-stream')
        return res.pipe(data)
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

      // Strings should be converted to a buffer.
      if (typeof data === 'string') data = Buffer.from(data)

      // Deal with `Buffer`
      if (Buffer.isBuffer(data)) {
        if (!res.getHeader(CONTENT_TYPE)) res.setHeader(CONTENT_TYPE, 'application/octet-stream')
        return res.setHeader(CONTENT_LENGTH, Buffer.byteLength(data))
      }

      return Promise.reject(UNKNOWN_TYPE)
    })

    const _catcher = typeof catcher === 'function' ? catcher : function () {
      res.writeHead(500, STATUS_CODES[500], { [CONTENT_LENGTH]: 0 })
      return res.end()
    }

    /**
     * Handles promise rejection... this really should be happening in prod though.
     */
    x.catch(_catcher)
  }
}

module.exports.LIMIT_EXCEEDED = LIMIT_EXCEEDED
module.exports.SERIALIZATION_FAILURE = SERIALIZATION_FAILURE
module.exports.UNKNOWN_TYPE = UNKNOWN_TYPE

module.exports.buffer = buffer
module.exports.createHandler = createHandler
