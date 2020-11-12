import { testingAsserts as ta } from "./deps-test.ts";
import { govnSvcHealth as gsh, path, shell } from "./deps.ts";

// This unit test can be run two ways:
// 1. With an auto-started child server (default)
// 2. Against an externally started server (set using GTT_TEST_BASE_URL env var)
//    export GTT_TEST_BASE_URL=http://localhost:8179
//    deno test -A --unstable

let baseURL = Deno.env.get("GTT_TEST_BASE_URL");
let childHttpServer: shell.RunListenableServiceResult | undefined = undefined;
let httpServerCaption = baseURL;

if (!baseURL) {
  const port = 8178;
  baseURL = `http://localhost:${port}`;
  childHttpServer = shell.startListenableService({
    port: port,
    command: [
      Deno.execPath(),
      "run",
      "-A",
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
  ta.assert(childHttpServer.serviceIsRunning, `Server must be started`);
  const started = await childHttpServer.waitForListener(10000);
  ta.assert(
    started,
    `Server must start listening at ${baseURL} within 10 seconds:\n ==> ${
      childHttpServer.denoRunOpts.cmd.join(" ")
    }`,
  );
  httpServerCaption = `${baseURL} PID ${childHttpServer.process.pid}`;
}

Deno.test(`toctl.ts GET service home page (${httpServerCaption})`, async () => {
  const resp = await fetch(`${baseURL}`);
  ta.assertEquals(await resp.text(), "Template Orchestration Controller");
});

Deno.test(`toctl.ts GET service health (${httpServerCaption})`, async () => {
  const resp = await fetch(`${baseURL}/health`);
  const health = await resp.json();
  ta.assert(gsh.isHealthy(health));
  ta.assert(gsh.isServiceHealthComponents(health));
  ta.assertArrayIncludes(
    Object.keys(health.details),
    [
      "template:medigy-email",
      "template:mod_test.single-tmpl.ts",
      "template:mod_test.multiple-tmpl.ts",
    ],
  );
});

Deno.test(`toctl.ts GET mod_test.single-tmpl.ts with two properties (${httpServerCaption})`, async () => {
  const resp = await fetch(
    `${baseURL}/transform/mod_test.single-tmpl.ts?body=TestBody&heading=TestHeading`,
  );
  ta.assertEquals(
    await resp.text(),
    "<html>\n\n<head>\n    TestHeading\n</head>\n\n<body>\n    TestBody\n</body>\n\n</html>",
  );
});

Deno.test(`toctl.ts GET mod_test.multiple-tmpl.ts 'content1' template with two properties (${httpServerCaption})`, async () => {
  const resp = await fetch(
    `${baseURL}/transform/mod_test.multiple-tmpl.ts/content1?heading1=TestHeading&body1=TestBody`,
  );
  ta.assertEquals(await resp.text(), "Template 1: TestHeading, TestBody");
});

Deno.test(`toctl.ts POST medigy-email 'create-password' template with one property (${httpServerCaption})`, async () => {
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

Deno.test(`toctl.ts POST medigy-email 'create-password' template with invalid property (${httpServerCaption})`, async () => {
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

if (childHttpServer) {
  Deno.test({
    name: `toctl.ts stop server (${httpServerCaption})`,
    fn: async () => {
      await childHttpServer!.stop();
    },
    // because httpServer is started outside of this method, we need to let Deno know
    // not to check for resource leaks
    sanitizeOps: false,
    sanitizeResources: false,
  });
}
