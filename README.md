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

export const [isValidContent, onInvalidContent] = helpers.contentGuard<Content>(
  "body",
);

export function executeTemplate(content: Content): string {
  return `<html>

<head>
    ${content.heading}
</head>

<body>
    ${content.body}
</body>

</html>`;
}

export default [executeTemplate, isValidContent, onInvalidContent];
```

Basically, the module is a normal TypeScript module except it has a module default set to an array like `export default [executeTemplate, isValidContent, onInvalidContent]`. 

Each template module can supply a execution function, an optional type guard for the incoming content, and an optional function that will be called in case the incoming content is invalid. The content type, function names, etc. may use any names -- all type guards use normal TypeScript structured typing (not name based).

# Multiple templates module source

See [mod_test.multiple-tmpl.ts](mod_test.multiple-tmpl.ts) for a sample multiple templates module source file and [mod_test.ts](mod_test.ts) for examples of how to consume and execute a specific template within it. A muliple templates module is basically the same as a single template module but has one extra property available known as the *template identity* which is selects the template to execute.

```typescript
import { safety } from "./deps.ts";
import * as helpers from "./template-helpers.ts";

export interface Content1 {
  readonly heading1?: string;
  readonly body1: string;
}

export function executeTemplate1(content: Content1): string {
  return `Template 1: ${content.heading1}, ${content.body1}`;
}

export interface Content2 {
  readonly heading2: string;
  readonly body2: string;
}

export function executeTemplate2(content: Content2): string {
  return `Template 2: ${content.heading2}, ${content.body2}`;
}

export const templateIdentities = ["content1", "content2"] as const;
export type TemplateIdentity = typeof templateIdentities[number];
export const contentGuards: Record<TemplateIdentity, [
  safety.TypeGuard<unknown>,
  helpers.ContentGuardIssueReporter,
]> = {
  "content1": helpers.contentGuard<Content1>("body1"),
  "content2": helpers.contentGuard<Content2>("heading2", "body2"),
};
export const [
  isValidContent,
  onInvalidContent,
  isValidTemplateID,
  onInvalidTemplateID,
] = helpers
  .templateIdentityGuard<TemplateIdentity>(templateIdentities, contentGuards);

export function executeTemplate(
  content: Content1 | Content2,
  templateIdentity: TemplateIdentity,
): string {
  if (!isValidTemplateID(templateIdentity)) {
    return onInvalidTemplateID(templateIdentity, content);
  }
  switch (templateIdentity) {
    case "content1":
      return executeTemplate1(content as Content1);

    case "content2":
      return executeTemplate2(content as Content2);
  }
}

export default [
  executeTemplate,
  isValidContent,
  onInvalidContent,
  isValidTemplateID,
  onInvalidTemplateID,
];
```

# HTTP Service Usage with pre-defined templates (safest technique)

You can run the server using as many pre-defined template modules with optional names. The format is `--module=url,name` - if no `,name` is provided then the url's basename is used as the name. When run using pre-defined modules you can use HTTP GET to transform the template.

```bash
deno-run toctl.ts server --verbose --module=./mod_test-html-email-messages.tmpl.ts,medigy-email --module=./mod_test.single-tmpl.ts --module=./mod_test.multiple-tmpl.ts
```

After you run the above, you'll see:

```bash
Template Orchestration service running at http://localhost:8163
Pre-defined template modules:
{
  "medigy-email": "./mod_test-html-email-messages.tmpl.ts",
  "mod_test.single-tmpl.ts": "./mod_test.single-tmpl.ts",
  "mod_test.multiple-tmpl.ts": "./mod_test.multiple-tmpl.ts"
}
```

Now, you can then use the following in a browser or cURL:

```
http://localhost:8163/transform/medigy-email/create-password?authnUrl=this
http://localhost:8163/transform/medigy-email/reset-password?authnUrl=this
http://localhost:8163/transform/mod_test.single-tmpl.ts?body=TestBody&heading=TestHeading
http://localhost:8163/transform/mod_test.multiple-tmpl.ts/content1?heading1=TestHeading&body1=TestBody
```

# HTTP Service Usage with arbitrary templates (might be unsafe)

Start the Template Orchestration server with `--allow-arbitrary-modules` and you can pass in any arbitrary module as a URL:

```bash
deno-run toctl.ts server --verbose --allow-arbitrary-modules
```

In a separate window, try the service using [mod_test.single-in.json](mod_test.single-in.json) as the HTTP request body:

```bash
cd $HOME/workspaces/github.com/shah/ts-safe-template
curl -H "Content-Type: application/json" --data @mod_test.single-in.json http://localhost:8163/transform
```

If the JSON provided in the POST is the following:

```json
{
    "templateURL": "./mod_test.single-tmpl.ts",
    "content": {
        "body": "This is my body content, which can contain a variable or anything else that can go into a TypeScript template literal.",
        "heading": "<title>Page Title</title>"
    }
}
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