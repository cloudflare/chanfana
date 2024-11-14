import { Context, Hono } from 'hono'

const app = new Hono()

app.get('/asd/', (c) => {
  c.set('asd', 'asdd')
  return c.text('Hello Hono!')
})

export default app

Context
