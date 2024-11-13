"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ApiException: () => ApiException,
  Arr: () => Arr,
  Bool: () => Bool,
  DateOnly: () => DateOnly,
  DateTime: () => DateTime,
  Email: () => Email,
  Enumeration: () => Enumeration,
  HonoOpenAPIHandler: () => HonoOpenAPIHandler,
  Hostname: () => Hostname,
  InputValidationException: () => InputValidationException,
  Int: () => Int,
  Ip: () => Ip,
  Ipv4: () => Ipv4,
  Ipv6: () => Ipv6,
  IttyRouterOpenAPIHandler: () => IttyRouterOpenAPIHandler,
  MultiException: () => MultiException,
  NotFoundException: () => NotFoundException,
  Num: () => Num,
  Obj: () => Obj,
  OpenAPIHandler: () => OpenAPIHandler,
  OpenAPIRegistryMerger: () => OpenAPIRegistryMerger,
  OpenAPIRoute: () => OpenAPIRoute,
  Regex: () => Regex,
  Str: () => Str,
  UpdateEndpoint: () => UpdateEndpoint,
  Uuid: () => Uuid,
  coerceInputs: () => coerceInputs,
  contentJson: () => contentJson,
  convertParams: () => convertParams,
  extendZodWithOpenApi: () => import_zod_to_openapi5.extendZodWithOpenApi,
  fromHono: () => fromHono,
  fromIttyRouter: () => fromIttyRouter,
  getReDocUI: () => getReDocUI,
  getSwaggerUI: () => getSwaggerUI,
  isAnyZodType: () => isAnyZodType,
  isSpecificZodType: () => isSpecificZodType,
  jsonResp: () => jsonResp,
  legacyTypeIntoZod: () => legacyTypeIntoZod
});
module.exports = __toCommonJS(src_exports);
var import_zod_to_openapi5 = require("@asteasolutions/zod-to-openapi");

// src/openapi.ts
var import_zod_to_openapi2 = require("@asteasolutions/zod-to-openapi");
var import_js_yaml = __toESM(require("js-yaml"));
var import_zod = require("zod");

// src/ui.ts
function getSwaggerUI(schemaUrl, docsPageTitle) {
  schemaUrl = schemaUrl.replace(/\/+(\/|$)/g, "$1");
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="description" content="SwaggerIU"/>
    <title>${docsPageTitle}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" integrity="sha256-QBcPDuhZ0X+SExunBzKaiKBw5PZodNETZemnfSMvYRc=" crossorigin="anonymous">
    <link rel="shortcut icon" href="data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlMb//2ux//9or///ZKz//wlv5f8JcOf/CnXv/why7/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2vi/wZo3/9ytf//b7P//2uw//+BvP//DHbp/w568P8Md+//CnXv/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApv4/8HbOH/lMf//3W3//9ytf//brL//w946v8SfvH/EHzw/w558P8AAAAAAAAAAAAAAAAAAAAAAAAAABF56f8Ndef/C3Dj/whs4f98u///eLn//3W3//+Evv//FoPx/xSA8f8SfvD/EHvw/wAAAAAAAAAAAAAAAA1EeF0WgOz/EXrp/w515v8LceT/lsn//3+9//97u///eLj//xaB7f8YhfL/FoLx/xSA8f8JP/deAAAAAAAAAAAgjfH/HIjw/xeB7P8Te+n/AAAAAAAAAACGwf//gr///369//+Iwf//HIny/xqH8v8YhfL/FYLx/wAAAAAnlfPlJJLy/yGO8v8cifD/GILt/wAAAAAAAAAAmMz//4nD//+Fwf//gb///xyJ8P8ejPP/HIny/xmH8v8XhPLnK5r0/yiW8/8lk/P/IpDy/wAAAAAAAAAAAAAAAAAAAACPx///jMX//4jD//+MxP//IpD0/yCO8/8di/P/G4ny/y6e9f8sm/T/KZj0/yaV8/8AAAAAAAAAAAAAAAAAAAAAlsz//5LJ//+Px///lMn//yaV9P8kkvT/IZD0/x+O8/8yo/blMKD1/y2d9f8qmfT/KJbz/wAAAAAAAAAAqdb//53Q//+Zzv//lsv//yiY8/8qmvX/KJf1/yWV9P8jkvTQAAAAADSl9v8xofX/Lp71/yyb9P8AAAAAAAAAAKfW//+k1P//oNL//6rW//8wofb/Lp72/yuc9f8pmfX/AAAAAAAAAAAcVHtcNab2/zKj9v8voPX/LZz0/7vh//+u2///qtj//6fW//8wofT/NKX3/zKj9/8voPb/F8/6XgAAAAAAAAAAAAAAADmr9/82qPf/M6T2/zCg9f+44f//td///7Hd//++4v//Oqz4/ziq+P81p/f/M6X3/wAAAAAAAAAAAAAAAAAAAAAAAAAAOqz4/zep9//M6///v+X//7vj//+44f//OKn1/z6x+f88rvn/Oaz4/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD6x+f8qmfP/yOv//8bq///C5///z+z//0O3+v9Ctfr/QLP5/z2x+f8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0u///8jr///I6///yOv//zmq9f9Dt/r/Q7f6/0O3+v8AAAAAAAAAAAAAAAAAAAAA8A8AAOAHAADgBwAAwAMAAMADAACGAQAABgAAAA8AAAAPAAAABgAAAIYBAADAAwAAwAMAAOAHAADgBwAA8A8AAA==" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" integrity="sha256-wuSp7wgUSDn/R8FCAgY+z+TlnnCk5xVKJr1Q2IDIi6E=" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js" integrity="sha256-M7em9a/KxJAv35MoG+LS4S2xXyQdOEYG5ubRd0W3+G8=" crossorigin="anonymous"></script>
<script>
    window.onload = () => {
        window.ui = SwaggerUIBundle({
            url: '${schemaUrl}',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis
            ]
        });
    };
