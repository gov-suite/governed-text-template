import { safety } from "./deps.ts";
import * as mod from "./mod.ts";

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
  mod.ContentGuardIssueReporter,
]> = {
  "content1": mod.contentGuard<Content1>("body1"),
  "content2": mod.contentGuard<Content2>("heading2", "body2"),
};
export const [
  isValidContent,
  onInvalidContent,
  isValidTemplateID,
  onInvalidTemplateID,
] = mod
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
