import {
	OpenApiGeneratorV3,
	OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import yaml from "js-yaml";
import { z } from "zod";
import type { OpenAPIRoute } from "./route";
import type { OpenAPIRouteSchema, RouterOptions } from "./types";
import { getReDocUI, getSwaggerUI } from "./ui";
import { OpenAPIRegistryMerger } from "./zod/registry";

export type OpenAPIRouterType<M> = {
	original: M;
	options: RouterOptions;
	registry: OpenAPIRegistryMerger;

	delete(path: string, endpoint: typeof OpenAPIRoute): M;
	get(path: string, endpoint: typeof OpenAPIRoute): M;
	head(path: string, endpoint: typeof OpenAPIRoute): M;
	patch(path: string, endpoint: typeof OpenAPIRoute): M;
	post(path: string, endpoint: typeof OpenAPIRoute): M;
	put(path: string, endpoint: typeof OpenAPIRoute): M;
	all(path: string, router: M): M;
};

export class OpenAPIHandler {
	router: any;
	options: RouterOptions;
	registry: OpenAPIRegistryMerger;

	allowedMethods = ["get", "head", "post", "put", "delete", "patch"];

	constructor(router: any, options?: RouterOptions) {
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
						(this.options?.base || "") +
							(this.options?.openapi_url || "/openapi.json"),
						this.options?.docsPageTitle ?? 'SwaggerUI',
						this.options.faviconHref ?? 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlMb//2ux//9or///ZKz//wlv5f8JcOf/CnXv/why7/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2vi/wZo3/9ytf//b7P//2uw//+BvP//DHbp/w568P8Md+//CnXv/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApv4/8HbOH/lMf//3W3//9ytf//brL//w946v8SfvH/EHzw/w558P8AAAAAAAAAAAAAAAAAAAAAAAAAABF56f8Ndef/C3Dj/whs4f98u///eLn//3W3//+Evv//FoPx/xSA8f8SfvD/EHvw/wAAAAAAAAAAAAAAAA1EeF0WgOz/EXrp/w515v8LceT/lsn//3+9//97u///eLj//xaB7f8YhfL/FoLx/xSA8f8JP/deAAAAAAAAAAAgjfH/HIjw/xeB7P8Te+n/AAAAAAAAAACGwf//gr///369//+Iwf//HIny/xqH8v8YhfL/FYLx/wAAAAAnlfPlJJLy/yGO8v8cifD/GILt/wAAAAAAAAAAmMz//4nD//+Fwf//gb///xyJ8P8ejPP/HIny/xmH8v8XhPLnK5r0/yiW8/8lk/P/IpDy/wAAAAAAAAAAAAAAAAAAAACPx///jMX//4jD//+MxP//IpD0/yCO8/8di/P/G4ny/y6e9f8sm/T/KZj0/yaV8/8AAAAAAAAAAAAAAAAAAAAAlsz//5LJ//+Px///lMn//yaV9P8kkvT/IZD0/x+O8/8yo/blMKD1/y2d9f8qmfT/KJbz/wAAAAAAAAAAqdb//53Q//+Zzv//lsv//yiY8/8qmvX/KJf1/yWV9P8jkvTQAAAAADSl9v8xofX/Lp71/yyb9P8AAAAAAAAAAKfW//+k1P//oNL//6rW//8wofb/Lp72/yuc9f8pmfX/AAAAAAAAAAAcVHtcNab2/zKj9v8voPX/LZz0/7vh//+u2///qtj//6fW//8wofT/NKX3/zKj9/8voPb/F8/6XgAAAAAAAAAAAAAAADmr9/82qPf/M6T2/zCg9f+44f//td///7Hd//++4v//Oqz4/ziq+P81p/f/M6X3/wAAAAAAAAAAAAAAAAAAAAAAAAAAOqz4/zep9//M6///v+X//7vj//+44f//OKn1/z6x+f88rvn/Oaz4/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD6x+f8qmfP/yOv//8bq///C5///z+z//0O3+v9Ctfr/QLP5/z2x+f8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0u///8jr///I6///yOv//zmq9f9Dt/r/Q7f6/0O3+v8AAAAAAAAAAAAAAAAAAAAA8A8AAOAHAADgBwAAwAMAAMADAACGAQAABgAAAA8AAAAPAAAABgAAAIYBAADAAwAAwAMAAOAHAADgBwAA8A8AAA=='
					),
					{
						headers: {
							"content-type": "text/html; charset=UTF-8",
						},
						status: 200,
					},
				);
			});
		}

		if (
			this.options?.redoc_url !== null &&
			this.options?.openapi_url !== null
		) {
			this.router.get(this.options?.redoc_url || "/redocs", () => {
				return new Response(
					getReDocUI(
						(this.options?.base || "") +
							(this.options?.openapi_url || "/openapi.json"),
						this.options?.docsPageTitle || "ReDocUI",
						this.options.faviconHref ?? 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlMb//2ux//9or///ZKz//wlv5f8JcOf/CnXv/why7/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2vi/wZo3/9ytf//b7P//2uw//+BvP//DHbp/w568P8Md+//CnXv/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApv4/8HbOH/lMf//3W3//9ytf//brL//w946v8SfvH/EHzw/w558P8AAAAAAAAAAAAAAAAAAAAAAAAAABF56f8Ndef/C3Dj/whs4f98u///eLn//3W3//+Evv//FoPx/xSA8f8SfvD/EHvw/wAAAAAAAAAAAAAAAA1EeF0WgOz/EXrp/w515v8LceT/lsn//3+9//97u///eLj//xaB7f8YhfL/FoLx/xSA8f8JP/deAAAAAAAAAAAgjfH/HIjw/xeB7P8Te+n/AAAAAAAAAACGwf//gr///369//+Iwf//HIny/xqH8v8YhfL/FYLx/wAAAAAnlfPlJJLy/yGO8v8cifD/GILt/wAAAAAAAAAAmMz//4nD//+Fwf//gb///xyJ8P8ejPP/HIny/xmH8v8XhPLnK5r0/yiW8/8lk/P/IpDy/wAAAAAAAAAAAAAAAAAAAACPx///jMX//4jD//+MxP//IpD0/yCO8/8di/P/G4ny/y6e9f8sm/T/KZj0/yaV8/8AAAAAAAAAAAAAAAAAAAAAlsz//5LJ//+Px///lMn//yaV9P8kkvT/IZD0/x+O8/8yo/blMKD1/y2d9f8qmfT/KJbz/wAAAAAAAAAAqdb//53Q//+Zzv//lsv//yiY8/8qmvX/KJf1/yWV9P8jkvTQAAAAADSl9v8xofX/Lp71/yyb9P8AAAAAAAAAAKfW//+k1P//oNL//6rW//8wofb/Lp72/yuc9f8pmfX/AAAAAAAAAAAcVHtcNab2/zKj9v8voPX/LZz0/7vh//+u2///qtj//6fW//8wofT/NKX3/zKj9/8voPb/F8/6XgAAAAAAAAAAAAAAADmr9/82qPf/M6T2/zCg9f+44f//td///7Hd//++4v//Oqz4/ziq+P81p/f/M6X3/wAAAAAAAAAAAAAAAAAAAAAAAAAAOqz4/zep9//M6///v+X//7vj//+44f//OKn1/z6x+f88rvn/Oaz4/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD6x+f8qmfP/yOv//8bq///C5///z+z//0O3+v9Ctfr/QLP5/z2x+f8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0u///8jr///I6///yOv//zmq9f9Dt/r/Q7f6/0O3+v8AAAAAAAAAAAAAAAAAAAAA8A8AAOAHAADgBwAAwAMAAMADAACGAQAABgAAAA8AAAAPAAAABgAAAIYBAADAAwAAwAMAAOAHAADgBwAA8A8AAA=='
					),
					{
						headers: {
							"content-type": "text/html; charset=UTF-8",
						},
						status: 200,
					},
				);
			});
		}

		if (this.options?.openapi_url !== null) {
			this.router.get(this.options?.openapi_url || "/openapi.json", () => {
				return new Response(JSON.stringify(this.getGeneratedSchema()), {
					headers: {
						"content-type": "application/json;charset=UTF-8",
					},
					status: 200,
				});
			});

			this.router.get(
				(this.options?.openapi_url || "/openapi.json").replace(
					".json",
					".yaml",
				),
				() => {
					return new Response(yaml.dump(this.getGeneratedSchema()), {
						headers: {
							"content-type": "text/yaml;charset=UTF-8",
						},
						status: 200,
					});
				},
			);
		}
	}

	getGeneratedSchema() {
		let openapiGenerator: any = OpenApiGeneratorV31;
		if (this.options?.openapiVersion === "3")
			openapiGenerator = OpenApiGeneratorV3;

		const generator = new openapiGenerator(this.registry.definitions);

		return generator.generateDocument({
			openapi: this.options?.openapiVersion === "3" ? "3.0.3" : "3.1.0",
			info: {
				version: this.options?.schema?.info?.version || "1.0.0",
				title: this.options?.schema?.info?.title || "OpenAPI",
				...this.options?.schema?.info,
			},
			...this.options?.schema,
		});
	}

	registerNestedRouter(params: {
		method: string;
		path: string;
		nestedRouter: any;
	}) {
		this.registry.merge(params.nestedRouter.registry);

		return [params.nestedRouter.fetch];
	}

	parseRoute(path: string): string {
		return ((this.options.base || "") + path)
			.replaceAll(/\/+(\/|$)/g, "$1") // strip double & trailing splash
			.replaceAll(/:(\w+)/g, "{$1}"); // convert parameters into openapi compliant
	}

	registerRoute(params: { method: string; path: string; handlers: any[] }) {
		const parsedRoute = this.parseRoute(params.path);

		// @ts-ignore
		let schema: OpenAPIRouteSchema = undefined;
		// @ts-ignore
		let operationId: string = undefined;

		for (const handler of params.handlers) {
			if (handler.name) {
				operationId = `${params.method}_${handler.name}`;
			}

			if (handler.isRoute === true) {
				schema = new handler({}).getSchemaZod();
				break;
			}
		}

		if (operationId === undefined) {
			operationId = `${params.method}_${parsedRoute.replaceAll("/", "_")}`;
		}

		if (schema === undefined) {
			// No schema for this route, try to guest the parameters

			// @ts-ignore
			schema = {
				operationId: operationId,
				responses: {
					200: {
						description: "Successful response.",
					},
				},
			};

			const parsedParams = ((this.options.base || "") + params.path).match(
				/:(\w+)/g,
			);
			if (parsedParams) {
				schema.request = {
					// TODO: make sure this works
					params: z.object(
						parsedParams.reduce(
							// matched parameters start with ':' so replace the first occurrence with nothing
							(obj, item) =>
								Object.assign(obj, {
									[item.replace(":", "")]: z.string(),
								}),
							{},
						),
					),
				};
			}
		} else {
			// Schema was provided in the endpoint
			if (!schema.operationId) {
				if (
					this.options?.generateOperationIds === false &&
					!schema.operationId
				) {
					throw new Error(`Route ${params.path} don't have operationId set!`);
				}

				schema.operationId = operationId;
			}
		}

		this.registry.registerPath({
			...schema,
			// @ts-ignore
			method: params.method,
			path: parsedRoute,
		});

		return params.handlers.map((handler: any) => {
			if (handler.isRoute) {
				return (...params: any[]) =>
					new handler({
						router: this,
						// raiseUnknownParameters: openapiConfig.raiseUnknownParameters,  TODO
					}).execute(...params);
			}

			return handler;
		});
	}

	handleCommonProxy(target: any, prop: string, ...args: any[]) {
		// This is a hack to allow older versions of wrangler to use this library
		// https://github.com/cloudflare/workers-sdk/issues/5420
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

		return undefined;
	}

	getRequest(args: any[]) {
		throw new Error("getRequest not implemented");
	}

	getUrlParams(args: any[]): Record<string, any> {
		throw new Error("getUrlParams not implemented");
	}
}
