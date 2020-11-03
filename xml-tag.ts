import { escapeHtml } from "./escape-html.ts";
import { TemplateLiteral } from "./template-literal.ts";

export type XmlTagAttributeValue = string;

export interface XmlTagAttributeValueSupplier {
  (name: string, options?: XmlTagOptions): XmlTagAttributeValue;
}

export interface XmlTagAttributes {
  [name: string]: XmlTagAttributeValue | XmlTagAttributeValueSupplier;
}

export interface XmlTagOptions {
  readonly escapeResult?: boolean;
}

export function xmlTag(
  tagName: string,
  attributes?: XmlTagAttributes,
  options?: XmlTagOptions,
): TemplateLiteral {
  const { escapeResult } = options || { escapeResult: false };
  return (literals: TemplateStringsArray, ...placeholders: string[]) => {
    let result = "";
    for (let i = 0; i < placeholders.length; i++) {
      result += literals[i];
      result += placeholders[i];
    }
    result += literals[literals.length - 1];
    let tagStart = `<${tagName}`;
    if (attributes) {
      for (const attr of Object.entries(attributes)) {
        const [name, valueSupplier] = attr;
        const value = typeof valueSupplier == "string"
          ? valueSupplier
          : valueSupplier(name, options);
        tagStart += ` ${name}="${value.replaceAll('"', "&quot;")}"`;
      }
    }
    tagStart += ">";
    return tagStart + (escapeResult ? escapeHtml(result) : result) +
      `</${tagName}>`;
  };
}
