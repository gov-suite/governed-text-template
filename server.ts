import { colors, oak } from "./deps.ts";
import * as tm from "./template-module.ts";

const responseTimeHeaderName = "X-Response-Time";

export interface AccessReport {
  readonly responseTime: number;
}

export interface AccessReporter {
  (ctx: oak.Context<Record<string, unknown>>, report: AccessReport): void;
}

export function defaultAccessReporter(
  ctx: oak.Context<Record<string, unknown>>,
  report: AccessReport,
): void {
  console.log(
    `${colors.green(ctx.request.method)} ${
      colors.yellow(ctx.request.url.toString())
    } - ${colors.gray(report.responseTime.toString())}`,
  );
}

export interface HttpServiceMiddlewareOptions {
  readonly accessReporter?: AccessReporter;
}

export function httpServiceMiddleware(
  app: oak.Application,
  options?: {
    accessReporter?: AccessReporter;
  },
): void {
  if (options?.accessReporter) {
    const reporter = options?.accessReporter;
    app.use(async (ctx, next) => {
      await next();
      reporter(
        ctx,
        {
          responseTime: Number.parseInt(
            ctx.response.headers.get(responseTimeHeaderName) || "-1",
          ),
        },
      );
    });
  }

  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const responseTime = Date.now() - start;
    ctx.response.headers.set(responseTimeHeaderName, `${responseTime}`);
  });
}

export function httpServiceRouter(
  options?: tm.TransformJsonInputOptions & {
    templateModules?: () => Record<string, string> | undefined;
  },
): oak.Router {
  const templateModules = options?.templateModules
    ? options?.templateModules()
    : undefined;
  const router = new oak.Router();
  router
    .get("/", (ctx) => {
      ctx.response.body = "Template Orchestration Controller";
    })
    // TODO: add https://github.com/marcopacini/ts-prometheus based /metrics route
    // TODO: add https://tools.ietf.org/id/draft-inadarei-api-health-check-01.html based /health route
    // TODO: add https://github.com/singhcool/deno-swagger-doc based OpenAPI generator
    .get("/inspect/templates", async (ctx) => {
      if (templateModules) {
        ctx.response.body = templateModules;
      } else {
        ctx.response.body = "{}";
      }
    })
    .get("/transform/:module/:templateId?", async (ctx) => {
      if (templateModules) {
        if (ctx.params && ctx.params.module) {
          const templateURL = templateModules[ctx.params.module];
          if (templateURL) {
            const content: Record<string, unknown> = {};
            ctx.request.url.searchParams.forEach((v, k) => content[k] = v);
            ctx.response.body = await tm.executeTemplateModule({
              srcURL: templateURL,
              content: content,
              templateIdentity: ctx.params.templateId,
            });
          } else {
            ctx.response.status = 400;
            ctx.response.body = {
              code: 1,
              message:
                `Template module '${ctx.params.module} not found. Available: ${
                  Object.keys(templateModules).join(",")
                }'`,
            };
          }
        }
      } else {
        ctx.response.status = 501;
        ctx.response.body = {
          code: 0,
          message: "No pre-defined template modules supplied.",
        };
      }
    })
    .post("/transform", async (ctx) => {
      const result = ctx.request.body({ type: "text" });
      ctx.response.body = await tm.transformJsonInput(await result.value, {
        allowArbitraryModule: options?.allowArbitraryModule || undefined,
        defaultTemplateModuleURL: options?.defaultTemplateModuleURL ||
          undefined,
        defaultTemplateIdentity: options?.defaultTemplateIdentity || undefined,
        onArbitraryModuleNotAllowed: (templateUrl) => {
          const message = options?.onArbitraryModuleNotAllowed
            ? options?.onArbitraryModuleNotAllowed(templateUrl)
            : `arbitrary module ${templateUrl} not allowed.`;
          ctx.response.status = 403;
          ctx.response.body = {
            code: 2,
            message: message,
          };
          return message;
        },
        onInvalidJSON: (inputSource) => {
          const message = options?.onInvalidJSON
            ? options?.onInvalidJSON(inputSource)
            : `invalid JSON: ${JSON.stringify(inputSource)}.`;
          ctx.response.status = 400;
          ctx.response.body = {
            code: 3,
            message: message,
          };
          return message;
        },
        namedTemplateModuleURL: options?.namedTemplateModuleURL ||
          ((name: string): string | undefined => {
            return templateModules ? templateModules[name] : undefined;
          }),
      });
    });
  return router;
}

export function httpServer(
  options: {
    router: oak.Router;
    port: number;
    mwOptions?: HttpServiceMiddlewareOptions;
  },
): oak.Application {
  const app = new oak.Application();
  app.addEventListener("listen", () => {
    console.log(
      `Template Orchestration service listening on http://localhost:${options.port}`,
    );
  });
  httpServiceMiddleware(
    app,
    options.mwOptions || { accessReporter: defaultAccessReporter },
  );
  app.use(options.router.routes());
  app.use(options.router.allowedMethods());
  return app;
}
