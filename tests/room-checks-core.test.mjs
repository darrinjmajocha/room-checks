import test from "node:test";
import assert from "node:assert/strict";
import { buildTabSeparatedText, collectDraftIssues, photoFilename, sortCategoriesDescending } from "../room-checks-core.mjs";

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


test("tab-separated output creates five spreadsheet columns and one line per issue", () => {
  const text = buildTabSeparatedText([
    {
      building: "Baker A",
      roomNumber: "4020",
      issues: [
        { issue: "Cleaning", subcategory: "Mold", description: "Near shower\ncorner" },
        { issue: "Lights", subcategory: "No Power", description: "East wall" },
      ],
    },
  ]);
  assert.equal(
    text,
    "Building\tRoom\tCategory\tSub-issue\tDescription\n" +
      "Baker A\t4020\tCleaning\tMold\tNear shower corner\n" +
      "Baker A\t4020\tLights\tNo Power\tEast wall",
  );
});

test("photo filenames use building, room, and one-based sequence", () => {
  assert.equal(photoFilename("Res Hall A", "11-009", 0), "Res_Hall_A_11-009_1.jpg");
});
