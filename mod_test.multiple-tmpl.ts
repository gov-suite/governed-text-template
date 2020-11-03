export interface Content1 {
  readonly heading1?: string;
  readonly body1: string;
}

export interface Content2 {
  readonly heading2?: string;
  readonly body2: string;
}

export const templateIdentities = ["content1", "content2"] as const;
export type TemplateIdentity = typeof templateIdentities[number];

export function isValidContent(
  o: unknown,
  templateIdentity: TemplateIdentity,
): o is Content1 | Content2 {
  return templateIdentity === "content1"
    ? (o && typeof o === "object" && ("body1" in o))
    : (o && typeof o === "object" && ("body2" in o));
}

export function onInvalidContent(
  content: Content1 | Content2,
  templateIdentity: TemplateIdentity,
): string {
  return `body (with optional heading) expected in ${templateIdentity} content JSON: ${content}`;
}

export function isValidTemplateID(o: string): o is TemplateIdentity {
  if (templateIdentities.find((id) => id === o)) return true;
  return false;
}

export function onInvalidTemplateID(
  templateIdentity: TemplateIdentity,
  content: Content1 | Content2,
): string {
  return `template ID '${templateIdentity}' invalid, expected: ${
    templateIdentities.join(", ")
  }`;
}

export function executeTemplate1(content: Content1): string {
  return `Template 1: ${content.heading1}, ${content.body1}`;
}

export function executeTemplate2(content: Content2): string {
  return `Template 2: ${content.heading2}, ${content.body2}`;
}

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
