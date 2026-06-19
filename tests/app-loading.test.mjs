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
  const buildingSelect = index.match(/<select id="buildingSelect"[\s\S]*?<\/select>/)?.[0] || "";
  const buildingOptions = [...buildingSelect.matchAll(/<option value="([^"]+)">/g)].map((match) => match[1]);
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
    "Heating/Cooling/Ventilation", "Furniture", "Elevator", "Cleaning",
  ]);
  assert.equal((index.match(/class="subcategory-row"/g) || []).length, 62);
});

test("the self-contained app still includes data and enhancement helpers", () => {
  assert.match(app, /const buildings = \[/);
  assert.match(app, /const issueCatalog = \{/);
  assert.match(app, /function sortCategoriesDescending/);
  assert.match(app, /function collectDraftIssues/);
  assert.match(app, /querySelectorAll\("\.issue-card\[data-issue\]"\)/);
});


test("room type dropdown and export controls are present", () => {
  assert.match(index, /id="roomNumber"[^>]+inputmode="numeric"[^>]+pattern="\[0-9\]\*"/);
  assert.match(index, /id="roomType"/);
  assert.match(index, /<option value="Dorm" selected>Dorm<\/option>/);
  assert.match(index, /<option value="Lounge">Lounge<\/option>/);
  assert.match(index, /<option value="Bathroom">Bathroom<\/option>/);
  assert.match(index, /<option value="Elevator">Elevator<\/option>/);
  assert.match(app, /roomType: "Dorm"/);
  assert.match(app, /roomType\.addEventListener\("change", saveDraft\)/);
  assert.match(app, /Furniture: \["Bed Frame", "Mattress", "Drawer", "Desk", "Chair", "Closet", "Refrigerator"\]/);
  assert.match(app, /"Building Name", "Room Number", "Room Type", "Categories and Subcategories", "Additional Notes"/);
  assert.match(index, /id="exportText"/);
  assert.match(index, /id="copyTextButton"/);
  assert.match(index, /id="downloadTextButton"/);
  assert.match(index, /id="downloadCsvButton"/);
  assert.match(index, /id="savedPhotos"/);
  assert.match(index, /id="downloadAllPhotosButton"/);
  assert.match(index, /Download CSV file/);
  assert.match(index, /Download all photos as ZIP/);
  assert.match(app, /async function labelPhoto/);
  assert.match(app, /function buildExportText/);
  assert.match(app, /navigator\.clipboard\.writeText/);
  assert.match(app, /function buildCsvText/);
  assert.match(app, /function createZip/);
});

test("photos are compressed before being saved to browser storage", () => {
  assert.match(app, /PHOTO_DIMENSION_STEPS = \[1000, 850, 700\]/);
  assert.match(app, /PHOTO_TARGET_BYTES = 180 \* 1024/);
  assert.match(app, /async function compressImageForStorage/);
  assert.match(app, /async function compressCanvasForStorage/);
  assert.match(app, /dataUrlSizeInBytes/);
  assert.match(app, /PHOTO_DB_NAME = "rit-room-checks-photos-v1"/);
  assert.match(app, /function openPhotoDb/);
  assert.match(app, /async function saveStoredPhoto/);
  assert.match(app, /async function migrateDraftPhotos/);
  assert.match(app, /Compressed from/);
});

test("photo-free submissions require the requested confirmation", () => {
  assert.match(app, /title: "Submit without photos\?"/);
  assert.match(app, /Including photos is strongly recommended\. Are you sure you want to submit without photos\?/);
  assert.match(app, /confirmLabel: "Submit"/);
});


test("photo issue logging, submit heading, and copy button feedback are present", () => {
  assert.doesNotMatch(index, />Step 2</);
  assert.match(index, /<h2 id="submit-heading">Submit<\/h2>/);
  assert.match(index, /id="photoIssueDialog"/);
  assert.match(index, /id="photoIssueOptions"/);
  assert.match(index, /Select categories to add them to images/);
  assert.doesNotMatch(index, /id="copyToast"/);
  assert.match(index, /class="collected-data-divider"/);
  assert.match(app, /logButton\.textContent = "Log Issue"/);
  assert.match(app, /button\.textContent = "Download"/);
  assert.match(app, /photo\.associatedIssues/);
  assert.match(app, /showCopyButtonSuccess\(\)/);
  assert.match(app, /copyTextButton\.textContent = "Copied!"/);
  assert.match(app, /copyTextButton\.classList\.add\("copy-success"\)/);
  assert.match(app, /globalThis\.isSecureContext/);
  assert.match(app, /document\.execCommand\("copy"\)/);
  assert.match(app, /}, 3000\)/);
});

test("issue selections are cleared only through the current-room reset flow", () => {
  assert.doesNotMatch(index, /Clear issue selections/);
  assert.doesNotMatch(index, /id="clearIssuesButton"/);
  assert.doesNotMatch(app, /clearIssuesButton/);
  assert.doesNotMatch(app, /function clearIssueSelections/);
  assert.match(index, /id="resetCurrentButton"/);
});

test("legacy offline caches are removed instead of serving stale app files", () => {
  assert.match(app, /getRegistrations\(\)/);
  assert.match(app, /name\.startsWith\("room-checks-"\)/);
  assert.match(serviceWorker, /registration\.unregister\(\)/);
  assert.doesNotMatch(serviceWorker, /respondWith/);
});
