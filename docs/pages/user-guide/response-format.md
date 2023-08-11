#### Example responses:

Example with common values

```ts
responses = {
  '200': {
    schema: {
      result: {
        series: {
          timestamps: ['2023-01-01 00:00:00'],
          values: [0.56],
        },
      },
    },
  },
}
```

Example with defined types

```ts
responses = {
  '200': {
    schema: {
      result: {
        meta: {
          confidenceInfo: schemaDateRange,
          dateRange: schemaDateRange,
          aggInterval: schemaAggInterval,
          lastUpdated: new DateTime(),
        },
        series: {
          timestamps: [new DateTime()],
          values: [new Str({ example: 0.56 })],
        },
      },
    },
  },
}
```
