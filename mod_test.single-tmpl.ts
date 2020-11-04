import * as mod from "./mod.ts";

export interface Content {
  readonly heading?: string;
  readonly body: string;
}

export const [isValidContent, onInvalidContent] = mod.contentGuard<Content>(
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
