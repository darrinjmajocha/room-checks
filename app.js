const STORAGE_KEY = "rit-room-checks-v1";
const DRAFT_KEY = "rit-room-checks-draft-v1";

const buildings = [
  "Baker A",
  "Baker B",
  "Colby A",
  "Colby B",
  "Colby C",
  "DSP",
  "Ellingson",
  "Fish A",
  "Fish B",
  "Fish C",
  "Gleason",
  "Gibson A",
  "Gibson B",
  "Peterson",
  "Res Hall A",
  "Res Hall B",
  "Res Hall C",
  "Sol Huemann",
];

const issueCatalog = {
  Cleaning: [
    "Bathroom Refresh",
    "Clean or Shovel Entry Ways",
    "Garbage Removal",
    "Garbage/Recycling Bins Needed",
    "General Cleaning",
    "Inside Vandalism",
    "Mold",
    "Replace Shower Curtain",
    "Spill or Glass Cleanup",
    "Other",
  ],
  Lights: ["Exterior Building Lighting", "Lighting Repair-Inside", "No Power", "Outlet/Switch Cover Repair", "Other"],
  Elevator: ["Button Repair", "Not Responding", "Other"],
  "Heating/Cooling/Ventilation": ["Controls", "General Repair", "Noise", "Steam", "Too Hot", "Too Cold", "Ventilation", "Other"],
  "Keys/Locks": ["Change Lock", "Damaged/Broken Lock"],
  Pests: ["Ants", "Bees", "Mice", "Other"],
  Plumbing: ["Clogged Drains", "Drinking Fountains", "Showers", "Sink", "Toilet Clog", "Toilet/Urinal", "Water Temperature", "Other"],
  "Structural Building Maintenance": [
    "Automated Accessible Door",
    "Ceiling",
    "Door",
    "Flooring",
    "Repair Bathroom Stall",
    "Repair Card Reader",
    "Replace Mirror",
    "Wall",
    "Window/Screen",
    "Other",
  ],
  "Water Leaks": ["Bathroom", "Ceiling", "Kitchen", "Sprinkler System", "Other"],
};

const state = {
  draft: loadDraft(),
  entries: loadEntries(),
  installPrompt: null,
};

const buildingSelect = document.querySelector("#buildingSelect");
const roomNumber = document.querySelector("#roomNumber");
const issueCatalogEl = document.querySelector("#issueCatalog");
const clearIssuesButton = document.querySelector("#clearIssuesButton");
const saveEntryButton = document.querySelector("#saveEntryButton");
const resetCurrentButton = document.querySelector("#resetCurrentButton");
const downloadCsvButton = document.querySelector("#downloadCsvButton");
const clearEntriesButton = document.querySelector("#clearEntriesButton");
const photoInput = document.querySelector("#photoInput");
const photoPreview = document.querySelector("#photoPreview");
const savedEntries = document.querySelector("#savedEntries");
const entryCount = document.querySelector("#entryCount");
const installButton = document.querySelector("#installButton");
const roomForm = document.querySelector("#roomForm");
const addCustomIssueButton = document.querySelector("#addCustomIssueButton");
const customIssueList = document.querySelector("#customIssueList");

function defaultDraft() {
  return { building: buildings[0], roomNumber: "", issues: {}, customIssues: [], photos: [] };
}

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || fallback);
  } catch {
    return JSON.parse(fallback);
  }
}

function loadEntries() {
  return readStoredJson(STORAGE_KEY, "[]");
}

function loadDraft() {
  return { ...defaultDraft(), ...readStoredJson(DRAFT_KEY, "{}") };
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  renderSavedEntries();
}

function saveDraft() {
  state.draft.building = buildingSelect.value;
  state.draft.roomNumber = roomNumber.value.trim();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
}

function renderBuildings() {
  buildingSelect.innerHTML = buildings.map((building) => `<option value="${escapeHtml(building)}">${escapeHtml(building)}</option>`).join("");
  buildingSelect.value = state.draft.building || buildings[0];
  roomNumber.value = state.draft.roomNumber || "";
}

