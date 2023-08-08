# itty-router-openapi

This library provides an easy and compact OpenAPI 3 schema generator and validator
for [Cloudflare Workers](https://developers.cloudflare.com/workers/).

`itty-router-openapi` is built on top of [itty-router](https://github.com/kwhitley/itty-router) and extends some of its
core features, such as adding class-based endpoints. It also provides a simple and iterative path for migrating from old
applications based on `itty-router`.

A template repository is available
at [cloudflare/templates](https://github.com/cloudflare/workers-sdk/tree/main/templates/worker-openapi),
with a live demo [here](https://worker-openapi-example.radar.cloudflare.com/docs).

There is a Tutorial Section [available here](https://github.com/cloudflare/itty-router-openapi/blob/main/TUTORIAL.md)!

## Features

- [x] Drop-in replacement for existing itty-router applications
- [x] OpenAPI 3 and 3.1 schema generator and validator
- [x] Query, Path, Request Body and Header validator
- [x] Fully written in typescript
- [x] Class-based endpoints
- [x] Out of the box OpenAI plugin support

## Installation

```
npm i @cloudflare/itty-router-openapi --save
```