</script>
</body>
</html>`;
}
function getReDocUI(schemaUrl, docsPageTitle) {
  schemaUrl = schemaUrl.replace(/\/+(\/|$)/g, "$1");
  return `<!DOCTYPE html>
    <html>
    <head>
    <title>${docsPageTitle}</title>
    <!-- needed for adaptive design -->
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <link rel="shortcut icon" href="data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlMb//2ux//9or///ZKz//wlv5f8JcOf/CnXv/why7/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2vi/wZo3/9ytf//b7P//2uw//+BvP//DHbp/w568P8Md+//CnXv/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApv4/8HbOH/lMf//3W3//9ytf//brL//w946v8SfvH/EHzw/w558P8AAAAAAAAAAAAAAAAAAAAAAAAAABF56f8Ndef/C3Dj/whs4f98u///eLn//3W3//+Evv//FoPx/xSA8f8SfvD/EHvw/wAAAAAAAAAAAAAAAA1EeF0WgOz/EXrp/w515v8LceT/lsn//3+9//97u///eLj//xaB7f8YhfL/FoLx/xSA8f8JP/deAAAAAAAAAAAgjfH/HIjw/xeB7P8Te+n/AAAAAAAAAACGwf//gr///369//+Iwf//HIny/xqH8v8YhfL/FYLx/wAAAAAnlfPlJJLy/yGO8v8cifD/GILt/wAAAAAAAAAAmMz//4nD//+Fwf//gb///xyJ8P8ejPP/HIny/xmH8v8XhPLnK5r0/yiW8/8lk/P/IpDy/wAAAAAAAAAAAAAAAAAAAACPx///jMX//4jD//+MxP//IpD0/yCO8/8di/P/G4ny/y6e9f8sm/T/KZj0/yaV8/8AAAAAAAAAAAAAAAAAAAAAlsz//5LJ//+Px///lMn//yaV9P8kkvT/IZD0/x+O8/8yo/blMKD1/y2d9f8qmfT/KJbz/wAAAAAAAAAAqdb//53Q//+Zzv//lsv//yiY8/8qmvX/KJf1/yWV9P8jkvTQAAAAADSl9v8xofX/Lp71/yyb9P8AAAAAAAAAAKfW//+k1P//oNL//6rW//8wofb/Lp72/yuc9f8pmfX/AAAAAAAAAAAcVHtcNab2/zKj9v8voPX/LZz0/7vh//+u2///qtj//6fW//8wofT/NKX3/zKj9/8voPb/F8/6XgAAAAAAAAAAAAAAADmr9/82qPf/M6T2/zCg9f+44f//td///7Hd//++4v//Oqz4/ziq+P81p/f/M6X3/wAAAAAAAAAAAAAAAAAAAAAAAAAAOqz4/zep9//M6///v+X//7vj//+44f//OKn1/z6x+f88rvn/Oaz4/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD6x+f8qmfP/yOv//8bq///C5///z+z//0O3+v9Ctfr/QLP5/z2x+f8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0u///8jr///I6///yOv//zmq9f9Dt/r/Q7f6/0O3+v8AAAAAAAAAAAAAAAAAAAAA8A8AAOAHAADgBwAAwAMAAMADAACGAQAABgAAAA8AAAAPAAAABgAAAIYBAADAAwAAwAMAAOAHAADgBwAA8A8AAA==" />

    <!--
    ReDoc doesn't change outer page styles
    -->
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
    </head>
    <body>
    <redoc spec-url="${schemaUrl}"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js" integrity="sha256-vlwzMMjDW4/OsppbdVKtRb/8L9lJT+LhqC+pQXnrX48=" crossorigin="anonymous"></script>
    </body>
    </html>`;
}

// src/zod/registry.ts
var import_zod_to_openapi = require("@asteasolutions/zod-to-openapi");
var OpenAPIRegistryMerger = class extends import_zod_to_openapi.OpenAPIRegistry {
  _definitions = [];
  merge(registry) {
    if (!registry || !registry._definitions) return;
    for (const definition of registry._definitions) {
      this._definitions.push({ ...definition });
    }
  }
};

// src/openapi.ts
var OpenAPIHandler = class {
  router;
  options;
  registry;
  allowedMethods = ["get", "head", "post", "put", "delete", "patch"];
  constructor(router, options) {
    this.router = router;
    this.options = options || {};
    this.registry = new OpenAPIRegistryMerger();
    this.createDocsRoutes();
  }
  createDocsRoutes() {
    if (this.options?.docs_url !== null && this.options?.openapi_url !== null) {
      this.router.get(this.options?.docs_url || "/docs", () => {
        return new Response(
          getSwaggerUI(
            (this.options?.base || "") + (this.options?.openapi_url || "/openapi.json"),
            this.options?.docsPageTitle ?? "SwaggerUI"
          ),
          {
            headers: {
              "content-type": "text/html; charset=UTF-8"
            },
            status: 200
          }
        );
      });
    }
    if (this.options?.redoc_url !== null && this.options?.openapi_url !== null) {
      this.router.get(this.options?.redoc_url || "/redocs", () => {
        return new Response(
          getReDocUI(
            (this.options?.base || "") + (this.options?.openapi_url || "/openapi.json"),
            this.options?.docsPageTitle || "ReDocUI"
          ),
          {
            headers: {
              "content-type": "text/html; charset=UTF-8"
            },
            status: 200
          }
        );
      });
    }
    if (this.options?.openapi_url !== null) {
      this.router.get(this.options?.openapi_url || "/openapi.json", () => {
        return new Response(JSON.stringify(this.getGeneratedSchema()), {
          headers: {
            "content-type": "application/json;charset=UTF-8"
          },
          status: 200
        });
      });
      this.router.get(
        (this.options?.openapi_url || "/openapi.json").replace(
          ".json",
          ".yaml"
        ),
        () => {
          return new Response(import_js_yaml.default.dump(this.getGeneratedSchema()), {
            headers: {
              "content-type": "text/yaml;charset=UTF-8"
            },
            status: 200
          });
        }
      );
    }
  }
  getGeneratedSchema() {
    let openapiGenerator = import_zod_to_openapi2.OpenApiGeneratorV31;
    if (this.options?.openapiVersion === "3")
      openapiGenerator = import_zod_to_openapi2.OpenApiGeneratorV3;
    const generator = new openapiGenerator(this.registry.definitions);
    return generator.generateDocument({
      openapi: this.options?.openapiVersion === "3" ? "3.0.3" : "3.1.0",
      info: {
        version: this.options?.schema?.info?.version || "1.0.0",
        title: this.options?.schema?.info?.title || "OpenAPI",
        ...this.options?.schema?.info
      },
      ...this.options?.schema
    });
  }
  registerNestedRouter(params) {
    this.registry.merge(params.nestedRouter.registry);
    return [params.nestedRouter.fetch];
  }
  parseRoute(path) {
    return ((this.options.base || "") + path).replaceAll(/\/+(\/|$)/g, "$1").replaceAll(/:(\w+)/g, "{$1}");
  }
  registerRoute(params) {
    const parsedRoute = this.parseRoute(params.path);
    let schema = void 0;
    let operationId = void 0;
    for (const handler of params.handlers) {
      if (handler.name) {
        operationId = `${params.method}_${handler.name}`;
      }
      if (handler.isRoute === true) {
        schema = new handler({}).getSchemaZod();
        break;
      }
    }
    if (operationId === void 0) {
      operationId = `${params.method}_${parsedRoute.replaceAll("/", "_")}`;
    }
    if (schema === void 0) {
      schema = {
        operationId,
        responses: {
          200: {
            description: "Successful response."
          }
        }
      };
      const parsedParams = ((this.options.base || "") + params.path).match(
        /:(\w+)/g
      );
      if (parsedParams) {
        schema.request = {
          // TODO: make sure this works
          params: import_zod.z.object(
            parsedParams.reduce(
              // matched parameters start with ':' so replace the first occurrence with nothing
              (obj, item) => Object.assign(obj, {
                [item.replace(":", "")]: import_zod.z.string()
              }),
              {}
            )
          )
        };
      }
    } else {
      if (!schema.operationId) {
        if (this.options?.generateOperationIds === false && !schema.operationId) {
          throw new Error(`Route ${params.path} don't have operationId set!`);
        }
        schema.operationId = operationId;
      }
    }
    this.registry.registerPath({
      ...schema,
      // @ts-ignore
      method: params.method,
      path: parsedRoute
    });
    return params.handlers.map((handler) => {
      if (handler.isRoute) {
        return (...params2) => new handler({
          router: this
          // raiseUnknownParameters: openapiConfig.raiseUnknownParameters,  TODO
        }).execute(...params2);
      }
      return handler;
    });
  }
  handleCommonProxy(target, prop, ...args) {
    if (prop === "middleware") {
      return [];
    }
    if (prop === "isChanfana") {
      return true;
    }
    if (prop === "original") {
      return this.router;
    }
    if (prop === "schema") {
      return this.getGeneratedSchema();
    }
    if (prop === "registry") {
      return this.registry;
    }
    return void 0;
  }
  getRequest(args) {
    throw new Error("getRequest not implemented");
  }
  getUrlParams(args) {
    throw new Error("getUrlParams not implemented");
  }
};

