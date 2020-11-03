export interface Content1 {
  readonly heading1?: string;
  readonly body1: string;
}

export interface Content2 {
  readonly heading2?: string;
  readonly body2: string;
}

export type TemplateIdentity = "content1" | "content2";

export function isValidContent(
  o: unknown,
  templateIdentity: TemplateIdentity,
): o is Content1 | Content2 {
  return templateIdentity === "content1"
    ? (o && typeof o === "object" && ("body1" in o))
    : (o && typeof o === "object" && ("body2" in o));
}

export function onInvalidContent(
  ctx: { content: Content1; templateIdentity: TemplateIdentity },
): string {
  return `body (with optional heading) expected in ${ctx.templateIdentity} content JSON: ${ctx.content}`;
}

export function executeTemplate1(ctx: { content: Content1 }): string {
  return `Template 1: ${ctx.content.heading1}, ${ctx.content.body1}`;
}

export function executeTemplate2(ctx: { content: Content2 }): string {
  return `Template 2: ${ctx.content.heading2}, ${ctx.content.body2}`;
}

export function executeTemplate(
  ctx: { content: Content1 | Content2; templateIdentity: TemplateIdentity },
): string {
  switch (ctx.templateIdentity) {
    case "content1":
      return executeTemplate1({ content: ctx.content as Content1 });

    case "content2":
      return executeTemplate2({ content: ctx.content as Content2 });
  }
}

export default [executeTemplate, isValidContent, onInvalidContent];
