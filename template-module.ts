import { safety } from "./deps.ts";
import * as helpers from "./template-helpers.ts";

export interface TemplateSrcUrlSupplier {
  readonly srcURL: string;
}

export const isTemplateSrcUrlSupplier = safety.typeGuard<
  TemplateSrcUrlSupplier
>("srcURL");

export interface TemplateContentSupplier {
  readonly content: Record<string, unknown>;
}

export const isTemplateContentSupplier = safety.typeGuard<
  TemplateContentSupplier
>("content");

export type TemplateSrcContentSupplier =
  & TemplateSrcUrlSupplier
  & TemplateContentSupplier;

export interface TemplateSelectorSupplier {
  readonly templateIdentity: string;
}

export const isTemplateSelectorSupplier = safety.typeGuard<
  TemplateSelectorSupplier
>("templateIdentity");

export interface ContentProducer {
  (content: Record<string, unknown>, templateID?: string): Promise<string>;
}

export interface ImportTemplateModuleOptions {
  onImportError?: (
    err: Error,
    ctx: TemplateSrcUrlSupplier,
  ) => string | undefined;
  onInvalidDefaultType?: (
    ctx: TemplateSrcUrlSupplier,
  ) => string | undefined;
  onNoModuleDefault?: (
    ctx: TemplateSrcUrlSupplier,
  ) => string | undefined;
}

export interface ExecuteTemplateModuleOptions
  extends ImportTemplateModuleOptions {
  onExecuteError?: (
    err: Error,
    ctx: TemplateSrcContentSupplier,
  ) => string | undefined;
  onContentGuardFailure?: (
    ctx: TemplateSrcContentSupplier,
  ) => string | undefined;
  onTemplateIdGuardFailure?: (
    ctx: TemplateSrcContentSupplier & TemplateSelectorSupplier,
  ) => string | undefined;
}

export interface TemplateModuleHandlers {
  producer: ContentProducer;
  contentGuard?: helpers.TemplateIdContentGuard;
  contentIssueReporter?: helpers.TemplateIdContentGuardIssueReporter;
  templateIdGuard?: helpers.TemplateIdGuard;
  templateIdIssueReporter?: helpers.TemplateIdGuardIssueReporter;
}

export async function importTemplateModuleHandlers(
  ctx: TemplateSrcUrlSupplier,
  options?: ImportTemplateModuleOptions,
): Promise<[handlers: TemplateModuleHandlers, diagnostic: string | undefined]> {
  let producer: ContentProducer;
  const handlers: Omit<TemplateModuleHandlers, "producer"> = {};
  const error = (diag: string): [TemplateModuleHandlers, string] => {
    return [{ producer, ...handlers }, diag];
  };
  try {
    const module = await import(ctx.srcURL);
    if (module.default) {
      if (Array.isArray(module.default)) {
        [
          producer,
          handlers.contentGuard,
          handlers.contentIssueReporter,
          handlers.templateIdGuard,
          handlers.templateIdIssueReporter,
        ] = module.default;
      } else if (typeof module.default === "function") {
        producer = module.default;
      } else {
        if (options?.onInvalidDefaultType) {
          const diagnostic = options.onInvalidDefaultType(ctx);
          if (diagnostic) return error(diagnostic);
        }
        return error(
          `module.default is not an array or function: ${ctx.srcURL}`,
        );
      }
    } else {
      if (options?.onNoModuleDefault) {
        const diagnostic = options.onNoModuleDefault(ctx);
        if (diagnostic) return error(diagnostic);
      }
      return error(`No module.default found in ${ctx.srcURL}`);
    }
  } catch (err) {
    if (options?.onImportError) {
      const diagnostic = options.onImportError(err, ctx);
      if (diagnostic) return error(diagnostic);
    }
    return error(`Unable to import template module ${ctx.srcURL}: ${err}`);
  }
  return [{ producer, ...handlers }, undefined];
}

