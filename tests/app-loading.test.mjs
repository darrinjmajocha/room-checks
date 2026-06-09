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
  assert.match(index, /<script src="app\.js" defer><\/script>/);
});

test("buildings are present in HTML before JavaScript runs", () => {
  const buildingOptions = [...index.matchAll(/<option value="([^"]+)">/g)].map((match) => match[1]);
  assert.deepEqual(buildingOptions, [
    "Baker A", "Baker B", "Colby A", "Colby B", "Colby C", "DSP", "Ellingson", "Fish A", "Fish B",
    "Fish C", "Gleason", "Gibson A", "Gibson B", "Peterson", "Res Hall A", "Res Hall B", "Res Hall C",
    "Sol Huemann",
  ]);
});

test("native issue categories are present and descending before JavaScript runs", () => {
  const categories = [...index.matchAll(/<details class="issue-card" data-issue="([^"]+)">/g)].map((match) => match[1]);
  assert.deepEqual(categories, [
    "Water Leaks", "Structural Building Maintenance", "Plumbing", "Pests", "Lights", "Keys/Locks",
    "Heating/Cooling/Ventilation", "Elevator", "Cleaning",
  ]);
  assert.equal((index.match(/class="subcategory-row"/g) || []).length, 55);
});

test("the self-contained app still includes data and enhancement helpers", () => {
  assert.match(app, /const buildings = \[/);
  assert.match(app, /const issueCatalog = \{/);
  assert.match(app, /function sortCategoriesDescending/);
  assert.match(app, /function collectDraftIssues/);
  assert.match(app, /querySelectorAll\("\.issue-card\[data-issue\]"\)/);
});


test("text export and separate photo download controls are present", () => {
  assert.match(index, /id="exportText"/);
  assert.match(index, /id="copyTextButton"/);
  assert.match(index, /id="downloadTextButton"/);
  assert.match(index, /id="savedPhotos"/);
  assert.match(index, /id="downloadAllPhotosButton"/);
  assert.doesNotMatch(index, /Download CSV/);
  assert.match(app, /async function labelPhoto/);
  assert.match(app, /function buildExportText/);
  assert.match(app, /navigator\.clipboard\.writeText/);
});

test("legacy offline caches are removed instead of serving stale app files", () => {
  assert.match(app, /getRegistrations\(\)/);
  assert.match(app, /name\.startsWith\("room-checks-"\)/);
  assert.match(serviceWorker, /registration\.unregister\(\)/);
  assert.doesNotMatch(serviceWorker, /respondWith/);
});
