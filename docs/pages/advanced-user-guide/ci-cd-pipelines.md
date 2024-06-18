# CI/CD

For CI/CD pipelines, you can read the complete `openapi.json` schemas by calling the `schema` property from the router
instance.

Here is an example of a nodejs script that would pick the schema, make some changes and write it to a file, to be able
to
be picked from a CI/CD pipeline.

```ts
import fs from 'fs'
import { openAPI } from '../src/router'

// Get the Schema from chanfana
const schema = openAPI.schema

// Optionaly: update the schema with some costumizations for publishing

// Write the final schema
fs.writeFileSync('./public-api.json', JSON.stringify(schema, null, 2))
```
