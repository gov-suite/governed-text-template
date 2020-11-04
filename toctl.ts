import { docopt, fs, oak, path } from "./deps.ts";
import * as tm from "./template-module.ts";

const docoptSpec = `
Template Orchestration Controller ${
  determineVersion(import.meta.url, import.meta.main)
}.

Usage:
  toctl server [--port=<port>] [--module=<module-spec>]... [--verbose] [--allow-arbitrary-modules]
  toctl -h | --help
  toctl --version

Options:
  -h --help         Show this screen
  <module-spec>     A pre-defined module template (with an optional name like --module="./x.ts,x")
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
  if (chc.isVerbose && templateModules) {
    console.log("Pre-defined template modules:");
    console.dir(templateModules);
  }
  const router = new oak.Router();
  router
    .get("/", (ctx) => {
      ctx.response.body = "Template Orchestration Controller";
    })
    // TODO: add https://github.com/marcopacini/ts-prometheus based /metrics route
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
      if (allowArbitraryModules) {
        const result = ctx.request.body({ type: "text" });
        ctx.response.body = await tm.transformJsonInput(await result.value);
      } else {
        ctx.response.body =
          "Server was not started with --allow-arbitrary-modules, can only use pre-defined modules";
      }
    });
  return router;
}

export async function httpServiceHandler(
  chc: CommandHandlerContext,
): Promise<true | void> {
  const {
    "server": server,
    "--port": portSpec,
    "--baseURL": baseUrlSpec,
  } = chc.cliOptions;
  if (server) {
    const port = typeof portSpec === "number" ? portSpec : 8163;
    const baseURL = typeof baseUrlSpec === "string"
      ? baseUrlSpec
      : `http://localhost:${port}`;
    const verbose = chc.isVerbose;
    if (verbose) {
      console.log(`Template Orchestration service running at ${baseURL}`);
    }
    const app = new oak.Application();
    httpServiceMiddleware(chc, app);
    const router = httpServiceRouter(chc);
    app.use(router.routes());
    app.use(router.allowedMethods());
    await app.listen({ port: port });
    return true;
  }
}

export interface CommandHandlerContext {
  readonly calledFromMetaURL: string;
  readonly calledFromMain: boolean;
  readonly cliOptions: docopt.DocOptions;
  readonly isVerbose: boolean;
  readonly templateModules: () => Record<string, string> | undefined;
}

export interface CommandHandler<T extends CommandHandlerContext> {
  (ctx: T): Promise<true | void>;
}

export class TypicalCommandHandlerContext implements CommandHandlerContext {
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
    [httpServiceHandler, ...commonHandlers],
    (options: docopt.DocOptions): CommandHandlerContext => {
      return new TypicalCommandHandlerContext(
        import.meta.url,
        import.meta.main,
        options,
      );
    },
  );
}
