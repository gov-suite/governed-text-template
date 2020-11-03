# TypeScript Text Template Modules

This library provides a convenient way to create a dynamic TypeScript-based "template module". A *template module* is a normal TypeScript module with these conventions, which when called through the library, can generate complex text results.

The conventions are:

* Each template module file is a Deno TypeScript file
* Each template module is either a single template or may contain multiple templates with a "selector"
* Each template module may have type guards for strong typing of incoming content or may be loosly typed
* Each template module's template is a function with takes a single parameter and returns a string

# Single template module source

See [mod_test.single-tmpl.ts](mod_test.single-tmpl.ts) for a sample single template module source file and [mod_test.ts](mod_test.ts) for examples of how to consume and execute it. 

```typescript
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
```

# Multiple templates module source

See [mod_test.multiple-tmpl.ts](mod_test.multiple-tmpl.ts) for a sample multiple templates module source file and [mod_test.ts](mod_test.ts) for examples of how to consume and execute a specific template within it.

```typescript
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

```

# HTTP Service Usage

Start the Template Orchestration server:

```bash
deno-run toctl.ts server --verbose
```

In a separate window, try the service using [mod_test.single-in.json](mod_test.single-in.json) as the HTTP request body:

```bash
cd $HOME/workspaces/github.com/shah/ts-safe-template
curl -H "Content-Type: application/json" --data @mod_test.single-in.json http://localhost:8163/transform
```

The output should be:

```html
<html>

<head>
    <title>Page Title</title>
</head>

<body>
    This is my body content, which can contain a variable or anything else that can go into a TypeScript template literal.
</body>

</html>
```