// src/parameters.ts
var import_zod_to_openapi3 = require("@asteasolutions/zod-to-openapi");
var import_zod2 = require("zod");

// src/zod/utils.ts
function isAnyZodType(schema) {
  return schema._def !== void 0;
}
function isSpecificZodType(field, typeName) {
  return field._def.typeName === typeName || field._def.innerType?._def.typeName === typeName || field._def.schema?._def.innerType?._def.typeName === typeName || field.unwrap?.()._def.typeName === typeName || field.unwrap?.().unwrap?.()._def.typeName === typeName || field._def.innerType?._def?.innerType?._def?.typeName === typeName;
}
function legacyTypeIntoZod(type, params) {
  params = params || {};
  if (type === null) {
    return Str({ required: false, ...params });
  }
  if (isAnyZodType(type)) {
    if (params) {
      return convertParams(type, params);
    }
    return type;
  }
  if (type === String) {
    return Str(params);
  }
  if (typeof type === "string") {
    return Str({ example: type });
  }
  if (type === Number) {
    return Num(params);
  }
  if (typeof type === "number") {
    return Num({ example: type });
  }
  if (type === Boolean) {
    return Bool(params);
  }
  if (typeof type === "boolean") {
    return Bool({ example: type });
  }
  if (type === Date) {
    return DateTime(params);
  }
  if (Array.isArray(type)) {
    if (type.length === 0) {
      throw new Error("Arr must have a type");
    }
    return Arr(type[0], params);
  }
  if (typeof type === "object") {
    return Obj(type, params);
  }
  return type(params);
}

