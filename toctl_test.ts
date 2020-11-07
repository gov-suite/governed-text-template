import { bufIO, path, testingAsserts as ta, textproto } from "./deps-test.ts";

Deno.test(`toctl.ts GET /transform/mod_test.single-tmpl.ts`, async () => {
  const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
  const p = Deno.run({
    cmd: [
      Deno.execPath(),
      "run",
      "--allow-net",
      "--allow-read",
      "--unstable",
      "toctl.ts",
      "server",
      "--port=8163",
    ],
    cwd: moduleDir,
    stdout: "piped",
  });

  let serverIsRunning = true;
  const statusPromise = p
    .status()
    .then((): void => {
      serverIsRunning = false;
    })
    .catch((_): void => {}); // Ignores the error when closing the process.

  const r = new textproto.TextProtoReader(new bufIO.BufReader(p.stdout));
  const firstLine = await r.readLine();

  ta.assert(
    firstLine !== null &&
      firstLine.includes(
        "Template Orchestration service running at http://localhost:8163",
      ),
    "server must be started",
  );

  const url =
    "http://localhost:8163/transform/mod_test.single-tmpl.ts?body=TestBody&heading=TestHeading";
  const resp = await fetch("http://localhost:8163");
  const body = await resp.text();
  ta.assertEquals(body, "Template Orchestration Controller");

  ta.assert(serverIsRunning);

  // Stops the sever and allows `p.status()` promise to resolve
  Deno.kill(p.pid, Deno.Signal.SIGKILL);
  await statusPromise;
  p.stdout.close();
  p.close();
  ta.assert(!serverIsRunning);
});
