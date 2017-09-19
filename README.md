# async-handler

[![CircleCI](https://circleci.com/gh/axdg/async-handler.svg?style=shield)](https://circleci.com/gh/axdg/async-handler)  [![Build Status](https://semaphoreci.com/api/v1/axdg/async-handler/branches/master/shields_badge.svg)](https://semaphoreci.com/axdg/async-handler)

> [Everything should be made as simple as possible, but not simpler](https://quoteinvestigator.com/2011/05/13/einstein-simple/)

## Usage

```js
  const { createHandler, buffer } = require('async-handler')
  
  /**
   * A simple echo server...
   *
   * Buffers the request body and
   * sends it back.
   */
  const fn = async function (req) {
    const content = await buffer(req)
    return content
  }

  const handler = createHandler(fn)

  /**
   * Or you could just send the request as
   * the response (piped under the hood).
   */
  const piper = createHandler(asnyc req => req)
```

## API

**WIP: *probably not ready***

**createHandler(*fn[, catcher]*)**

- **fn** (`function`)
- **catcher** (`function`)

**buffer(*incomingMessage[, limit]*)**

- **incomingMessage** (`object`) - an `http.incomingMessage`
- **limit** (`number`) - defaults to `1000000`

## LICENSE

&copy; axdg &bull; ([axdg@dfant.asia](mailto:axdg@dfant.asia))  &bull; 2017
