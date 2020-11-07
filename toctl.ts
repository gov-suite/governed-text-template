import { colors, docopt, fs, oak, path } from "./deps.ts";
import * as tm from "./template-module.ts";

const docoptSpec = `
Template Orchestration Controller ${
  determineVersion(import.meta.url, import.meta.main)
}.

Usage:
  toctl server [--port=<port>] [--module=<module-spec>]... [--default-module=<module-url>] [--default-tmpl-id=<template-identity>] [--verbose] [--allow-arbitrary-modules] [--module-spec-delim=<delimiter>]
  toctl transform json [--default-module=<module-url>] [--default-tmpl-id=<template-identity>]
  toctl validate config --module=<module-spec>... [--verbose] [--module-spec-delim=<delimiter>]
  toctl -h | --help
  toctl --version

Options:
  -h --help         Show this screen
  <module-spec>     A pre-defined module template (with an optional name like --module="./x.ts,x")
  <module-url>      A module template URL
  <delimiter>       The character(s) used to separate pre-defined template module name and URL (default ",")
  --version         Show version
  --verbose         Be explicit about what's going on
`;

function httpServiceMiddleware(
  chc: CommandHandlerContext,
  app: oak.Application,
): void {
  if (chc.isVerbose) {
    app.use(async (ctx, next) => {
      await next();
      const rt = ctx.response.headers.get("X-Response-Time");
      console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
    });
  }

  // add telemetry for each request
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.response.headers.set("X-Response-Time", `${ms}ms`);
  });
}

function httpServiceRouter(chc: CommandHandlerContext): oak.Router {
  const { "--allow-arbitrary-modules": allowArbitraryModules } = chc.cliOptions;
  const templateModules = chc.templateModules();
  if (chc.isVerbose && chc.defaultTemplateModule()) {
    console.log("Default template module:", chc.defaultTemplateModule());
  }
  if (chc.isVerbose && templateModules) {
    console.log("Pre-defined template modules:");
    console.dir(templateModules);
  }
  if (templateModules) {
    chc.validateTemplateModules(templateModules);
  }
  const router = new oak.Router();
  router
    .get("/", (ctx) => {
      ctx.response.body = "Template Orchestration Controller";
    })
    // TODO: add https://github.com/marcopacini/ts-prometheus based /metrics route
    // TODO: add https://tools.ietf.org/id/draft-inadarei-api-health-check-01.html based /health route
    // TODO: add https://github.com/singhcool/deno-swagger-doc based OpenAPI generator
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
            `Template modules '${ctx.params.module} not found. Available: ${
              Object.keys(templateModules).join(",")
            }'`;
          }
        }
      } else {
        ctx.response.body = "No modules supplied using --module arguments.";
      }
    })
    .post("/transform", async (ctx) => {
      const result = ctx.request.body({ type: "text" });
      ctx.response.body = await tm.transformJsonInput(await result.value, {
        allowArbitraryModule: (templateUrl) => {
          return allowArbitraryModules ? true : false;
        },
        defaultTemplateModuleURL: (): string => {
          return chc.defaultTemplateModule() || `./template-module-debug.ts`;
        },
        defaultTemplateIdentity: (): string | undefined => {
          return chc.defaultTemplateIdentity();
        },
        onArbitraryModuleNotAllowed: (templateUrl: string): string => {
          return `Server was not started with --allow-arbitrary-modules, can only use pre-defined modules (not ${templateUrl})`;
        },
        namedTemplateModuleURL: (name: string): string | undefined => {
          return templateModules ? templateModules[name] : undefined;
        },
      });
    });
  return router;
}

export async function httpServiceHandler(
  chc: CommandHandlerContext,
): Promise<true | void> {
  const {
    "server": server,
    "--port": portSpec,
  } = chc.cliOptions;
  if (server) {
    const port = typeof portSpec === "number" ? portSpec : 8163;
    const app = new oak.Application();
    app.addEventListener("listen", () => {
      console.log(
        `Template Orchestration service running at http://localhost:${port}`,
      );
    });
    httpServiceMiddleware(chc, app);
    const router = httpServiceRouter(chc);
    app.use(router.routes());
    app.use(router.allowedMethods());
    await app.listen({ port: port });
    return true;
  }
}

export async function transformStdInJsonHandler(
  chc: CommandHandlerContext,
): Promise<true | void> {
  const { "transform": transform, "json": json } = chc.cliOptions;
  if (transform && json) {
    const input = Deno.readAllSync(Deno.stdin);
    if (!input || input.length > 0) {
      const preDefinedModules = chc.templateModules();
      console.log(
        await tm.transformJsonInput(input, {
          allowArbitraryModule: (templateUrl) => {
            return true;
          },
          defaultTemplateModuleURL: (): string => {
            return chc.defaultTemplateModule() || `./template-module-debug.ts`;
          },
          defaultTemplateIdentity: (): string | undefined => {
            return chc.defaultTemplateIdentity();
          },
          namedTemplateModuleURL: (name: string): string | undefined => {
            return preDefinedModules ? preDefinedModules[name] : undefined;
          },
        }),
      );
    } else {
      console.error("No JSON provided in STDIN");
    }
    return true;
  }
}

