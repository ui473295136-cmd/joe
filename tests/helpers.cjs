const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(test, ms = 3000) {
  const end = Date.now() + ms;
  while (!test()) {
    if (Date.now() > end) throw new Error("Timed out waiting for test page");
    await wait(15);
  }
}
class LocalResources extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.hostname !== "localhost") return null;
    const p = path.join(root, u.pathname);
    if (!p.startsWith(root + path.sep)) return null;
    try {
      return Promise.resolve(fs.readFileSync(p));
    } catch {
      return null;
    }
  }
}
async function app(person = "瑞子") {
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (!/navigation|scrollTo/.test(e.message)) errors.push(e.message);
  });
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "app-v4.html"), "utf8"),
    {
      url:
        "http://localhost/app-v4.html?qa=1&person=" +
        encodeURIComponent(person),
      runScripts: "dangerously",
      resources: new LocalResources(),
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(w) {
        w.fetch = async (url) => {
          const u = new URL(String(url), "http://localhost");
          if (
            u.hostname === "localhost" &&
            u.pathname.endsWith("road-routes.json")
          )
            return new Response(
              fs.readFileSync(path.join(root, "road-routes.json"), "utf8"),
            );
          throw new Error("Unexpected external request: " + u.hostname);
        };
        w.Response = Response;
        w.AbortController = AbortController;
        w.scrollTo = () => {};
        w.HTMLElement.prototype.scrollIntoView = () => {};
        w.matchMedia = () => ({
          matches: false,
          addEventListener() {},
          removeEventListener() {},
        });
        w.URL.createObjectURL = () => "blob:test-image";
        w.URL.revokeObjectURL = () => {};
        w.confirm = () => false;
        w.alert = () => {};
      },
    },
  );
  await until(
    () =>
      dom.window.document.documentElement.classList.contains(
        "cw-social-ready",
      ) &&
      dom.window.CWProfiles &&
      dom.window.CWUX,
  );
  await wait(300);
  return { dom, w: dom.window, d: dom.window.document, errors };
}
module.exports = { app, until, wait, root, JSDOM };
