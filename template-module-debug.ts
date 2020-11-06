/**
 * This is a debugging template module - all input is valid and it just emits
 * the output in JSON format to show that it's working.
 */

// deno-lint-ignore no-empty-interface
export interface DebugContent extends Record<string, unknown> {
  // all content is valid
}

export function isValidContent(content: DebugContent): content is DebugContent {
  return true;
}

export function onInvalidContent(content: DebugContent): string {
  return "All content is valid, this should never be emitted.";
}

export function executeTemplate(content: DebugContent): string {
  return JSON.stringify(content);
}

export default [executeTemplate, isValidContent, onInvalidContent];
