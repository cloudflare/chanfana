import { getReDocUI, type ReDocOptions, type RouterOptions } from "../../src";

export const redocOptions: ReDocOptions = {
  "show-extensions": "x-filter-fields",
  "disable-search": false,
  "scroll-y-offset": 0,
  "hide-loading": undefined,
};

export const routerOptions: RouterOptions = { redoc_options: redocOptions };
export const defaultHtml: string = getReDocUI("/openapi.json");
export const configuredHtml: string = getReDocUI("/openapi.json", redocOptions);

export const invalidOptions: ReDocOptions = {
  // @ts-expect-error ReDoc HTML attribute values must be primitives, not objects.
  theme: { colors: { primary: { main: "blue" } } },
};
