export interface Content {
  readonly heading?: string;
  readonly body: string;
}

export function isValidContent(o: unknown): o is Content {
  return o && typeof o === "object" && ("body" in o);
}

export function onInvalidContent(ctx: { content: Content }): string {
  return `body (with optional heading) expected in content JSON: ${ctx.content}`;
}

export function executeTemplate(ctx: { content: Content }): string {
  return `<html>

<head>
    ${ctx.content.heading}
</head>

<body>
    ${ctx.content.body}
</body>

</html>`;
}

export default [executeTemplate, isValidContent, onInvalidContent];
