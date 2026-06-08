import test from "node:test";
import assert from "node:assert/strict";
import { collectDraftIssues, sortCategoriesDescending } from "../room-checks-core.mjs";

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
