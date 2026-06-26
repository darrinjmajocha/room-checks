export function sortCategoriesDescending(catalog) {
  return Object.entries(catalog).sort(([categoryA], [categoryB]) => categoryB.localeCompare(categoryA));
}

export function resolveIssueSubcategory(draft, issue, subcategory) {
  if (subcategory !== "Other") return subcategory;
  return draft.customSubcategories?.[issue]?.[subcategory]?.trim() || subcategory;
}

export function collectDraftIssues(draft) {
  const selectedIssues = Object.entries(draft.issues || {})
    .flatMap(([issue, subcategories]) =>
      Object.entries(subcategories || {}).map(([subcategory, description]) => ({
        issue,
        subcategory: resolveIssueSubcategory(draft, issue, subcategory),
        description,
      })),
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

export function formatIssuePairs(entry) {
  return (entry.issues || [])
    .map(({ issue, subcategory }) => `${cleanTextCell(issue)}, ${cleanTextCell(subcategory)}`)
    .join("; ");
}

export function formatIssueNotes(entry) {
  return (entry.issues || []).map(({ description }) => cleanTextCell(description)).join("; ");
}

export function formatPartnerSummary(entry) {
  const issueSummaries = (entry.issues || [])
    .map(({ subcategory, description }) => `${cleanTextCell(subcategory)}: ${cleanTextCell(description)}`)
    .join("; ");
  return `${cleanTextCell(entry.building)} ${cleanTextCell(entry.roomNumber)} -- ${issueSummaries}`;
}

export function buildTabSeparatedText(entries) {
  const rows = entries.map((entry) => [
    entry.building,
    entry.roomNumber,
    entry.roomType || "Dorm",
    formatIssuePairs(entry),
    formatIssueNotes(entry),
    formatPartnerSummary(entry),
  ]);
  return rows.map((row) => row.map(cleanTextCell).join("\t")).join("\n");
}

export function safeFilenamePart(value) {
  return String(value).trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "unknown";
}

export function photoFilename(building, room, index) {
  return `${safeFilenamePart(building)}_${safeFilenamePart(room)}_${index + 1}.jpg`;
}

export function csvCell(value) {
  return `"${cleanTextCell(value).replaceAll('"', '""')}"`;
}

export function buildCsvText(entries) {
  const rows = [["Building Name", "Room Number", "Room Type", "Categories and Subcategories", "Additional Notes", "Partner Summary"]];
  entries.forEach((entry) => {
    rows.push([entry.building, entry.roomNumber, entry.roomType || "Dorm", formatIssuePairs(entry), formatIssueNotes(entry), formatPartnerSummary(entry)]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