// src/parameters.ts
(0, import_zod_to_openapi3.extendZodWithOpenApi)(import_zod2.z);
function convertParams(field, params) {
  params = params || {};
  if (params.required === false)
    field = field.optional();
  if (params.description) field = field.describe(params.description);
  if (params.default)
    field = field.default(params.default);
  if (params.example) {
    field = field.openapi({ example: params.example });
  }
  if (params.format) {
    field = field.openapi({ format: params.format });
  }
  return field;
}
function Arr(innerType, params) {
  return convertParams(legacyTypeIntoZod(innerType).array(), params);
}
function Obj(fields, params) {
  const parsed = {};
  for (const [key, value] of Object.entries(fields)) {
    parsed[key] = legacyTypeIntoZod(value);
  }
  return convertParams(import_zod2.z.object(parsed), params);
}
function Num(params) {
  return convertParams(import_zod2.z.number(), params).openapi({
    type: "number"
  });
}
function Int(params) {
  return convertParams(import_zod2.z.number().int(), params).openapi({
    type: "integer"
  });
}
function Str(params) {
  return convertParams(import_zod2.z.string(), params);
}
function DateTime(params) {
  return convertParams(
    import_zod2.z.string().datetime({
      message: "Must be in the following format: YYYY-mm-ddTHH:MM:ssZ"
    }),
    params
  );
}
function Regex(params) {
  return convertParams(
    // @ts-ignore
    import_zod2.z.string().regex(params.pattern, params.patternError || "Invalid"),
    params
  );
}
function Email(params) {
  return convertParams(import_zod2.z.string().email(), params);
}
function Uuid(params) {
  return convertParams(import_zod2.z.string().uuid(), params);
}
function Hostname(params) {
  return convertParams(
    import_zod2.z.string().regex(
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/
    ),
    params
  );
}
function Ipv4(params) {
  return convertParams(import_zod2.z.string().ip({ version: "v4" }), params);
}
function Ipv6(params) {
  return convertParams(import_zod2.z.string().ip({ version: "v6" }), params);
}
function Ip(params) {
  return convertParams(import_zod2.z.string().ip(), params);
}
function DateOnly(params) {
  return convertParams(import_zod2.z.date(), params);
}
function Bool(params) {
  return convertParams(import_zod2.z.boolean(), params).openapi({
    type: "boolean"
  });
}
function Enumeration(params) {
  let { values } = params;
  const originalValues = { ...values };
  if (Array.isArray(values))
    values = Object.fromEntries(values.map((x) => [x, x]));
  const originalKeys = Object.keys(values);
  if (params.enumCaseSensitive === false) {
    values = Object.keys(values).reduce((accumulator, key) => {
      accumulator[key.toLowerCase()] = values[key];
      return accumulator;
    }, {});
  }
  const keys = Object.keys(values);
  let field;
  if ([void 0, true].includes(params.enumCaseSensitive)) {
    field = import_zod2.z.enum(keys);
  } else {
    field = import_zod2.z.preprocess((val) => String(val).toLowerCase(), import_zod2.z.enum(keys)).openapi({ enum: originalKeys });
  }
  field = field.transform((val) => values[val]);
  const result = convertParams(field, params);
  result.values = originalValues;
  return result;
}
function coerceInputs(data, schema) {
  if (data.size === 0 || data.size === void 0 && typeof data === "object" && Object.keys(data).length === 0) {
    return null;
  }
  const params = {};
  const entries = data.entries ? data.entries() : Object.entries(data);
  for (let [key, value] of entries) {
    if (value === "") {
      value = null;
    }
    if (params[key] === void 0) {
      params[key] = value;
    } else if (!Array.isArray(params[key])) {
      params[key] = [params[key], value];
    } else {
      params[key].push(value);
    }
    let innerType;
    if (schema && schema.shape && schema.shape[key]) {
      innerType = schema.shape[key];
    } else if (schema) {
      innerType = schema;
    }
    if (innerType) {
      if (isSpecificZodType(innerType, "ZodArray") && !Array.isArray(params[key])) {
        params[key] = [params[key]];
      } else if (isSpecificZodType(innerType, "ZodBoolean")) {
        const _val = params[key].toLowerCase().trim();
        if (_val === "true" || _val === "false") {
          params[key] = _val === "true";
        }
      } else if (isSpecificZodType(innerType, "ZodNumber") || innerType instanceof import_zod2.z.ZodNumber) {
        params[key] = Number.parseFloat(params[key]);
      } else if (isSpecificZodType(innerType, "ZodBigInt") || innerType instanceof import_zod2.z.ZodBigInt) {
        params[key] = Number.parseInt(params[key]);
      } else if (isSpecificZodType(innerType, "ZodDate") || innerType instanceof import_zod2.z.ZodDate) {
        params[key] = new Date(params[key]);
      }
    }
  }
  return params;
}

