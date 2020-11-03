import { safety } from "./deps.ts";

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
  (
    ctx:
      | TemplateContentSupplier
      | (TemplateContentSupplier & TemplateSelectorSupplier),
  ): Promise<string>;
}

export interface ContentGuard {
  (
    o: unknown,
    templateIdentity?: string,
  ): o is Record<string, unknown>;
}

export interface ContentReporter {
  (ctx: TemplateContentSupplier): string;
}

export interface ExecuteTemplateModuleOptions {
  onImportError?: (
    err: Error,
    ctx: TemplateSrcContentSupplier,
  ) => string | undefined;
  onInvalidDefaultType?: (
    ctx: TemplateSrcContentSupplier,
  ) => string | undefined;
  onNoModuleDefault?: (
    ctx: TemplateSrcContentSupplier,
  ) => string | undefined;
  onExecuteError?: (
    err: Error,
    ctx: TemplateSrcContentSupplier,
  ) => string | undefined;
  onGuardFailure?: (
    ctx: TemplateSrcContentSupplier,
  ) => string | undefined;
}

export async function executeTemplateModule(
  ctx:
    | TemplateSrcContentSupplier
    | TemplateSrcContentSupplier & TemplateSelectorSupplier,
  options?: ExecuteTemplateModuleOptions,
): Promise<string> {
  let producer: ContentProducer;
  let guard: ContentGuard | undefined;
  let reporter: ContentReporter | undefined;
  try {
    const module = await import(ctx.srcURL);
    if (module.default) {
      if (Array.isArray(module.default)) {
        [producer, guard, reporter] = module.default;
      } else if (typeof module.default === "function") {
        producer = module.default;
      } else {
        if (options?.onInvalidDefaultType) {
          const result = options.onInvalidDefaultType(ctx);
          if (result) return result;
        }
        return `module.default is not an array or function: ${ctx.srcURL}`;
      }
    } else {
      if (options?.onNoModuleDefault) {
        const result = options.onNoModuleDefault(ctx);
        if (result) return result;
      }
      return `No module.default found in ${ctx.srcURL}`;
    }
  } catch (err) {
    if (options?.onImportError) {
      const result = options.onImportError(err, ctx);
      if (result) return result;
    }
    return `Unable to import template module ${ctx.srcURL}: ${err}`;
  }
  if (
    guard &&
    !guard(
      ctx.content,
      isTemplateSelectorSupplier(ctx) ? ctx.templateIdentity : undefined,
    )
  ) {
    if (options?.onGuardFailure) {
      const result = options.onGuardFailure(ctx);
      if (result) return result;
    }
    if (reporter) return reporter(ctx);
  }
  return await producer(ctx);
}

export interface JsonInput extends Partial<TemplateSelectorSupplier> {
  readonly templateURL: string;
  readonly content: Record<string, unknown>;
}

export const isJsonInput = safety.typeGuard<JsonInput>(
  "templateURL",
  "content",
);

export function isValidJsonInput(o: unknown): o is JsonInput {
  if (isJsonInput(o)) {
    if (typeof o.templateURL !== "string") return false;
    if (typeof o.content !== "object") return false;
    return true;
  }
  return false;
}

export async function transformJsonInput(
  inputSource: string | Uint8Array,
  options?: ExecuteTemplateModuleOptions & {
    onInvalidJSON?: (inputSource: string | Uint8Array) => string | undefined;
  },
): Promise<string> {
  const jsonInstance = JSON.parse(
    typeof inputSource === "string"
      ? inputSource
      : new TextDecoder().decode(inputSource),
  );
  if (isValidJsonInput(jsonInstance)) {
    return await executeTemplateModule(
      {
        srcURL: jsonInstance.templateURL,
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
  return "Invalid JSON input";
}