export async function validateConfigHandler(
  chc: CommandHandlerContext,
): Promise<true | void> {
  const { "validate": validate, "config": config } = chc.cliOptions;
  if (validate && config) {
    const templateModules = chc.templateModules();
    if (!templateModules) {
      console.error("No --module entries defined.");
      return true;
    }
    if (chc.isVerbose && templateModules) {
      console.log("Pre-defined template modules:");
      console.dir(templateModules);
    }
    chc.validateTemplateModules(templateModules);
    return true;
  }
}

export interface CommandHandler<T extends CommandHandlerContext> {
  (ctx: T): Promise<true | void>;
}

export class CommandHandlerContext implements CommandHandlerContext {
  readonly isVerbose: boolean;

  constructor(
    readonly calledFromMetaURL: string,
    readonly calledFromMain: boolean,
    readonly cliOptions: docopt.DocOptions,
  ) {
    const { "--verbose": verbose } = this.cliOptions;
    this.isVerbose = verbose ? true : false;
  }

  templateModules(): Record<string, string> | undefined {
    const {
      "--module": templateModuleSpecs,
      "--module-spec-delim": moduleSpecDelim,
    } = this.cliOptions;
    if (Array.isArray(templateModuleSpecs)) {
      const result: Record<string, string> = {};
      const delim = typeof moduleSpecDelim === "string" ? moduleSpecDelim : ",";
      for (const module of templateModuleSpecs) {
        const [url, name] = module.split(delim);
        result[name && name.length > 0 ? name : path.basename(url, "")] = url;
      }
      return result;
    }
    return undefined;
  }

  defaultTemplateModule(): string | undefined {
    const { "--default-module": defaultModuleURL } = this.cliOptions;
    return typeof defaultModuleURL === "string" ? defaultModuleURL : undefined;
  }

  defaultTemplateIdentity(): string | undefined {
    const { "--default-tmpl-id": defaultTemplateId } = this.cliOptions;
    return typeof defaultTemplateId === "string"
      ? defaultTemplateId
      : undefined;
  }

  async validateTemplateModules(
    templateModules: Record<string, string>,
  ): Promise<void> {
    for (const entry of Object.entries(templateModules)) {
      const [name, url] = entry;
      const [_, diagnostic] = await tm.importTemplateModuleHandlers({
        srcURL: url,
      });
      if (diagnostic) {
        console.error(
          `[${colors.yellow(name)}: ${colors.brightWhite(url)}] ${
            colors.red(diagnostic)
          }`,
        );
      } else if (this.isVerbose) {
        console.log(
          `${colors.yellow(name)}: ${colors.brightWhite(url)} ${
            colors.green("OK")
          }`,
        );
      }
    }
  }
}

export function determineVersion(
  importMetaURL: string,
  isMain: boolean,
  repoVersionRegExp =
    /gov-suite\/governed-text-template\/v?(?<version>\d+\.\d+\.\d+)\//,
): string {
  const fileURL = importMetaURL.startsWith("file://")
    ? importMetaURL.substr("file://".length)
    : importMetaURL;
  if (fs.existsSync(fileURL)) {
    return `v0.0.0-local${isMain ? ".main" : ""}`;
  }
  const matched = importMetaURL.match(repoVersionRegExp);
  if (matched) {
    return `v${matched.groups!["version"]}`;
  }
  return `v0.0.0-remote(no version tag/branch in ${importMetaURL})`;
}

export async function versionHandler(
  ctx: CommandHandlerContext,
): Promise<true | void> {
  const { "--version": version } = ctx.cliOptions;
  if (version) {
    console.log(determineVersion(ctx.calledFromMetaURL, ctx.calledFromMain));
    return true;
  }
}

export const commonHandlers = [versionHandler];

export async function CLI<
  T extends CommandHandlerContext = CommandHandlerContext,
>(
  docoptSpec: string,
  handlers: CommandHandler<T>[],
  prepareContext: (options: docopt.DocOptions) => T,
): Promise<void> {
  try {
    const options = docopt.default(docoptSpec);
    const context = prepareContext(options);
    let handled: true | void;
    for (const handler of handlers) {
      handled = await handler(context);
      if (handled) break;
    }
    if (!handled) {
      console.error("Unable to handle validly parsed docoptSpec:");
      console.dir(options);
    }
  } catch (e) {
    console.error(e.message);
  }
}

if (import.meta.main) {
  CLI(
    docoptSpec,
    [
      httpServiceHandler,
      transformStdInJsonHandler,
      validateConfigHandler,
      ...commonHandlers,
    ],
    (options: docopt.DocOptions): CommandHandlerContext => {
      return new CommandHandlerContext(
        import.meta.url,
        import.meta.main,
        options,
      );
    },
  );
}