// src/route.ts
var import_zod_to_openapi4 = require("@asteasolutions/zod-to-openapi");
var import_zod3 = require("zod");

// src/utils.ts
function jsonResp(data, params) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json;charset=UTF-8"
    },
    // @ts-ignore
    status: params?.status ? params.status : 200,
    ...params
  });
}

// src/route.ts
(0, import_zod_to_openapi4.extendZodWithOpenApi)(import_zod3.z);
var OpenAPIRoute = class {
  handle(...args) {
    throw new Error("Method not implemented.");
  }
  static isRoute = true;
  args = [];
  // Args the execute() was called with
  validatedData = void 0;
  // this acts as a cache, in case the users calls the validate method twice
  params;
  schema = {};
  constructor(params) {
    this.params = params;
  }
  async getValidatedData() {
    const request = this.params.router.getRequest(this.args);
    if (this.validatedData !== void 0) return this.validatedData;
    const data = await this.validateRequest(request);
    this.validatedData = data;
    return data;
  }
  getSchema() {
    return this.schema;
  }
  getSchemaZod() {
    const schema = { ...this.getSchema() };
    if (!schema.responses) {
      schema.responses = {
        "200": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: {}
            }
          }
        }
      };
    }
    return schema;
  }
  handleValidationError(errors) {
    return jsonResp(
      {
        errors,
        success: false,
        result: {}
      },
      {
        status: 400
      }
    );
  }
  async execute(...args) {
    this.validatedData = void 0;
    this.args = args;
    let resp;
    try {
      resp = await this.handle(...args);
    } catch (e) {
      if (e instanceof import_zod3.z.ZodError) {
        return this.handleValidationError(e.errors);
      }
      throw e;
    }
    if (!(resp instanceof Response) && typeof resp === "object") {
      return jsonResp(resp);
    }
    return resp;
  }
  async validateRequest(request) {
    const schema = this.getSchemaZod();
    const unvalidatedData = {};
    const rawSchema = {};
    if (schema.request?.params) {
      rawSchema.params = schema.request?.params;
      unvalidatedData.params = coerceInputs(
        this.params.router.getUrlParams(this.args),
        schema.request?.params
      );
    }
    if (schema.request?.query) {
      rawSchema.query = schema.request?.query;
      unvalidatedData.query = {};
    }
    if (schema.request?.headers) {
      rawSchema.headers = schema.request?.headers;
      unvalidatedData.headers = {};
    }
    const { searchParams } = new URL(request.url);
    const queryParams = coerceInputs(searchParams, schema.request?.query);
    if (queryParams !== null) unvalidatedData.query = queryParams;
    if (schema.request?.headers) {
      const tmpHeaders = {};
      for (const header of Object.keys(schema.request?.headers.shape)) {
        tmpHeaders[header] = request.headers.get(header);
      }
      unvalidatedData.headers = coerceInputs(
        tmpHeaders,
        schema.request?.headers
      );
    }
    if (request.method.toLowerCase() !== "get" && schema.request?.body && schema.request?.body.content["application/json"] && schema.request?.body.content["application/json"].schema) {
      rawSchema.body = schema.request.body.content["application/json"].schema;
      try {
        unvalidatedData.body = await request.json();
      } catch (e) {
        unvalidatedData.body = {};
      }
    }
    let validationSchema = import_zod3.z.object(rawSchema);
    if (this.params?.raiseUnknownParameters === void 0 || this.params?.raiseUnknownParameters === true) {
      validationSchema = validationSchema.strict();
    }
    return await validationSchema.parseAsync(unvalidatedData);
  }
};

