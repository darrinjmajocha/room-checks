import test from "node:test";
import assert from "node:assert/strict";
import { buildCsvText, buildTabSeparatedText, collectDraftIssues, photoFilename, sortCategoriesDescending } from "../room-checks-core.mjs";

test("categories are sorted in descending alphabetical order", () => {
  const catalog = { Carpet: [], Fridges: [], Windows: [], HVAC: [], Paint: [] };
  assert.deepEqual(
    sortCategoriesDescending(catalog).map(([category]) => category),
    ["Windows", "Paint", "HVAC", "Fridges", "Carpet"],
  );
});

test("selected issues are collected even when their description is blank", () => {
  const issues = collectDraftIssues({
    issues: { Paint: { Crack: "" } },
    customIssues: [],
  });
  assert.deepEqual(issues, [{ issue: "Paint", subcategory: "Crack", description: "" }]);
});

test("custom subcategories replace selected Other subcategory labels", () => {
  const issues = collectDraftIssues({
    issues: { Fridges: { Other: "The door hinge has come loose." } },
    customSubcategories: { Fridges: { Other: "Broken Hinge" } },
    customIssues: [],
  });
  assert.deepEqual(issues, [{ issue: "Fridges", subcategory: "Broken Hinge", description: "The door hinge has come loose." }]);
});

test("custom issues are included and empty drafts are ignored", () => {
  const issues = collectDraftIssues({
    issues: {},
    customIssues: [
      { subcategory: "Furniture damage", description: "Broken chair" },
      { subcategory: "", description: "" },
    ],
  });
  assert.deepEqual(issues, [{ issue: "Other", subcategory: "Furniture damage", description: "Broken chair" }]);
});


test("tab-separated output creates six consolidated spreadsheet columns with partner summary and no header row", () => {
  const text = buildTabSeparatedText([
    {
      building: "Baker A",
      roomNumber: "4020",
      roomType: "Bathroom",
      issues: [
        { issue: "Fridges", subcategory: "Moldy", description: "Near seal\nedge" },
        { issue: "Windows", subcategory: "Window Screen", description: "East wall" },
      ],
    },
  ]);
  assert.equal(
    text,
    "Baker A\t4020\tBathroom\tFridges, Moldy; Windows, Window Screen\tNear seal edge; East wall\tBaker A 4020 -- Moldy: Near seal edge; Window Screen: East wall",
  );
});

test("photo filenames use building, room, and one-based sequence", () => {
  assert.equal(photoFilename("Res Hall A", "11-009", 0), "Res_Hall_A_11-009_1.jpg");
});


test("CSV output quotes all six consolidated columns and escapes descriptions", () => {
  const csv = buildCsvText([
    {
      building: "Baker A",
      roomNumber: "4020",
      roomType: "Dorm",
      issues: [{ issue: "Paint", subcategory: "Crack", description: 'Wall, near "desk"' }],
    },
  ]);
  assert.equal(
    csv,
    '"Building Name","Room Number","Room Type","Categories and Subcategories","Additional Notes","Partner Summary"\r\n' +
      '"Baker A","4020","Dorm","Paint, Crack","Wall, near ""desk""","Baker A 4020 -- Crack: Wall, near ""desk"""',
  );
});
