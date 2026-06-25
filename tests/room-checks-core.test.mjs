import test from "node:test";
import assert from "node:assert/strict";
import { buildCsvText, buildTabSeparatedText, collectDraftIssues, photoFilename, sortCategoriesDescending } from "../room-checks-core.mjs";

test("categories are sorted in descending alphabetical order", () => {
  const catalog = { Fridges: [], Windows: [], HVAC: [], Walls: [] };
  assert.deepEqual(
    sortCategoriesDescending(catalog).map(([category]) => category),
    ["Windows", "Walls", "HVAC", "Fridges"],
  );
});

test("selected issues are collected even when their description is blank", () => {
  const issues = collectDraftIssues({
    issues: { Walls: { "Chipped Paint": "" } },
    customIssues: [],
  });
  assert.deepEqual(issues, [{ issue: "Walls", subcategory: "Chipped Paint", description: "" }]);
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


test("tab-separated output creates five consolidated spreadsheet columns with no header row", () => {
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
    "Baker A\t4020\tBathroom\tFridges, Moldy; Windows, Window Screen\tNear seal edge; East wall",
  );
});

test("photo filenames use building, room, and one-based sequence", () => {
  assert.equal(photoFilename("Res Hall A", "11-009", 0), "Res_Hall_A_11-009_1.jpg");
});


test("CSV output quotes all five consolidated columns and escapes descriptions", () => {
  const csv = buildCsvText([
    {
      building: "Baker A",
      roomNumber: "4020",
      roomType: "Dorm",
      issues: [{ issue: "Walls", subcategory: "Holes", description: 'Wall, near "desk"' }],
    },
  ]);
  assert.equal(
    csv,
    '"Building Name","Room Number","Room Type","Categories and Subcategories","Additional Notes"\r\n' +
      '"Baker A","4020","Dorm","Walls, Holes","Wall, near ""desk"""',
  );
});
