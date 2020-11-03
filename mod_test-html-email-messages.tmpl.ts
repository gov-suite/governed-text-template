import { safety } from "./deps.ts";
import {
  anchorTip,
  callToActionButton,
  executeTemplate as layout,
  p,
} from "./mod_test-html-email-layout.tmpl.ts";
import * as helpers from "./template-helpers.ts";

export interface AuthnMessageContent {
  readonly authnUrl: string;
}

export const [isValidAuthnMessageContent, onInvalidAuthnMessageContent] =
  helpers.contentGuard<AuthnMessageContent>(
    "authnUrl",
  );

export function prepareCreatePasswordEmailMessage(
  content: AuthnMessageContent,
): string {
  return layout({
    heading: "Create Password",
    body: `${p`Hi`}
    ${p`Welcome to Medigy, please click below to create your password.`}
    ${callToActionButton("Create a new password", content.authnUrl)}
    ${anchorTip(content.authnUrl)}`,
  });
}

export function prepareResetPasswordEmailMessage(
  content: AuthnMessageContent,
): string {
  return layout({
    heading: "Reset Password",
    body: `${p`Hi`}
    ${p
      `We're sorry you had trouble logging in, please tap below to reset your password.`}
    ${callToActionButton("Reset your password", content.authnUrl)}
    ${anchorTip(content.authnUrl)}`,
  });
}

export const templateIdentities = [
  "create-password",
  "reset-password",
] as const;
export type TemplateIdentity = typeof templateIdentities[number];
export const contentGuards: Record<TemplateIdentity, [
  safety.TypeGuard<unknown>,
  helpers.ContentGuardIssueReporter,
]> = {
  "create-password": [isValidAuthnMessageContent, onInvalidAuthnMessageContent],
  "reset-password": [isValidAuthnMessageContent, onInvalidAuthnMessageContent],
};
export const [
  isValidContent,
  onInvalidContent,
  isValidTemplateID,
  onInvalidTemplateID,
] = helpers
  .templateIdentityGuard<TemplateIdentity>(templateIdentities, contentGuards);

export function executeTemplate(
  content: AuthnMessageContent,
  templateIdentity: TemplateIdentity,
): string {
  if (!isValidTemplateID(templateIdentity)) {
    return onInvalidTemplateID(templateIdentity, content);
  }
  switch (templateIdentity) {
    case "create-password":
      return prepareCreatePasswordEmailMessage(content);

    case "reset-password":
      return prepareResetPasswordEmailMessage(content);
  }
}

export default [
  executeTemplate,
  isValidContent,
  onInvalidContent,
  isValidTemplateID,
  onInvalidTemplateID,
];
