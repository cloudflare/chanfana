# itty-router-openapi

This library provides an easy and compact OpenAPI 3 schema generator and validator for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

`itty-router-openapi` as the name says is built on top of the awesome [itty-router](https://github.com/kwhitley/itty-router), while improving some core features such
as adding class based endpoints.

## Features

- [x] Drop-in replacement for existing itty-router applications
- [x] OpenAPI 3 schema generator.
- [x] Fully written in typescript
- [x] Class based endpoints
- [x] Query parameters validator
- [x] Path parameters validator
- [ ] Body request validator

## Installation

```
npm install itty-router-openapi
```

After installing just replace the old `Router` function with the new `OpenAPIRouter` function

```ts
//import { Router } from 'itty-router'
import { OpenAPIRouter } from 'itty-router-openapi'

//const router = Router()
const router = OpenAPIRouter()

router.get('/todos', () => new Response('Todos Index!'))

router.get('/todos/:id', ({ params }) => new Response(`Todo #${params.id}`))

router.post('/todos', async (request) => {
  const content = await request.json()

  return new Response('Creating Todo: ' + JSON.stringify(content))
})

router.all('*', () => new Response('Not Found.', { status: 404 }))

addEventListener('fetch', (event) => event.respondWith(router.handle(event.request)))
```

When running the application and going to the `/docs` you will already see all your endpoints listed with the query
parameters parsed ready to be invoked.

All of this while changing just one line in your existing code base!

## Basic Usage

```ts

```
