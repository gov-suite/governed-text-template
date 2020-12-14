import { safety } from "./deps.ts";

export interface Content {
  readonly heading?: string;
  readonly body: string;
}

export const isValidContent = safety.typeGuard<Content>("body");

export function onInvalidContent(content: Content): string {
  return `body (with optional heading) expected in content JSON: ${content}`;
}

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

// we are exporting an invalid template module because it has no default
// export default executeTemplate;
