import { path, shell, testingAsserts as ta } from "./deps-test.ts";

const port = 8163;
const baseURL = `http://localhost:${port}`;
const httpServer = shell.startListenableService({
  port: port,
  command: [
    Deno.execPath(),
    "run",
    "--allow-net",
    "--allow-read",
    "--unstable",
    "toctl.ts",
    "server",
    `--port=${port}`,
    "--module=./mod_test-html-email-messages.tmpl.ts,medigy-email",
    "--module=./mod_test.single-tmpl.ts",
    "--module=./mod_test.multiple-tmpl.ts",
    "--allow-arbitrary-modules",
    "--default-module=./template-module-debug.ts",
    "--verbose",
  ],
  cwd: path.dirname(path.fromFileUrl(import.meta.url)),
});
ta.assert(httpServer.serviceIsRunning, `Server must be started`);
const started = await httpServer.waitForListener(10000);
ta.assert(
  started,
  `Server must start listening at ${baseURL} within 10 seconds`,
);

Deno.test(`toctl.ts GET service home page (PID ${httpServer.process.pid})`, async () => {
  const resp = await fetch(baseURL);
  ta.assertEquals(await resp.text(), "Template Orchestration Controller");
});

Deno.test(`toctl.ts GET inspect templates (PID ${httpServer.process.pid})`, async () => {
  const resp = await fetch(`${baseURL}/inspect/templates`);
  ta.assertEquals(
    await resp.text(),
    `{"medigy-email":"./mod_test-html-email-messages.tmpl.ts","mod_test.single-tmpl.ts":"./mod_test.single-tmpl.ts","mod_test.multiple-tmpl.ts":"./mod_test.multiple-tmpl.ts"}`,
  );
});

Deno.test(`toctl.ts GET mod_test.single-tmpl.ts with two properties (PID ${httpServer.process.pid})`, async () => {
  const resp = await fetch(
    `${baseURL}/transform/mod_test.single-tmpl.ts?body=TestBody&heading=TestHeading`,
  );
  ta.assertEquals(
    await resp.text(),
    "<html>\n\n<head>\n    TestHeading\n</head>\n\n<body>\n    TestBody\n</body>\n\n</html>",
  );
});

Deno.test(`toctl.ts GET mod_test.multiple-tmpl.ts 'content1' template with two properties (PID ${httpServer.process.pid})`, async () => {
  const resp = await fetch(
    `${baseURL}/transform/mod_test.multiple-tmpl.ts/content1?heading1=TestHeading&body1=TestBody`,
  );
  ta.assertEquals(await resp.text(), "Template 1: TestHeading, TestBody");
});

Deno.test(`toctl.ts POST medigy-email 'create-password' template with one property (PID ${httpServer.process.pid})`, async () => {
  const resp = await fetch(`${baseURL}/transform`, {
    method: "POST",
    body: JSON.stringify({
      templateName: "medigy-email",
      templateIdentity: "create-password",
      content: {
        authnUrl: "https://www.medigy.com/x/reset-password",
      },
    }),
  });
  ta.assertEquals(
    await resp.text(),
    Deno.readTextFileSync("mod_test-email-message-01.html-output.golden"),
  );
});

Deno.test(`toctl.ts POST medigy-email 'create-password' template with invalid property (PID ${httpServer.process.pid})`, async () => {
  const resp = await fetch(`${baseURL}/transform`, {
    method: "POST",
    body: JSON.stringify({
      templateName: "medigy-email",
      templateIdentity: "create-password",
      content: {
        badData: 1,
      },
    }),
  });
  ta.assertEquals(resp.status, 400, "Expected error HTTP status");
  ta.assertEquals(
    await resp.text(),
    'unexpected content for template create-password: {"badData":1}',
  );
});

Deno.test({
  name: `toctl.ts stop server (PID ${httpServer.process.pid})`,
  fn: async () => {
    await httpServer.stop();
  },
  // because httpServer is started outside of this method, we need to let Deno know
  // not to check for resource leaks
  sanitizeOps: false,
  sanitizeResources: false,
});
