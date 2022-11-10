# itty-router-openapi

This library provides an easy and compact OpenAPI 3 schema generator and validator 
for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

`itty-router-openapi` as the name says is built on top of the awesome [itty-router](https://github.com/kwhitley/itty-router), 
while improving some core features such as adding class based endpoints.

This library was designed to provide a simple and iterative path for old `itty-router` applications to migrate to this new
Router.

## Features

- [x] Drop-in replacement for existing itty-router applications
- [x] OpenAPI 3 schema generator
- [x] Fully written in typescript
- [x] Class based endpoints
- [x] Query parameters validator
- [x] Path parameters validator
- [ ] Body request validator

## Installation

```
npm install itty-router-openapi --save
```


## Migrating from existing `itty-router` applications

After installing just replace the old `Router` function with the new `OpenAPIRouter` function.

```ts
// Old router
//import { Router } from 'itty-router'
//const router = Router()

// New router
import { OpenAPIRouter } from 'itty-router-openapi'
const router = OpenAPIRouter()

// Old routes remain the same
router.get('/todos', () => new Response('Todos Index!'))
router.get('/todos/:id', ({ params }) => new Response(`Todo #${params.id}`))

...
```

Now, when running the application and going to the `/docs` path, you will already see all your endpoints listed with the query
parameters parsed ready to be invoked.

All of this while changing just one line in your existing code base!

## Basic Usage

```ts

```
