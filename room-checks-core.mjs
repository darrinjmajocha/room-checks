export function sortCategoriesDescending(catalog) {
  return Object.entries(catalog).sort(([categoryA], [categoryB]) => categoryB.localeCompare(categoryA));
}

export function collectDraftIssues(draft) {
  const selectedIssues = Object.entries(draft.issues || {})
    .flatMap(([issue, subcategories]) =>
      Object.entries(subcategories || {}).map(([subcategory, description]) => ({ issue, subcategory, description })),
    )
    .filter(({ subcategory }) => subcategory);

  const customIssues = (draft.customIssues || [])
    .map(({ subcategory, description }) => ({ issue: "Other", subcategory, description }))
    .filter(({ subcategory, description }) => subcategory || description)
    .map(({ issue, subcategory, description }) => ({ issue, subcategory: subcategory || "Other", description }));

  return [...selectedIssues, ...customIssues];
}

export function cleanTextCell(value) {
  return String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
}

export function buildTabSeparatedText(entries) {
  const rows = [["Building", "Room", "Category", "Sub-issue", "Description"]];
  entries.forEach((entry) => {
    entry.issues.forEach(({ issue, subcategory, description }) => {
      rows.push([entry.building, entry.roomNumber, issue, subcategory, description]);
    });
  });
  return rows.map((row) => row.map(cleanTextCell).join("\t")).join("\n");
}

export function safeFilenamePart(value) {
  return String(value).trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "unknown";
}

export function photoFilename(building, room, index) {
  return `${safeFilenamePart(building)}_${safeFilenamePart(room)}_${index + 1}.jpg`;
}
