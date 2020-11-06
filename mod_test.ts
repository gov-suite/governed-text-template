import { path, testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./mod.ts";

function testFilePath(relTestFileName: string): string {
  return path.join(
    path.relative(
      Deno.cwd(),
      path.dirname(import.meta.url).substr("file://".length),
    ),
    relTestFileName,
  );
}

Deno.test(`HTML escaped string literal`, async () => {
  const escaped = mod.htmlEscape`This should be <escaped>`;
  ta.assertEquals(escaped, "This should be &lt;escaped&gt;");
});

Deno.test(`Non-HTML escaped string literal with HTML escaped placeholders`, async () => {
  const escaped = "<be escaped>";
  const phe = mod.htmlEscapePlaceholders
    `This should be <not be escaped> ${escaped}`;
  ta.assertEquals(phe, "This should be <not be escaped> &lt;be escaped&gt;");
});

Deno.test(`HTML tag raw`, async () => {
  const div = mod.xmlTag("div");
  const phe = div`This should be in a div with <no escapes>`;
  ta.assertEquals(phe, "<div>This should be in a div with <no escapes></div>");
});

Deno.test(`HTML tag with results escaped`, async () => {
  const div = mod.xmlTag(
    "div",
    { style: "color: white" },
    { escapeResult: true },
  );
  const phe = div`This should be in a div with <escaped tag>`;
  ta.assertEquals(
    phe,
    `<div style="color: white">This should be in a div with &lt;escaped tag&gt;</div>`,
  );
});

Deno.test(`invalid HTML template module: mod_test.tmpl-invalid-no-default.ts`, async () => {
  const result = await mod.executeTemplateModule({
    srcURL: "./mod_test.tmpl-invalid-no-default.ts",
    content: {},
  });
  ta.assertStrictEquals(
    result,
    "No module.default found in ./mod_test.tmpl-invalid-no-default.ts",
  );
});

Deno.test(`invalid HTML template module: mod_test.tmpl-invalid-default-type.ts`, async () => {
  const result = await mod.executeTemplateModule({
    srcURL: "./mod_test.tmpl-invalid-default-type.ts",
    content: {},
  });
  ta.assertStrictEquals(
    result,
    "module.default is not an array or function: ./mod_test.tmpl-invalid-default-type.ts",
  );
});

Deno.test(`HTML template module: mod_test.single-tmpl.ts produces mod_test.tmpl.html-output.golden`, async () => {
  const content = "variable";
  const result = await mod.executeTemplateModule({
    srcURL: "./mod_test.single-tmpl.ts",
    content: {
      heading: "<title>Page Title</title>",
      body:
        `This is my body content, which can contain a ${content} or anything else that can go into a TypeScript template literal.`,
    },
  });
  ta.assertStrictEquals(
    result,
    Deno.readTextFileSync(
      testFilePath("mod_test.single-tmpl.html-output.golden"),
    ),
  );
});

Deno.test(`HTML template module: mod_test.single-in.json produces mod_test.single-tmpl.html-output.golden`, async () => {
  const result = await mod.transformJsonInput(
    Deno.readTextFileSync(testFilePath("mod_test.single-in.json")),
    {
      allowArbitraryModule: (templateUrl) => {
        return true;
      },
    },
  );
  ta.assertStrictEquals(
    result,
    Deno.readTextFileSync(
      testFilePath("mod_test.single-tmpl.html-output.golden"),
    ),
  );
});

Deno.test(`HTML template module: mod_test.multiple-in.json`, async () => {
  const result = await mod.transformJsonInput(
    Deno.readTextFileSync(testFilePath("mod_test.multiple-in.json")),
    {
      allowArbitraryModule: (templateUrl) => {
        return true;
      },
    },
  );
  ta.assertStrictEquals(result, "Template 2: Heading Text, Body Text");
});

Deno.test(`HTML template module: mod_test-email-message-01.in.json`, async () => {
  const result = await mod.transformJsonInput(
    Deno.readTextFileSync(testFilePath("mod_test-email-message-01.in.json")),
    {
      allowArbitraryModule: (templateUrl) => {
        return true;
      },
    },
  );
  ta.assertStrictEquals(
    result,
    Deno.readTextFileSync(
      testFilePath("mod_test-email-message-01.html-output.golden"),
    ),
  );
});

Deno.test(`HTML template module: mod_test-email-message-01.in-name.json`, async () => {
  const result = await mod.transformJsonInput(
    Deno.readTextFileSync(
      testFilePath("mod_test-email-message-01.in-name.json"),
    ),
    {
      namedTemplateURL: (name: string): string | undefined => {
        if (name == "lookupUrlForName") {
          return "./mod_test-html-email-messages.tmpl.ts";
        }
        return undefined;
      },
    },
  );
  ta.assertStrictEquals(
    result,
    Deno.readTextFileSync(
      testFilePath("mod_test-email-message-01.html-output.golden"),
    ),
  );
});

Deno.test(`HTML template module: mod_test-email-message-01.in-default.json`, async () => {
  const result = await mod.transformJsonInput(
    Deno.readTextFileSync(
      testFilePath("mod_test-email-message-01.in-default.json"),
    ),
    {
      defaultTemplateURL: (): string => {
        return "./template-module-debug.ts";
      },
    },
  );
  ta.assertStrictEquals(
    result,
    `{"authnUrl":"https://www.medigy.com/x/reset-password"}`,
  );
});