export async function validateTemplateModuleContent(
  ctx:
    | TemplateSrcContentSupplier
    | TemplateSrcContentSupplier & TemplateSelectorSupplier,
  options?: ExecuteTemplateModuleOptions,
): Promise<[handlers: TemplateModuleHandlers, diagnostic: string | undefined]> {
  const [handlers, diagnostic] = await importTemplateModuleHandlers(
    ctx,
    options,
  );
  if (diagnostic) {
    return [handlers, diagnostic];
  }
  const error = (diag: string): [TemplateModuleHandlers, string] => {
    return [handlers, diag];
  };
  let templateID: string | undefined = undefined;
  if (isTemplateSelectorSupplier(ctx)) {
    templateID = ctx.templateIdentity;
    if (handlers.templateIdGuard && !handlers.templateIdGuard(templateID)) {
      if (options?.onTemplateIdGuardFailure) {
        const diagnostic = options.onTemplateIdGuardFailure(ctx);
        if (diagnostic) return error(diagnostic);
      }
      if (handlers.templateIdIssueReporter) {
        return error(handlers.templateIdIssueReporter(templateID, ctx.content));
      }
    }
  }
  if (
    handlers.contentGuard && !handlers.contentGuard(ctx.content, templateID)
  ) {
    if (options?.onContentGuardFailure) {
      const diagnostic = options.onContentGuardFailure(ctx);
      if (diagnostic) return error(diagnostic);
    }
    if (handlers.contentIssueReporter) {
      return error(handlers.contentIssueReporter(ctx.content, templateID));
    }
  }
  return [handlers, undefined];
}

export async function executeTemplateModule(
  ctx:
    | TemplateSrcContentSupplier
    | TemplateSrcContentSupplier & TemplateSelectorSupplier,
  options?: ExecuteTemplateModuleOptions,
): Promise<string> {
  const [handlers, diagnostic] = await validateTemplateModuleContent(
    ctx,
    options,
  );
  if (diagnostic) {
    return diagnostic;
  }
  if (isTemplateSelectorSupplier(ctx)) {
    return await handlers.producer(ctx.content, ctx.templateIdentity);
  }
  return await handlers.producer(ctx.content, undefined);
}

export interface JsonInput extends Partial<TemplateSelectorSupplier> {
  readonly templateURL?: string;
  readonly templateName?: string;
  readonly content: Record<string, unknown>;
}

export const isJsonInput = safety.typeGuard<JsonInput>(
  "content",
);

export function isValidJsonInput(o: unknown): o is JsonInput {
  if (isJsonInput(o)) {
    if (o.templateURL && typeof o.templateURL !== "string") return false;
    if (o.templateName && typeof o.templateName !== "string") return false;
    if (typeof o.content !== "object") return false;
    return true;
  }
  return false;
}

export interface NamedTemplateUrlSupplier {
  (name: string): string | undefined;
}

export interface TransformJsonInputOptions {
  allowArbitraryModule?: (url: string) => boolean;
  namedTemplateURL?: NamedTemplateUrlSupplier;
  defaultTemplateURL?: (ji: JsonInput) => string;
  onArbitraryModuleNotAllowed?: (url: string) => string | undefined;
  onInvalidTemplateName?: (name: string) => string | undefined;
  onInvalidJSON?: (inputSource: string | Uint8Array) => string | undefined;
}

export async function transformJsonInput(
  inputSource: string | Uint8Array,
  options?: ExecuteTemplateModuleOptions & TransformJsonInputOptions,
): Promise<string> {
  const jsonInstance = JSON.parse(
    typeof inputSource === "string"
      ? inputSource
      : new TextDecoder().decode(inputSource),
  );
  if (isValidJsonInput(jsonInstance)) {
    let tmplURL: string | undefined = options?.defaultTemplateURL
      ? options?.defaultTemplateURL(jsonInstance)
      : undefined;
    if (jsonInstance.templateURL) {
      if (
        options?.allowArbitraryModule &&
        options?.allowArbitraryModule(jsonInstance.templateURL)
      ) {
        tmplURL = jsonInstance.templateURL;
      } else {
        if (options?.onArbitraryModuleNotAllowed) {
          const result = options?.onArbitraryModuleNotAllowed(
            jsonInstance.templateURL,
          );
          if (result) return result;
        }
        return `templateURL can only be provided if allowArbitraryModule() is provided`;
      }
    } else if (jsonInstance.templateName && options?.namedTemplateURL) {
      tmplURL = options?.namedTemplateURL(jsonInstance.templateName);
    }
    if (!tmplURL) {
      if (jsonInstance.templateName) {
        if (options?.onInvalidTemplateName) {
          const result = options.onInvalidTemplateName(
            jsonInstance.templateName,
          );
          if (result) return result;
        }
        return `templateName '${jsonInstance.templateName}' is not valid`;
      }
      return `Either templateURL, templateName, or defaultTemplateURL() must be supplied`;
    }
    return await executeTemplateModule(
      {
        srcURL: tmplURL,
        content: jsonInstance.content,
        templateIdentity: jsonInstance.templateIdentity || undefined,
      },
      options,
    );
  }
  if (options?.onInvalidJSON) {
    const result = options.onInvalidJSON(inputSource);
    if (result) return result;
  }
  return "Invalid JSON input: " + JSON.stringify(jsonInstance);
}
