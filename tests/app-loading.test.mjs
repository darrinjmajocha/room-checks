import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, index, serviceWorker] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../service-worker.js", import.meta.url), "utf8"),
]);

test("the browser app has no external module dependency before rendering", () => {
  assert.doesNotMatch(app, /^\s*import\s/m);
  assert.match(index, /<script src="app\.js"><\/script>/);
});

test("the self-contained app includes the building and issue data", () => {
  assert.match(app, /const buildings = \[/);
  assert.match(app, /"Baker A"/);
  assert.match(app, /const issueCatalog = \{/);
  assert.match(app, /function sortCategoriesDescending/);
  assert.match(app, /function collectDraftIssues/);
});

test("the service worker caches only files required by the live app", () => {
  assert.match(serviceWorker, /room-checks-v4/);
  assert.doesNotMatch(serviceWorker, /room-checks-core\.mjs/);
});