function renderIssueCatalog() {
  issueCatalogEl.innerHTML = "";
  const issueTemplate = document.querySelector("#issueTemplate");
  const subcategoryTemplate = document.querySelector("#subcategoryTemplate");

  Object.entries(issueCatalog).forEach(([issue, subcategories]) => {
    const issueNode = issueTemplate.content.firstElementChild.cloneNode(true);
    const toggle = issueNode.querySelector(".issue-toggle");
    const name = issueNode.querySelector(".issue-name");
    const summary = issueNode.querySelector(".issue-summary");
    const list = issueNode.querySelector(".subcategory-list");
    name.textContent = issue;

    subcategories.forEach((subcategory) => {
      const row = subcategoryTemplate.content.firstElementChild.cloneNode(true);
      const checkbox = row.querySelector("input");
      const label = row.querySelector("span");
      const textarea = row.querySelector("textarea");
      label.textContent = subcategory;
      checkbox.checked = Boolean(state.draft.issues?.[issue]?.[subcategory]);
      textarea.value = state.draft.issues?.[issue]?.[subcategory] || "";
      textarea.hidden = !checkbox.checked;

      checkbox.addEventListener("change", () => {
        if (!state.draft.issues[issue]) state.draft.issues[issue] = {};
        textarea.hidden = !checkbox.checked;
        if (checkbox.checked) {
          state.draft.issues[issue][subcategory] = textarea.value;
        } else {
          delete state.draft.issues[issue][subcategory];
          textarea.value = "";
        }
        updateIssueSummary(issueNode, issue);
        saveDraft();
      });

      textarea.addEventListener("input", () => {
        if (!state.draft.issues[issue]) state.draft.issues[issue] = {};
        state.draft.issues[issue][subcategory] = textarea.value.trim();
        saveDraft();
      });

      list.append(row);
    });

    toggle.addEventListener("click", () => {
      const willExpand = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(willExpand));
      list.hidden = !willExpand;
    });

    const hasSelections = Object.keys(state.draft.issues?.[issue] || {}).length > 0;
    toggle.setAttribute("aria-expanded", String(hasSelections));
    list.hidden = !hasSelections;
    updateIssueSummary(issueNode, issue);
    issueCatalogEl.append(issueNode);
  });
}

function updateIssueSummary(issueNode, issue) {
  const selectedCount = Object.keys(state.draft.issues?.[issue] || {}).length;
  issueNode.querySelector(".issue-summary").textContent = selectedCount ? `${selectedCount} selected` : "Tap to expand";
}

async function handlePhotos(files) {
  const photos = await Promise.all([...files].map(fileToPhoto));
  state.draft.photos.push(...photos);
  saveDraft();
  renderPhotos();
}

function fileToPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderCustomIssues() {
  customIssueList.innerHTML = "";
  const template = document.querySelector("#customIssueTemplate");

  if (!state.draft.customIssues.length) {
    customIssueList.innerHTML = '<p class="hint">No additional other issues added.</p>';
    return;
  }

  state.draft.customIssues.forEach((customIssue, index) => {
    const row = template.content.firstElementChild.cloneNode(true);
    const nameInput = row.querySelector(".custom-issue-name");
    const descriptionInput = row.querySelector(".custom-issue-description");
    nameInput.value = customIssue.subcategory || "";
    descriptionInput.value = customIssue.description || "";
    nameInput.addEventListener("input", () => {
      state.draft.customIssues[index].subcategory = nameInput.value.trim();
      saveDraft();
    });
    descriptionInput.addEventListener("input", () => {
      state.draft.customIssues[index].description = descriptionInput.value.trim();
      saveDraft();
    });
    row.querySelector("button").addEventListener("click", () => {
      state.draft.customIssues.splice(index, 1);
      saveDraft();
      renderCustomIssues();
    });
    customIssueList.append(row);
  });
}

function addCustomIssue() {
  state.draft.customIssues.push({ issue: "Other", subcategory: "", description: "" });
  saveDraft();
  renderCustomIssues();
  customIssueList.querySelector(".custom-issue-row:last-child input")?.focus();
}

function renderPhotos() {
  photoPreview.innerHTML = "";
  state.draft.photos.forEach((photo, index) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.innerHTML = `<img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}"><button class="ghost-button" type="button">Remove</button>`;
    card.querySelector("button").addEventListener("click", () => {
      state.draft.photos.splice(index, 1);
      saveDraft();
      renderPhotos();
    });
    photoPreview.append(card);
  });
}

