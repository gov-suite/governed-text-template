import {
  colors,
  docopt,
  govnSvcHealth as gsh,
  govnSvcVersion as gsv,
  oakHelpers as oakH,
  path,
} from "./deps.ts";
import * as server from "./server.ts";
import * as tm from "./template-module.ts";

// deno-lint-ignore require-await
export async function determineVersion(importMetaURL: string): Promise<string> {
  return gsv.determineVersionFromRepoTag(
    importMetaURL,
    { repoIdentity: "gov-suite/governed-text-template" },
  );
}

const toctlVersion = await determineVersion(import.meta.url);
const docoptSpec = `
Template Orchestration Controller ${toctlVersion}.

Usage:
  toctl server [--port=<port>] [--module=<module-spec>]... [--default-module=<module-url>] [--default-tmpl-id=<template-identity>] [--allow-arbitrary-modules] [--module-spec-delim=<delimiter>] [--verbose]
  toctl transform json [--default-module=<module-url>] [--default-tmpl-id=<template-identity>] [--allow-arbitrary-modules] 
  toctl validate config --module=<module-spec>... [--verbose] [--module-spec-delim=<delimiter>] [--default-module=<module-url>] [--default-tmpl-id=<template-identity>]
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

export function buildTransformJsonInputOptions(
  chc: CommandHandlerContext,
): tm.TransformJsonInputOptions {
  const { "--allow-arbitrary-modules": allowArbitraryModules } = chc.cliOptions;
  const templateModules = chc.templateModules();
  return {
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
  };
}

export async function httpServiceHandler(
  chc: CommandHandlerContext,
): Promise<true | void> {
  const { "server": isServer } = chc.cliOptions;
  if (isServer) {
    console.log(`Template Orchestration server started`);
    const templateModules = chc.templateModules();
    if (templateModules) {
      chc.validateTemplateModules(templateModules);
    }
    const app = server.httpServer({
      port: chc.httpServicePort(),
      router: server.httpServiceRouter(
        {
          templateModules: () => {
            return templateModules;
          },
          ...buildTransformJsonInputOptions(chc),
        },
      ),
    });
    // TODO: add https://github.com/marcopacini/ts-prometheus based /metrics route
    // TODO: add https://github.com/singhcool/deno-swagger-doc based OpenAPI generator
    oakH.registerHealthRoute(app, {
      serviceVersion: () => {
        return toctlVersion;
      },
      endpoint: async () => {
        const hs = gsh.healthyService({
          version: "1",
          releaseID: toctlVersion,
          ...(templateModules
            ? await chc.templateModulesHealthStatus(templateModules)
            : { details: {} }),
        });
        return gsh.healthStatusEndpoint(hs);
      },
    });
    await app.listen({ port: chc.httpServicePort() });
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
      console.log(
        await tm.transformJsonInput(input, buildTransformJsonInputOptions(chc)),
      );
    } else {
      console.error("No JSON provided in STDIN");
    }
    return true;
  }
}

// deno-lint-ignore require-await
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
  readonly defaultHttpServicePort = 8179;
  readonly isVerbose: boolean;

  constructor(
    readonly calledFromMetaURL: string,
    readonly calledFromMain: boolean,
    readonly cliOptions: docopt.DocOptions,
  ) {
    const { "--verbose": verbose } = this.cliOptions;
    this.isVerbose = verbose ? true : false;
  }

  httpServicePort(): number {
    const { "--port": portSpec } = this.cliOptions;
    const port = typeof portSpec === "number"
      ? portSpec
      : (typeof portSpec === "string" ? Number.parseInt(portSpec)
      : this.defaultHttpServicePort);
    if (isNaN(port)) {
      console.error(
        `Invalid --port supplied (${portSpec}), defaulting to ${this.defaultHttpServicePort}.`,
      );
      return this.defaultHttpServicePort;
    }
    return port;
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

  async templateModulesHealthStatus(
    templateModules: Record<string, string>,
  ): Promise<gsh.ServiceHealthComponents> {
    const result: gsh.ServiceHealthComponents = {
      details: {},
    };
    const addStatus = (
      tmplName: string,
      tmplUrl: string,
      diagnostic?: string,
    ): void => {
      const component: Omit<gsh.HealthyServiceHealthComponentStatus, "status"> =
        {
          componentId: tmplName,
          componentType: "component",
          time: new Date(),
          links: { templateURL: tmplUrl },
        };
      if (diagnostic) {
        result.details[`template:${tmplName}`] = [
          gsh.unhealthyComponent("fail", {
            ...component,
            output: diagnostic,
          }),
        ];
      } else {
        result.details[`template:${tmplName}`] = [
          gsh.healthyComponent(component),
        ];
      }
    };
    for (const entry of Object.entries(templateModules)) {
      const [name, url] = entry;
      const [_, diagnostic] = await tm.importTemplateModuleHandlers({
        srcURL: url,
      });
      addStatus(name, url, diagnostic);
    }
    const defaultTmplUrl = this.defaultTemplateModule();
    if (defaultTmplUrl) {
      const [_, diagnostic] = await tm.importTemplateModuleHandlers({
        srcURL: defaultTmplUrl,
      });
      addStatus("DEFAULT", defaultTmplUrl, diagnostic);
    }
    return result;
  }

  async validateTemplateModules(
    templateModules: Record<string, string>,
  ): Promise<void> {
    const health = await this.templateModulesHealthStatus(templateModules);
    for (const entry of Object.entries(health.details)) {
      const [name, componentStates] = entry;
      if (Array.isArray(componentStates)) {
        for (const state of componentStates) {
          if (gsh.isServiceHealthDiagnosable(state)) {
            console.error(
              `${colors.yellow(state.componentId)}: ${
                colors.brightWhite(state.links["templateURL"])
              } ${colors.red(state.output)}`,
            );
          } else if (this.isVerbose) {
            console.log(
              `${colors.yellow(state.componentId)}: ${
                colors.brightWhite(state.links["templateURL"])
              } ${colors.green("OK")}`,
            );
          }
        }
      }
    }
  }
}

// deno-lint-ignore require-await
export async function versionHandler(
  ctx: CommandHandlerContext,
): Promise<true | void> {
  const { "--version": version } = ctx.cliOptions;
  if (version) {
    console.log(toctlVersion);
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
