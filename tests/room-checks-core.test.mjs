import test from "node:test";
import assert from "node:assert/strict";
import { buildCsvText, buildTabSeparatedText, collectDraftIssues, photoFilename, sortCategoriesDescending } from "../room-checks-core.mjs";

test("categories are sorted in descending alphabetical order", () => {
  const catalog = { Cleaning: [], "Water Leaks": [], Elevator: [], Plumbing: [] };
  assert.deepEqual(
    sortCategoriesDescending(catalog).map(([category]) => category),
    ["Water Leaks", "Plumbing", "Elevator", "Cleaning"],
  );
});

test("selected issues are collected even when their description is blank", () => {
  const issues = collectDraftIssues({
    issues: { Cleaning: { "General Cleaning": "" } },
    customIssues: [],
  });
  assert.deepEqual(issues, [{ issue: "Cleaning", subcategory: "General Cleaning", description: "" }]);
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
        { issue: "Cleaning", subcategory: "Mold", description: "Near shower\ncorner" },
        { issue: "Lights", subcategory: "No Power", description: "East wall" },
      ],
    },
  ]);
  assert.equal(
    text,
    "Baker A\t4020\tBathroom\tCleaning, Mold; Lights, No Power\tNear shower corner; East wall",
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
      issues: [{ issue: "Cleaning", subcategory: "Mold", description: 'Wall, near "sink"' }],
    },
  ]);
  assert.equal(
    csv,
    '"Building Name","Room Number","Room Type","Categories and Subcategories","Additional Notes"\r\n' +
      '"Baker A","4020","Dorm","Cleaning, Mold","Wall, near ""sink"""',
  );
});
