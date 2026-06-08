import { collectDraftIssues, sortCategoriesDescending } from "./room-checks-core.mjs";

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

function sortCategoriesDescending(catalog) {
  return Object.entries(catalog).sort(([categoryA], [categoryB]) => categoryB.localeCompare(categoryA));
}

function collectDraftIssues(draft) {
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
const actionStatus = document.querySelector("#actionStatus");
const confirmDialog = document.querySelector("#confirmDialog");
const confirmDialogTitle = document.querySelector("#confirmDialogTitle");
const confirmDialogMessage = document.querySelector("#confirmDialogMessage");
const confirmDialogButton = document.querySelector("#confirmDialogButton");
const cancelDialogButton = document.querySelector("#cancelDialogButton");

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

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save ${key}`, error);
    return false;
  }
}

function saveEntries() {
  if (!writeStoredJson(STORAGE_KEY, state.entries)) return false;
  renderSavedEntries();
  return true;
}

function saveDraft() {
  state.draft.building = buildingSelect.value;
  state.draft.roomNumber = roomNumber.value.trim();
  return writeStoredJson(DRAFT_KEY, state.draft);
}

function showStatus(message, isError = false) {
  actionStatus.textContent = message;
  actionStatus.classList.toggle("error", isError);
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

  const categories = sortCategoriesDescending(issueCatalog);

  categories.forEach(([issue, subcategories]) => {
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
      checkbox.checked = Object.prototype.hasOwnProperty.call(state.draft.issues?.[issue] || {}, subcategory);
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
      updateIssueSummary(issueNode, issue);
    });

    toggle.setAttribute("aria-expanded", "false");
    list.hidden = true;
    updateIssueSummary(issueNode, issue);
    issueCatalogEl.append(issueNode);
  });
}

function updateIssueSummary(issueNode, issue) {
  const selectedCount = Object.keys(state.draft.issues?.[issue] || {}).length;
  const isExpanded = issueNode.querySelector(".issue-toggle").getAttribute("aria-expanded") === "true";
  issueNode.querySelector(".issue-summary").textContent = selectedCount
    ? `${selectedCount} selected`
    : isExpanded
      ? "Tap to collapse"
      : "Tap to expand";
}

async function handlePhotos(files) {
  try {
    const photos = await Promise.all([...files].map(fileToPhoto));
    state.draft.photos.push(...photos);
    if (!saveDraft()) {
      state.draft.photos.splice(-photos.length, photos.length);
      showStatus("Those photos could not be saved. Try fewer or smaller photos.", true);
      return;
    }
    renderPhotos();
    showStatus(`${photos.length} photo${photos.length === 1 ? "" : "s"} added.`);
  } catch (error) {
    console.error("Could not read selected photos", error);
    showStatus("The selected photos could not be read.", true);
  }
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
  return collectDraftIssues(state.draft);
}

function createEntryId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveCurrentEntry() {
  showStatus("");
  saveDraft();
  const issues = collectIssues();
  if (!state.draft.building || !state.draft.roomNumber) {
    showStatus("Choose a building and enter a room number before saving.", true);
    roomNumber.focus();
    return;
  }
  if (!issues.length) {
    showStatus("Select at least one issue before saving this room.", true);
    return;
  }

  const savedRoomNumber = state.draft.roomNumber;
  const entry = {
    id: createEntryId(),
    createdAt: new Date().toISOString(),
    building: state.draft.building,
    roomNumber: savedRoomNumber,
    issues,
    photos: [...state.draft.photos],
  };
  state.entries.push(entry);

  // The photos already exist in the draft. Remove that temporary copy before
  // writing the entry so large photo sets are not stored twice at once.
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error("Could not remove the temporary room draft", error);
  }
  if (!saveEntries()) {
    state.entries.pop();
    writeStoredJson(DRAFT_KEY, state.draft);
    showStatus("This room could not be saved. Browser storage may be full; remove some photos and try again.", true);
    return;
  }

  resetCurrentDraft(true);
  showStatus(`Room ${savedRoomNumber} saved. Ready for the next room.`);
  roomNumber.focus();
}

function resetCurrentDraft(keepBuilding = false) {
  const building = keepBuilding ? state.draft.building : buildings[0];
  state.draft = { ...defaultDraft(), building };
  writeStoredJson(DRAFT_KEY, state.draft);
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

function requestConfirmation({ title, message, confirmLabel }) {
  if (typeof confirmDialog.showModal !== "function") {
    return Promise.resolve(window.confirm(message));
  }

  confirmDialogTitle.textContent = title;
  confirmDialogMessage.textContent = message;
  confirmDialogButton.textContent = confirmLabel;
  confirmDialog.returnValue = "cancel";
  confirmDialog.showModal();
  cancelDialogButton.focus();

  return new Promise((resolve) => {
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "confirm"), { once: true });
  });
}

async function confirmResetCurrentRoom() {
  const confirmed = await requestConfirmation({
    title: "Reset current room?",
    message: "This will permanently remove the room number, selected issues, descriptions, and photos in the current draft.",
    confirmLabel: "Reset current room",
  });
  if (!confirmed) return;
  resetCurrentDraft(false);
  showStatus("Current room draft reset.");
}

async function confirmClearSavedEntries() {
  const confirmed = await requestConfirmation({
    title: "Clear all saved entries?",
    message: "This will permanently remove every saved room entry from this device. Download the CSV first if you need a copy.",
    confirmLabel: "Clear saved entries",
  });
  if (!confirmed) return;

  const previousEntries = state.entries;
  state.entries = [];
  if (!saveEntries()) {
    state.entries = previousEntries;
    showStatus("Saved entries could not be cleared.", true);
    return;
  }
  showStatus("All saved entries cleared.");
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
resetCurrentButton.addEventListener("click", confirmResetCurrentRoom);
downloadCsvButton.addEventListener("click", downloadCsv);
clearEntriesButton.addEventListener("click", confirmClearSavedEntries);

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
