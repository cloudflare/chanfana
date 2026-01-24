import type { z } from "zod";

type JsonContent<T> = {
  content: {
    "application/json": {
      schema: z.ZodType<T>;
    };
  };
};

export const contentJson = <T>(schema: z.ZodType<T>): JsonContent<T> => ({
  content: {
    "application/json": {
      schema: schema,
    },
  },
});
