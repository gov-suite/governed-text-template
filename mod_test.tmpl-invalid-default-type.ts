export interface Content {
  readonly heading?: string;
  readonly body: string;
}

export function isValidContent(o: unknown): o is Content {
  return o && typeof o === "object" && ("body" in o);
}

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

// we are exporting an invalid template module because it has the wrong default type
// proper type should be executeTemplate or [executeTemplate, isValidContent, onInvalidContent]
export default "string";
