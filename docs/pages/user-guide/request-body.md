
#### Example requestBody:

```ts
requestBody = {
  datasetId: new Int({ example: 3 }),
  search: new Str(),
}
```


## Request Body Validation

The `requestBody` is defined the same way as the normal `parameters`.
The validated data will be available inside the `body` property in the `data` argument.

Remember that `requestBody` is only available when the route method is not `GET`.

```ts
export class ToDoCreate extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Create a new Todo',
    requestBody: {
      title: String,
      description: new Str({ required: false }),
      type: new Enumeration({
        values: {
          nextWeek: 'nextWeek',
          nextMonth: 'nextMonth',
        }
      })
    },
    responses: {
      '200': {
        schema: {
          todo: {
            id: 123,
            title: 'My title',
          },
        },
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    const { body } = data

    // Actually insert the data somewhere

    return {
      todo: {
        id: 123,
        title: body.title,
      },
    }
  }
}

...

router.post('/todos', ToDoCreate)
```