// src/contentTypes.ts
var import_zod4 = require("zod");
var contentJson = (schema) => ({
  content: {
    "application/json": {
      schema: schema instanceof import_zod4.z.ZodType ? schema : legacyTypeIntoZod(schema)
    }
  }
});

// src/adapters/ittyRouter.ts
var IttyRouterOpenAPIHandler = class extends OpenAPIHandler {
  getRequest(args) {
    return args[0];
  }
  getUrlParams(args) {
    return args[0].params;
  }
};
function fromIttyRouter(router, options) {
  const openapiRouter = new IttyRouterOpenAPIHandler(router, options);
  return new Proxy(router, {
    get: (target, prop, ...args) => {
      const _result = openapiRouter.handleCommonProxy(target, prop, ...args);
      if (_result !== void 0) {
        return _result;
      }
      return (route, ...handlers) => {
        if (prop !== "fetch") {
          if (handlers.length === 1 && handlers[0].isChanfana === true) {
            handlers = openapiRouter.registerNestedRouter({
              method: prop,
              path: route,
              nestedRouter: handlers[0]
            });
          } else if (openapiRouter.allowedMethods.includes(prop)) {
            handlers = openapiRouter.registerRoute({
              method: prop,
              path: route,
              handlers
            });
          }
        }
        return Reflect.get(target, prop, ...args)(route, ...handlers);
      };
    }
  });
}

