export interface TemplateLiteral {
  (
    literals: TemplateStringsArray,
    ...placeholders: string[]
  ): string;
}
