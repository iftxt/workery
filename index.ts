import * as amqp from 'amqplib'
import * as cluster from 'cluster'
import * as deepFreeze from 'deep-freeze'
import * as dotenv from 'dotenv'
import * as http from 'http'
import { runInNewContext } from 'vm'

dotenv.config()

const queue = process.env.AMQP_QUEUE as string
const open = amqp.connect(process.env.AMQP_ENDPOINT as string)

const recursiveCall = (names: string, obj: object): any => {
  const keys = names.split('.')
  if (keys.length === 1) {
    return (obj as any)[keys[0]]
  }

  const key = keys.splice(0, 1)[0]
  return recursiveCall(keys.join('.'), (obj as any)[key])
}

const handler = (prev: string) => {
  return {
    get(target: object, name: string) {
      if (typeof (http as any)[name] === 'object') {
        if (prev) {
          prev += '.' + name
        }
        return prox((http as any)[name], handler(prev))
      }
      return recursiveCall(prev + '.' + name, http)
    },
    set: () => {
      return true
    },
  }
}

function prox(obj: object, callback: object) {
  return new Proxy(obj, callback)
}

const proxedHttp = prox({}, {
  get(target: object, name: string) {
    return prox((http as any)[name], handler(name))
  },
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
            http: proxedHttp,
          }, { filename: 'sandboxed.js', timeout: 1e5, displayErrors: true })
        } catch (err) {
          console.warn.apply(console, err)
        }
      }
    })
  })
}).catch(console.warn)