// src/adapters/hono.ts
var HonoOpenAPIHandler = class extends OpenAPIHandler {
  getRequest(args) {
    return args[0].req.raw;
  }
  getUrlParams(args) {
    return args[0].req.param();
  }
};
function fromHono(router, options) {
  const openapiRouter = new HonoOpenAPIHandler(router, options);
  return new Proxy(router, {
    get: (target, prop, ...args) => {
      const _result = openapiRouter.handleCommonProxy(target, prop, ...args);
      if (_result !== void 0) {
        return _result;
      }
      return (route, ...handlers) => {
        if (prop !== "fetch") {
          if (handlers.length === 1 && handlers[0].isChanfana === true) {
            handlers = openapiRouter.registerNestedRouter({
              method: prop,
              path: route,
              nestedRouter: handlers[0]
            });
          } else if (openapiRouter.allowedMethods.includes(prop)) {
            handlers = openapiRouter.registerRoute({
              method: prop,
              path: route,
              handlers
            });
          }
        }
        return Reflect.get(target, prop, ...args)(route, ...handlers);
      };
    }
  });
}

// src/exceptions.ts
var ApiException = class _ApiException extends Error {
  isVisible = false;
  message;
  default_message = "Internal Error";
  status = 500;
  code = 7e3;
  includesPath = false;
  constructor(message) {
    super(message);
    this.message = message || this.default_message;
  }
  buildResponse() {
    return [
      {
        code: this.code,
        message: this.isVisible ? this.message : "Internal Error"
      }
    ];
  }
  static schema() {
    const inst = new _ApiException();
    const innerError = {
      code: inst.code,
      message: inst.default_message
    };
    if (inst.includesPath === true) {
      innerError.path = ["body", "fieldName"];
    }
    return {
      [inst.status]: {
        description: inst.default_message,
        ...contentJson({
          success: false,
          errors: [innerError]
        })
      }
    };
  }
};
var InputValidationException = class extends ApiException {
  isVisible = true;
  default_message = "Input Validation Error";
  status = 400;
  code = 7001;
  path = null;
  includesPath = true;
  constructor(message, path) {
    super(message);
    this.path = path;
  }
  buildResponse() {
    return [
      {
        code: this.code,
        message: this.isVisible ? this.message : "Internal Error",
        path: this.path
      }
    ];
  }
};
var MultiException = class extends Error {
  isVisible = true;
  errors;
  status = 400;
  constructor(errors) {
    super("Multiple Exceptions");
    this.errors = errors;
    for (const err of errors) {
      if (err.status > this.status) {
        this.status = err.status;
      }
      if (!err.isVisible && this.isVisible) {
        this.isVisible = false;
      }
    }
  }
  buildResponse() {
    return this.errors.map((err) => err.buildResponse()[0]);
  }
};
var NotFoundException = class extends ApiException {
  isVisible = true;
  default_message = "Not Found";
  status = 404;
  code = 7002;
};