function collectIssues() {
  const selectedIssues = Object.entries(state.draft.issues)
    .flatMap(([issue, subcategories]) => Object.entries(subcategories).map(([subcategory, description]) => ({ issue, subcategory, description })))
    .filter(({ subcategory }) => subcategory);
  const customIssues = state.draft.customIssues
    .map(({ subcategory, description }) => ({ issue: "Other", subcategory, description }))
    .filter(({ subcategory, description }) => subcategory || description)
    .map(({ issue, subcategory, description }) => ({ issue, subcategory: subcategory || "Other", description }));
  return [...selectedIssues, ...customIssues];
}

function createEntryId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveCurrentEntry() {
  saveDraft();
  const issues = collectIssues();
  if (!state.draft.building || !state.draft.roomNumber) {
    alert("Please choose a building and enter a room number.");
    return;
  }
  if (!issues.length) {
    alert("Please select at least one issue before saving this room.");
    return;
  }

  state.entries.push({
    id: createEntryId(),
    createdAt: new Date().toISOString(),
    building: state.draft.building,
    roomNumber: state.draft.roomNumber,
    issues,
    photos: state.draft.photos,
  });
  saveEntries();
  resetCurrentDraft(true);
  roomNumber.focus();
}

function resetCurrentDraft(keepBuilding = false) {
  const building = keepBuilding ? state.draft.building : buildings[0];
  state.draft = { ...defaultDraft(), building };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
  renderBuildings();
  renderIssueCatalog();
  renderCustomIssues();
  renderPhotos();
}

function clearIssueSelections() {
  state.draft.issues = {};
  state.draft.customIssues = [];
  saveDraft();
  renderIssueCatalog();
  renderCustomIssues();
}

function renderSavedEntries() {
  const count = state.entries.length;
  entryCount.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;
  savedEntries.innerHTML = "";
  if (!count) {
    savedEntries.innerHTML = '<p class="hint">No entries saved yet.</p>';
    return;
  }

  state.entries.slice().reverse().forEach((entry) => {
    const entryEl = document.createElement("article");
    entryEl.className = "saved-entry";
    entryEl.innerHTML = `
      <h3>${escapeHtml(entry.building)} — ${escapeHtml(entry.roomNumber)}</h3>
      <p>${entry.issues.length} issue rows • ${entry.photos.length} photo(s)</p>
      <p>${entry.issues.map(({ issue, subcategory }) => `${escapeHtml(issue)}: ${escapeHtml(subcategory)}`).join("; ")}</p>
    `;
    savedEntries.append(entryEl);
  });
}

function downloadCsv() {
  if (!state.entries.length) {
    alert("No saved entries to export yet.");
    return;
  }
  const rows = [["Building", "Room Number", "Issue", "Subcategory", "Description", "Photos", "Created At"]];
  state.entries.forEach((entry) => {
    entry.issues.forEach(({ issue, subcategory, description }, issueIndex) => {
      rows.push([
        entry.building,
        entry.roomNumber,
        issue,
        subcategory,
        description,
        issueIndex === 0 ? entry.photos.map((photo) => `${photo.name}: ${photo.dataUrl}`).join(" | ") : "",
        entry.createdAt,
      ]);
    });
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `room-checks-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

buildingSelect.addEventListener("change", saveDraft);
roomNumber.addEventListener("input", saveDraft);
photoInput.addEventListener("change", (event) => {
  handlePhotos(event.target.files);
  event.target.value = "";
});
roomForm.addEventListener("submit", (event) => event.preventDefault());
clearIssuesButton.addEventListener("click", clearIssueSelections);
addCustomIssueButton.addEventListener("click", addCustomIssue);
saveEntryButton.addEventListener("click", saveCurrentEntry);
resetCurrentButton.addEventListener("click", () => resetCurrentDraft(false));
downloadCsvButton.addEventListener("click", downloadCsv);
clearEntriesButton.addEventListener("click", () => {
  if (confirm("Clear all saved room entries from this device?")) {
    state.entries = [];
    saveEntries();
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

renderBuildings();
renderIssueCatalog();
renderCustomIssues();
renderPhotos();
renderSavedEntries();
