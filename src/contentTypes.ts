import { z } from "zod";
import { legacyTypeIntoZod } from "./zod/utils";

type JsonContent<T> = {
  content: {
    "application/json": {
      schema: z.ZodType<T>;
    };
  };
};

type InferSchemaType<T> = T extends z.ZodType ? z.infer<T> : T;

export const contentJson = <T>(schema: T): JsonContent<InferSchemaType<T>> => ({
  content: {
    "application/json": {
      schema: schema instanceof z.ZodType ? schema : legacyTypeIntoZod(schema),
    },
  },
});
