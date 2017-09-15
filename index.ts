import * as amqp from 'amqplib'
import * as cluster from 'cluster'
import * as deepFreeze from 'deep-freeze'
import * as dotenv from 'dotenv'
import { runInNewContext } from 'vm'
import * as http from 'http'

dotenv.config()

const queue = process.env.AMQP_QUEUE as string
const open = amqp.connect(process.env.AMQP_ENDPOINT as string)

const recursiveCall = (names, obj) => {
  const keys = names.split('.')
  if (keys.length === 1) {
    return obj[keys[0]]
  }
  const key = keys.splice(0, 1)
  return recursiveCall(keys.join('.'), obj[key])
}

const _handler = (prev) => {
  return {
    get: function (target, name) {
      if (typeof http[name] === 'object') {
        if (prev) _prev += '.' + name
        return prox(http[name], handler(prev))
      }
      return recursiveCall(prev + '.' + name, http)
    },
    set: () => {
      return true
    }
  }
}

function prox (obj, handler) {
  return new Proxy(obj, handler)
}

const _http = new prox({}, {
  get: function(target, name) {
    return prox(http[name], _handler(name))
  }
})

open.then((conn) => conn.createChannel()).then((ch) => {
  ch.assertQueue(queue).then((ok) => {
    ch.consume(queue, (msg) => {
      if (msg) {
        ch.ack(msg)
        try {
          const message = JSON.parse(msg.content.toString())
          runInNewContext(message.code, {
            console: deepFreeze({ ...require('console') }),
            http: _http,
          }, { filename: 'sandboxed.js', timeout: 1e5, displayErrors: true })
        } catch (err) {
          console.warn.apply(console, err)
        }
      }
    })
  })
}).catch(console.warn)
