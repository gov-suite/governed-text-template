import { safety } from "./deps.ts";

export function contentGuard<T, K extends keyof T = keyof T>(
  ...requireKeysInSingleT: K[] // = [...keyof T] TODO: default this to all required keys
): [safety.TypeGuard<T>, ContentGuardIssueReporter] {
  return [
    safety.typeGuard<T>(...requireKeysInSingleT),
    guardIssueReporter<T>(...requireKeysInSingleT),
  ];
}

export interface ContentGuardIssueReporter {
  (o: unknown): string;
}

export function guardIssueReporter<T, K extends keyof T = keyof T>(
  ...requireKeysInSingleT: K[] // = [...keyof T] TODO: default this to all required keys
): ContentGuardIssueReporter {
  return (o: unknown): string => {
    if (!o || typeof o !== "object") {
      return `object expected: ${JSON.stringify(o)}`;
    }
    return `${requireKeysInSingleT.join(", ")} properties expected in object: ${
      JSON.stringify(o)
    }`;
  };
}

export type TemplateIdentity = string;

export interface TemplateIdContentGuard<
  T extends TemplateIdentity = TemplateIdentity,
> {
  (o: unknown, templateIdentity?: T): o is unknown;
}

export interface TemplateIdGuard<
  T extends TemplateIdentity = TemplateIdentity,
> {
  (o: unknown): o is T;
}

export interface TemplateIdGuardIssueReporter<
  T extends TemplateIdentity = TemplateIdentity,
> {
  (templateIdentity: T, content: unknown): string;
}

export interface TemplateIdContentGuardIssueReporter<
  T extends TemplateIdentity = TemplateIdentity,
> {
  (content: unknown, templateIdentity?: T): string;
}

export function templateIdentityGuard<
  T extends TemplateIdentity = TemplateIdentity,
>(
  templateIdentities: readonly string[],
  contentGuards: Record<
    T,
    [safety.TypeGuard<unknown>, ContentGuardIssueReporter]
  >,
): [
  TemplateIdContentGuard<T>,
  TemplateIdContentGuardIssueReporter<T>,
  TemplateIdGuard<T>,
  TemplateIdGuardIssueReporter<T>,
] {
  return [
    templateIdentityContentGuard<T>(contentGuards),
    invalidTemplateIdContentReporter<T>(),
    templateIdentityValueGuard<T>(templateIdentities),
    invalidTemplateIdReporter<T>(templateIdentities),
  ];
}

export function templateIdentityContentGuard<
  T extends TemplateIdentity = TemplateIdentity,
>(
  contentGuards: Record<
    T,
    [safety.TypeGuard<unknown>, ContentGuardIssueReporter]
  >,
): TemplateIdContentGuard<T> {
  return (o: unknown, templateIdentity?: T): o is unknown => {
    if (!templateIdentity) return false;
    const found = contentGuards[templateIdentity];
    if (found) {
      const [guard] = found;
      return guard(o);
    }
    return false;
  };
}

export function templateIdentityValueGuard<
  T extends TemplateIdentity = TemplateIdentity,
>(
  templateIdentities: readonly string[],
): TemplateIdGuard<T> {
  return (o: unknown): o is T => {
    if (typeof o === "string") {
      if (templateIdentities.find((id) => id === o)) return true;
    }
    return false;
  };
}

export function invalidTemplateIdReporter<
  T extends TemplateIdentity = TemplateIdentity,
>(
  templateIdentities: readonly string[],
): TemplateIdGuardIssueReporter<T> {
  return (templateIdentity: T, content: unknown): string => {
    return `template ID '${templateIdentity}' invalid, expected: ${
      templateIdentities.join(", ")
    }`;
  };
}

export function invalidTemplateIdContentReporter<
  T extends TemplateIdentity = TemplateIdentity,
>(): TemplateIdContentGuardIssueReporter<T> {
  return (content: unknown, templateIdentity?: T): string => {
    return `unexpected content for template ${templateIdentity}: ${
      JSON.stringify(content)
    }`;
  };
}
