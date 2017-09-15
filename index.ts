import * as amqp from 'amqplib'
import * as cluster from 'cluster'
import * as deepFreeze from 'deep-freeze'
import * as dotenv from 'dotenv'
import { runInNewContext } from 'vm'

dotenv.config()

const queue = process.env.AMQP_QUEUE as string
const open = amqp.connect(process.env.AMQP_ENDPOINT as string)

if (cluster.isMaster) {
  const worker = cluster.fork()
  open.then((conn) => conn.createChannel()).then((ch) =>
    ch.assertQueue(queue).then((ok) =>
      ch.consume(queue, (msg) => {
        if (msg) {
          ch.ack(msg)
          worker.send(msg.content.toString())
        }
      }),
    ),
  ).catch(console.warn)
} else {
  process.on('message', (msg) => {
    try {
      const message = JSON.parse(msg)
      runInNewContext(message.code, {
        console: deepFreeze({ ...require('console') }),
        http: deepFreeze({ ...require('http') }),
      }, { filename: 'sandboxed.js', timeout: 1e5, displayErrors: true })
    } catch (err) {
      console.warn.apply(console, err)
    }
  })
}
