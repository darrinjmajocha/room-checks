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