// src/endpoints/create.ts
var import_zod5 = require("zod");

// src/endpoints/delete.ts
var import_zod6 = require("zod");

// src/endpoints/fetch.ts
var import_zod7 = require("zod");

// src/endpoints/list.ts
var import_zod8 = require("zod");

// src/endpoints/update.ts
var import_zod9 = require("zod");
var UpdateEndpoint = class extends OpenAPIRoute {
  model = import_zod9.z.object({});
  primaryKey;
  pathParameters;
  serializer = (obj) => obj;
  getSchema() {
    const bodyParameters = this.model.omit(
      (this.pathParameters || []).reduce((a, v) => ({ ...a, [v]: true }), {})
    );
    const pathParameters = this.model.pick(
      (this.pathParameters || []).reduce((a, v) => ({ ...a, [v]: true }), {})
    );
    return {
      request: {
        body: contentJson(bodyParameters),
        params: pathParameters,
        ...this.schema?.request
      },
      responses: {
        "200": {
          description: "Returns the updated Object",
          ...contentJson({
            success: Boolean,
            result: this.model
          }),
          ...this.schema?.responses?.[200]
        },
        ...NotFoundException.schema(),
        ...this.schema?.responses
      },
      ...this.schema
    };
  }
  async getFilters() {
    const data = await this.getValidatedData();
    const filters = [];
    const updatedData = {};
    for (const part of [data.params, data.body]) {
      if (part) {
        for (const [key, value] of Object.entries(part)) {
          if ((this.primaryKey || []).includes(key)) {
            filters.push({
              field: key,
              operator: "EQ",
              value
            });
          } else {
            updatedData[key] = value;
          }
        }
      }
    }
    return {
      filters,
      updatedData
    };
  }
  async before(oldObj, filters) {
    return filters;
  }
  async after(data) {
    return data;
  }
  async getObject(filters) {
    return null;
  }
  async update(oldObj, filters) {
    return oldObj;
  }
  async handle(...args) {
    let filters = await this.getFilters();
    const oldObj = await this.getObject(filters);
    if (oldObj === null) {
      throw new NotFoundException();
    }
    filters = await this.before(oldObj, filters);
    let obj = await this.update(oldObj, filters);
    obj = await this.after(obj);
    return {
      success: true,
      result: this.serializer(obj)
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApiException,
  Arr,
  Bool,
  DateOnly,
  DateTime,
  Email,
  Enumeration,
  HonoOpenAPIHandler,
  Hostname,
  InputValidationException,
  Int,
  Ip,
  Ipv4,
  Ipv6,
  IttyRouterOpenAPIHandler,
  MultiException,
  NotFoundException,
  Num,
  Obj,
  OpenAPIHandler,
  OpenAPIRegistryMerger,
  OpenAPIRoute,
  Regex,
  Str,
  UpdateEndpoint,
  Uuid,
  coerceInputs,
  contentJson,
  convertParams,
  extendZodWithOpenApi,
  fromHono,
  fromIttyRouter,
  getReDocUI,
  getSwaggerUI,
  isAnyZodType,
  isSpecificZodType,
  jsonResp,
  legacyTypeIntoZod
});
