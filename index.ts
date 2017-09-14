import * as amqp from 'amqplib'
import * as dotenv from 'dotenv'
import { runInNewContext } from 'vm'

dotenv.config()

const queue = process.env.AMQP_QUEUE as string
const open = amqp.connect(process.env.AMQP_ENDPOINT as string)

open.then((conn) => conn.createChannel()).then((ch) =>
  ch.assertQueue(queue).then((ok) =>
    ch.consume(queue, (msg) => {
      if (msg) {
        ch.ack(msg)
        try {
          const message = JSON.parse(msg.content.toString())
          runInNewContext(message.code, { console }, { filename: 'sandboxed.js', timeout: 1e5 })
        } catch (err) {
          console.warn.apply(Object.freeze({ ...console }), err)
        }
      }
    }),
  ),
).catch(console.warn)
