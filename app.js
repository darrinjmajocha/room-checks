const STORAGE_KEY = "rit-room-checks-v1";
const DRAFT_KEY = "rit-room-checks-draft-v1";
const PHOTO_DIMENSION_STEPS = [1000, 850, 700];
const PHOTO_QUALITY_STEPS = [0.72, 0.64, 0.56, 0.48];
const PHOTO_TARGET_BYTES = 180 * 1024;
const PHOTO_DB_NAME = "rit-room-checks-photos-v1";
const PHOTO_STORE_NAME = "photos";


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
  Fridges: ["Needs Cleaning", "Moldy", "Malfunctioning", "Other"],
  Furniture: ["Chair", "Desk", "Drawer", "Dresser", "Mattress", "Mattress Frame", "Other"],
  HVAC: ["Displaced A/C Panel", "Needs Servicing", "Other"],
  Walls: ["Chipped Paint", "Cracks", "Holes", "Other"],
  Windows: ["Window Limiter", "Window Push Bar", "Window Screen", "Other"],
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
const roomType = document.querySelector("#roomType");
const issueCatalogEl = document.querySelector("#issueCatalog");
const saveEntryButton = document.querySelector("#saveEntryButton");
const resetCurrentButton = document.querySelector("#resetCurrentButton");
const copyTextButton = document.querySelector("#copyTextButton");
const downloadTextButton = document.querySelector("#downloadTextButton");
const downloadCsvButton = document.querySelector("#downloadCsvButton");
const exportText = document.querySelector("#exportText");
const downloadAllPhotosButton = document.querySelector("#downloadAllPhotosButton");
const savedPhotos = document.querySelector("#savedPhotos");
const photoCount = document.querySelector("#photoCount");
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
const photoIssueDialog = document.querySelector("#photoIssueDialog");
const photoIssueOptions = document.querySelector("#photoIssueOptions");
const savePhotoIssuesButton = document.querySelector("#savePhotoIssuesButton");
const infoDialog = document.querySelector("#infoDialog");
let activePhotoIndex = null;
let copyButtonTimer = null;
let photoDbPromise = null;
let savedPhotoRenderToken = 0;
let draftPhotoRenderToken = 0;

function defaultDraft() {
  return { building: buildings[0], roomNumber: "", roomType: "Dorm", issues: {}, customIssues: [], photos: [] };
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
  state.draft.roomType = roomType.value || "Dorm";
  return writeStoredJson(DRAFT_KEY, state.draft);
}

function showStatus(message, isError = false) {
  actionStatus.textContent = message;
  actionStatus.classList.toggle("error", isError);
}

function renderBuildings() {
  const savedBuilding = state.draft.building || buildings[0];
  if ([...buildingSelect.options].some((option) => option.value === savedBuilding)) {
    buildingSelect.value = savedBuilding;
  }
  roomNumber.value = state.draft.roomNumber || "";
  roomType.value = state.draft.roomType || "Dorm";
}

function renderIssueCatalog() {
  const cards = [...issueCatalogEl.querySelectorAll(".issue-card[data-issue]")];
  cards.sort((cardA, cardB) => cardB.dataset.issue.localeCompare(cardA.dataset.issue));
  cards.forEach((card) => issueCatalogEl.append(card));

  cards.forEach((issueNode) => {
    const issue = issueNode.dataset.issue;
    const summary = issueNode.querySelector(".issue-summary");
    issueNode.open = false;

    issueNode.querySelectorAll(".subcategory-row[data-subcategory]").forEach((row) => {
      const subcategory = row.dataset.subcategory;
      const checkbox = row.querySelector('input[type="checkbox"]');
      const textarea = row.querySelector("textarea");
      checkbox.checked = Object.prototype.hasOwnProperty.call(state.draft.issues?.[issue] || {}, subcategory);
      textarea.value = state.draft.issues?.[issue]?.[subcategory] || "";
      textarea.hidden = !checkbox.checked;

      if (row.dataset.bound === "true") return;
      row.dataset.bound = "true";
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
    });

    if (issueNode.dataset.bound !== "true") {
      issueNode.dataset.bound = "true";
      issueNode.addEventListener("toggle", () => updateIssueSummary(issueNode, issue));
    }
    summary.textContent = "Tap to expand";
    updateIssueSummary(issueNode, issue);
  });
}

function updateIssueSummary(issueNode, issue) {
  const selectedCount = Object.keys(state.draft.issues?.[issue] || {}).length;
  issueNode.querySelector(".issue-summary").textContent = selectedCount
    ? `${selectedCount} selected`
    : issueNode.open
      ? "Tap to collapse"
      : "Tap to expand";
}

async function handlePhotos(files) {
  if (!files.length) return;
  try {
    showStatus(`Compressing ${files.length} photo${files.length === 1 ? "" : "s"} for browser storage…`);
    const compressedPhotos = await Promise.all([...files].map(fileToPhoto));
    const photos = await Promise.all(compressedPhotos.map(saveStoredPhoto));
    state.draft.photos.push(...photos);
    if (!saveDraft()) {
      state.draft.photos.splice(-photos.length, photos.length);
      photos.forEach((photo) => deleteStoredPhoto(photo).catch((error) => console.warn("Could not delete unsaved photo", error)));
      showStatus("Those photos could not be saved. Try fewer or smaller photos.", true);
      return;
    }
    renderPhotos();
    const totalSavedBytes = photos.reduce((total, photo) => total + (photo.storedBytes || dataUrlSizeInBytes(photo.dataUrl)), 0);
    showStatus(`${photos.length} photo${photos.length === 1 ? "" : "s"} compressed to ${formatBytes(totalSavedBytes)} and added. Labels will be applied when the room is saved.`);
  } catch (error) {
    console.error("Could not read selected photos", error);
    showStatus("The selected photos could not be read.", true);
  }
}

async function fileToPhoto(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const compressedDataUrl = await compressImageForStorage(image);
  return {
    originalName: file.name,
    originalBytes: file.size || dataUrlSizeInBytes(dataUrl),
    storedBytes: dataUrlSizeInBytes(compressedDataUrl),
    dataUrl: compressedDataUrl,
    associatedIssues: [],
  };
}

async function compressImageForStorage(image) {
  let bestDataUrl = "";
  for (const maxDimension of PHOTO_DIMENSION_STEPS) {
    const canvas = drawResizedImage(image, maxDimension);
    const compressedDataUrl = await compressCanvasForStorage(canvas);
    bestDataUrl = compressedDataUrl;
    if (dataUrlSizeInBytes(compressedDataUrl) <= PHOTO_TARGET_BYTES) return compressedDataUrl;
  }
  return bestDataUrl;
}

async function compressCanvasForStorage(canvas) {
  let bestDataUrl = "";
  for (const quality of PHOTO_QUALITY_STEPS) {
    const dataUrl = await canvasToJpegDataUrl(canvas, quality);
    bestDataUrl = dataUrl;
    if (dataUrlSizeInBytes(dataUrl) <= PHOTO_TARGET_BYTES) return dataUrl;
  }
  return bestDataUrl;
}

function canvasToJpegDataUrl(canvas, quality) {
  if (!canvas.toBlob) return Promise.resolve(canvas.toDataURL("image/jpeg", quality));
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(canvas.toDataURL("image/jpeg", quality));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(canvas.toDataURL("image/jpeg", quality));
      reader.readAsDataURL(blob);
    }, "image/jpeg", quality);
  });
}

function dataUrlSizeInBytes(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.ceil((base64.length * 3) / 4) - padding);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function drawResizedImage(image, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function safeFilenamePart(value) {
  return String(value).trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "unknown";
}

async function labelPhoto(photo, building, room, index) {
  const image = await loadImage(photo.dataUrl);
  const canvas = drawResizedImage(image, PHOTO_DIMENSION_STEPS[0]);
  const width = canvas.width;
  const height = canvas.height;
  const context = canvas.getContext("2d");

  const roomLabel = `${building} — ${room}`;
  const issueLabels = (photo.associatedIssues || []).map(({ issue, subcategory }) => `${issue} -- ${subcategory}`);
  const padding = Math.max(18, Math.round(width * 0.025));
  const maximumTextWidth = Math.max(1, width - padding * 2);

  function fittedFont(text, startingSize, minimumSize, weight) {
    let size = startingSize;
    context.font = `${weight} ${size}px system-ui, sans-serif`;
    while (context.measureText(text).width > maximumTextWidth && size > minimumSize) {
      size -= 2;
      context.font = `${weight} ${size}px system-ui, sans-serif`;
    }
    return size;
  }

  const roomFontSize = fittedFont(roomLabel, Math.max(36, Math.round(width * 0.055)), 22, 800);
  const roomLineHeight = Math.round(roomFontSize * 1.25);
  const issueFontSizes = issueLabels.map((label) => fittedFont(label, Math.max(24, Math.round(width * 0.035)), 18, 700));
  const issueLineHeights = issueFontSizes.map((size) => Math.round(size * 1.25));
  const textWidths = [
    (() => { context.font = `800 ${roomFontSize}px system-ui, sans-serif`; return context.measureText(roomLabel).width; })(),
    ...issueLabels.map((label, lineIndex) => {
      context.font = `700 ${issueFontSizes[lineIndex]}px system-ui, sans-serif`;
      return context.measureText(label).width;
    }),
  ];
  const boxWidth = Math.min(width, Math.ceil(Math.max(...textWidths) + padding * 2));
  const boxHeight = Math.ceil(padding * 1.4 + roomLineHeight + issueLineHeights.reduce((total, lineHeight) => total + lineHeight, 0));
  context.fillStyle = "rgba(0, 0, 0, 0.76)";
  context.fillRect(0, 0, boxWidth, boxHeight);
  context.fillStyle = "#ffffff";
  context.textBaseline = "top";
  let textY = Math.round(padding * 0.7);
  context.font = `800 ${roomFontSize}px system-ui, sans-serif`;
  context.fillText(roomLabel, padding, textY);
  textY += roomLineHeight;
  issueLabels.forEach((label, lineIndex) => {
    context.font = `700 ${issueFontSizes[lineIndex]}px system-ui, sans-serif`;
    context.fillText(label, padding, textY);
    textY += issueLineHeights[lineIndex];
  });

  const labeledDataUrl = await compressCanvasForStorage(canvas);
  return {
    name: `${safeFilenamePart(building)}_${safeFilenamePart(room)}_${index + 1}.jpg`,
    dataUrl: labeledDataUrl,
    storedBytes: dataUrlSizeInBytes(labeledDataUrl),
  };
}

async function labelRoomPhotos(photos, building, room) {
  return Promise.all(photos.map((photo, index) => labelPhoto(photo, building, room, index)));
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

function issueAssociationKey(issue) {
  return `${issue.issue}\u001f${issue.subcategory}`;
}

function showInfoDialog() {
  if (typeof infoDialog.showModal === "function") infoDialog.showModal();
  else window.alert("Select categories to add them to images");
}

function openPhotoIssueDialog(photoIndex) {
  const issues = collectIssues();
  if (!issues.length) {
    showInfoDialog();
    return;
  }

  activePhotoIndex = photoIndex;
  const photo = state.draft.photos[photoIndex];
  const selectedKeys = new Set((photo.associatedIssues || []).map(issueAssociationKey));
  photoIssueOptions.innerHTML = "";
  issues.forEach(({ issue, subcategory }) => {
    const label = document.createElement("label");
    label.className = "photo-issue-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = issueAssociationKey({ issue, subcategory });
    checkbox.dataset.issue = issue;
    checkbox.dataset.subcategory = subcategory;
    checkbox.checked = selectedKeys.has(checkbox.value);
    const text = document.createElement("span");
    text.textContent = `${issue} -- ${subcategory}`;
    label.append(checkbox, text);
    photoIssueOptions.append(label);
  });
  photoIssueDialog.showModal();
}

function savePhotoIssueAssociations() {
  if (activePhotoIndex === null) return;
  state.draft.photos[activePhotoIndex].associatedIssues = [...photoIssueOptions.querySelectorAll('input[type="checkbox"]:checked')]
    .map((checkbox) => ({ issue: checkbox.dataset.issue, subcategory: checkbox.dataset.subcategory }));
  saveDraft();
  renderPhotos();
  activePhotoIndex = null;
}

function createEntryId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openPhotoDb() {
  if (!("indexedDB" in globalThis)) return Promise.resolve(null);
  if (photoDbPromise) return photoDbPromise;
  photoDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_STORE_NAME)) database.createObjectStore(PHOTO_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error) => {
    console.warn("Could not open photo database; falling back to localStorage photo records", error);
    return null;
  });
  return photoDbPromise;
}

async function saveStoredPhoto(photo) {
  const id = photo.id || createEntryId();
  const record = { ...photo, id };
  const database = await openPhotoDb();
  if (!database) return record;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, "readwrite");
    transaction.objectStore(PHOTO_STORE_NAME).put(record);
    transaction.oncomplete = () => resolve({ id, name: record.name, originalName: record.originalName, storedBytes: record.storedBytes, originalBytes: record.originalBytes, associatedIssues: record.associatedIssues || [] });
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getStoredPhoto(photo) {
  if (photo?.dataUrl || !photo?.id) return photo;
  const database = await openPhotoDb();
  if (!database) return photo;
  return new Promise((resolve, reject) => {
    const request = database.transaction(PHOTO_STORE_NAME, "readonly").objectStore(PHOTO_STORE_NAME).get(photo.id);
    request.onsuccess = () => resolve(request.result ? { ...photo, ...request.result } : photo);
    request.onerror = () => reject(request.error);
  });
}

async function clearStoredPhotos() {
  const database = await openPhotoDb();
  if (!database) return;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, "readwrite");
    transaction.objectStore(PHOTO_STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteStoredPhoto(photo) {
  if (!photo?.id) return;
  const database = await openPhotoDb();
  if (!database) return;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, "readwrite");
    transaction.objectStore(PHOTO_STORE_NAME).delete(photo.id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function migrateDraftPhotos() {
  if (!state.draft.photos?.length) return;
  let changed = false;
  state.draft.photos = await Promise.all(state.draft.photos.map(async (photo) => {
    if (!photo.dataUrl) return photo;
    const storedPhoto = await saveStoredPhoto(photo);
    if (!storedPhoto.dataUrl) changed = true;
    return storedPhoto;
  }));
  if (changed) writeStoredJson(DRAFT_KEY, state.draft);
}

async function migrateStoredEntryPhotos() {
  let changed = false;
  for (const entry of state.entries) {
    if (!entry.photos?.length) continue;
    entry.photos = await Promise.all(entry.photos.map(async (photo) => {
      if (!photo.dataUrl) return photo;
      const storedPhoto = await saveStoredPhoto(photo);
      if (!storedPhoto.dataUrl) changed = true;
      return storedPhoto;
    }));
  }
  if (changed) writeStoredJson(STORAGE_KEY, state.entries);
}

async function resolvePhotoDataUrl(photo) {
  const storedPhoto = await getStoredPhoto(photo);
  return storedPhoto?.dataUrl || "";
}

async function renderPhotos() {
  const renderToken = ++draftPhotoRenderToken;
  photoPreview.innerHTML = "";
  for (const photo of state.draft.photos) {
    const storedPhoto = await getStoredPhoto(photo);
    if (renderToken !== draftPhotoRenderToken) return;
    const index = state.draft.photos.indexOf(photo);
    const card = document.createElement("div");
    card.className = "photo-card";
    const image = document.createElement("img");
    image.src = storedPhoto.dataUrl || "";
    image.alt = storedPhoto.originalName || storedPhoto.name || "Selected photo";
    const associationSummary = document.createElement("p");
    associationSummary.className = "photo-issue-summary";
    const associationCount = (photo.associatedIssues || []).length;
    associationSummary.textContent = associationCount
      ? `${associationCount} issue${associationCount === 1 ? "" : "s"} logged`
      : "No issues logged";
    const sizeSummary = document.createElement("p");
    sizeSummary.className = "photo-issue-summary";
    const originalBytes = storedPhoto.originalBytes || storedPhoto.storedBytes || dataUrlSizeInBytes(storedPhoto.dataUrl || "");
    const storedBytes = storedPhoto.storedBytes || dataUrlSizeInBytes(storedPhoto.dataUrl || "");
    sizeSummary.textContent = `Compressed from ${formatBytes(originalBytes)} to ${formatBytes(storedBytes)}`;
    const logButton = document.createElement("button");
    logButton.className = "ghost-button";
    logButton.type = "button";
    logButton.textContent = "Log Issue";
    logButton.addEventListener("click", () => openPhotoIssueDialog(index));
    const removeButton = document.createElement("button");
    removeButton.className = "ghost-button";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const [removedPhoto] = state.draft.photos.splice(index, 1);
      deleteStoredPhoto(removedPhoto).catch((error) => console.warn("Could not delete removed draft photo", error));
      saveDraft();
      renderPhotos();
    });
    card.append(image, associationSummary, sizeSummary, logButton, removeButton);
    photoPreview.append(card);
  }
}

function collectIssues() {
  return collectDraftIssues(state.draft);
}

async function saveCurrentEntry() {
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
  if (!state.draft.photos.length) {
    const confirmed = await requestConfirmation({
      title: "Submit without photos?",
      message: "Including photos is strongly recommended. Are you sure you want to submit without photos?",
      confirmLabel: "Submit",
    });
    if (!confirmed) return;
  }

  const savedRoomNumber = state.draft.roomNumber;
  const savedRoomType = state.draft.roomType || "Dorm";
  saveEntryButton.disabled = true;
  showStatus(state.draft.photos.length ? "Labeling and saving photos…" : "Saving room…");
  let labeledPhotos;
  try {
    const currentIssueKeys = new Set(issues.map(issueAssociationKey));
    const draftPhotos = await Promise.all(state.draft.photos.map(getStoredPhoto));
    const photosForSubmission = draftPhotos.map((photo, index) => ({
      ...photo,
      associatedIssues: (state.draft.photos[index].associatedIssues || []).filter((issue) => currentIssueKeys.has(issueAssociationKey(issue))),
    }));
    if (photosForSubmission.some((photo) => !photo.dataUrl)) throw new Error("A draft photo could not be found in browser storage.");
    const labeledPhotoRecords = await labelRoomPhotos(photosForSubmission, state.draft.building, savedRoomNumber);
    labeledPhotos = await Promise.all(labeledPhotoRecords.map(saveStoredPhoto));
  } catch (error) {
    console.error("Could not label room photos", error);
    showStatus("The photos could not be labeled. Remove the affected photo and try again.", true);
    saveEntryButton.disabled = false;
    return;
  }

  const entry = {
    id: createEntryId(),
    createdAt: new Date().toISOString(),
    building: state.draft.building,
    roomNumber: savedRoomNumber,
    roomType: savedRoomType,
    issues,
    photos: labeledPhotos,
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
    saveEntryButton.disabled = false;
    return;
  }

  resetCurrentDraft(true);
  saveEntryButton.disabled = false;
  showStatus(`Room ${savedRoomNumber} saved. Text and labeled photos are ready below.`);
  roomNumber.focus();
}

function resetCurrentDraft(keepBuilding = false) {
  const building = keepBuilding ? state.draft.building : buildings[0];
  (state.draft.photos || []).forEach((photo) => deleteStoredPhoto(photo).catch((error) => console.warn("Could not delete draft photo", error)));
  state.draft = { ...defaultDraft(), building };
  writeStoredJson(DRAFT_KEY, state.draft);
  renderBuildings();
  renderIssueCatalog();
  renderCustomIssues();
  renderPhotos();
}

function renderSavedEntries() {
  const count = state.entries.length;
  const photos = state.entries.flatMap((entry) => entry.photos || []);
  entryCount.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;
  photoCount.textContent = `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;
  exportText.value = count ? buildExportText() : "";
  savedEntries.innerHTML = "";
  savedPhotos.innerHTML = "";

  if (!count) {
    savedEntries.innerHTML = '<p class="hint">No entries saved yet.</p>';
  } else {
    state.entries.slice().reverse().forEach((entry) => {
      const entryEl = document.createElement("article");
      entryEl.className = "saved-entry";
      entryEl.innerHTML = `
        <h3>${escapeHtml(entry.building)} — ${escapeHtml(entry.roomNumber)}</h3>
        <p>${escapeHtml(entry.roomType || "Dorm")} • ${entry.issues.length} issue rows • ${(entry.photos || []).length} photo(s)</p>
        <p>${entry.issues.map(({ issue, subcategory }) => `${escapeHtml(issue)}: ${escapeHtml(subcategory)}`).join("; ")}</p>
      `;
      savedEntries.append(entryEl);
    });
  }

  renderSavedPhotoCards(photos);
}

async function renderSavedPhotoCards(photos) {
  const renderToken = ++savedPhotoRenderToken;
  savedPhotos.innerHTML = "";
  if (!photos.length) {
    savedPhotos.innerHTML = '<p class="hint">No labeled photos saved yet.</p>';
    return;
  }

  for (const photo of photos) {
    const storedPhoto = await getStoredPhoto(photo);
    if (renderToken !== savedPhotoRenderToken) return;
    const card = document.createElement("article");
    card.className = "saved-photo-card";
    const image = document.createElement("img");
    image.src = storedPhoto.dataUrl || "";
    image.alt = storedPhoto.name;
    const name = document.createElement("p");
    name.textContent = storedPhoto.name;
    const button = document.createElement("button");
    button.className = "ghost-button";
    button.type = "button";
    button.textContent = "Download";
    button.disabled = !storedPhoto.dataUrl;
    button.addEventListener("click", () => downloadPhoto(storedPhoto));
    card.append(image, name, button);
    savedPhotos.append(card);
  }
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
    message: "This will permanently remove every saved room entry from this device. Copy or download the text and photos first if you need a copy.",
    confirmLabel: "Clear saved entries",
  });
  if (!confirmed) return;

  const previousEntries = state.entries;
  const savedPhotosToDelete = previousEntries.flatMap((entry) => entry.photos || []);
  state.entries = [];
  await Promise.all(savedPhotosToDelete.map((photo) => deleteStoredPhoto(photo))).catch((error) => console.warn("Could not clear stored photos", error));
  if (!saveEntries()) {
    state.entries = previousEntries;
    showStatus("Saved entries could not be cleared.", true);
    return;
  }
  showStatus("All saved entries cleared.");
}

function cleanTextCell(value) {
  return String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
}

function formatIssuePairs(entry) {
  return (entry.issues || [])
    .map(({ issue, subcategory }) => `${cleanTextCell(issue)}, ${cleanTextCell(subcategory)}`)
    .join("; ");
}

function formatIssueNotes(entry) {
  return (entry.issues || []).map(({ description }) => cleanTextCell(description)).join("; ");
}

function buildExportText() {
  const rows = state.entries.map((entry) => [
    entry.building,
    entry.roomNumber,
    entry.roomType || "Dorm",
    formatIssuePairs(entry),
    formatIssueNotes(entry),
  ]);
  return rows.map((row) => row.map(cleanTextCell).join("\t")).join("\n");
}

function showCopyButtonSuccess() {
  clearTimeout(copyButtonTimer);
  copyTextButton.textContent = "Copied!";
  copyTextButton.classList.add("copy-success");
  copyButtonTimer = setTimeout(() => {
    copyTextButton.textContent = "Copy text";
    copyTextButton.classList.remove("copy-success");
    copyButtonTimer = null;
  }, 3000);
}

async function copyExportText() {
  if (!state.entries.length) {
    showStatus("Save at least one room before copying the text.", true);
    return;
  }
  const text = buildExportText();
  exportText.value = text;
  showCopyButtonSuccess();
  let copied = false;
  if (navigator.clipboard?.writeText && globalThis.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (error) {
      console.warn("Clipboard API copy failed; trying text selection fallback", error);
    }
  }
  if (!copied) {
    exportText.focus();
    exportText.select();
    exportText.setSelectionRange(0, exportText.value.length);
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      console.warn("Text selection copy failed", error);
    }
  }
  showStatus(copied ? "Text copied." : "Text selected. If it did not copy automatically, tap and hold the selected text to copy.", !copied);
}

function downloadTextFile() {
  if (!state.entries.length) {
    showStatus("Save at least one room before downloading the text file.", true);
    return;
  }
  downloadBlob(new Blob([buildExportText()], { type: "text/plain;charset=utf-8" }), `room-checks-${new Date().toISOString().slice(0, 10)}.txt`);
}

function csvCell(value) {
  return `"${cleanTextCell(value).replaceAll('"', '""')}"`;
}

function buildCsvText() {
  const rows = [["Building Name", "Room Number", "Room Type", "Categories and Subcategories", "Additional Notes"]];
  state.entries.forEach((entry) => {
    rows.push([entry.building, entry.roomNumber, entry.roomType || "Dorm", formatIssuePairs(entry), formatIssueNotes(entry)]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function downloadCsvFile() {
  if (!state.entries.length) {
    showStatus("Save at least one room before downloading the CSV file.", true);
    return;
  }
  const csv = `\uFEFF${buildCsvText()}`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `room-checks-${new Date().toISOString().slice(0, 10)}.csv`);
}

function dataUrlToBlob(dataUrl) {
  const [metadata, data] = dataUrl.split(",");
  const mimeType = metadata.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadPhoto(photo) {
  const dataUrl = await resolvePhotoDataUrl(photo);
  if (!dataUrl) {
    showStatus("That saved photo could not be found on this device.", true);
    return;
  }
  downloadBlob(dataUrlToBlob(dataUrl), photo.name);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

function joinBytes(parts) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function dataUrlToBytes(dataUrl) {
  const binary = atob(dataUrl.split(",")[1]);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(({ name, bytes }) => {
    const nameBytes = encoder.encode(name);
    const checksum = crc32(bytes);
    const localHeader = joinBytes([
      uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint32(checksum),
      uint32(bytes.length), uint32(bytes.length), uint16(nameBytes.length), uint16(0), nameBytes,
    ]);
    localParts.push(localHeader, bytes);
    const centralHeader = joinBytes([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint32(checksum),
      uint32(bytes.length), uint32(bytes.length), uint16(nameBytes.length), uint16(0), uint16(0), uint16(0),
      uint16(0), uint32(0), uint32(offset), nameBytes,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + bytes.length;
  });

  const centralDirectory = joinBytes(centralParts);
  const endRecord = joinBytes([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length),
    uint32(centralDirectory.length), uint32(offset), uint16(0),
  ]);
  return new Blob([...localParts, centralDirectory, endRecord], { type: "application/zip" });
}

async function downloadAllPhotos() {
  const photos = state.entries.flatMap((entry) => entry.photos || []);
  if (!photos.length) {
    showStatus("There are no saved photos to download.", true);
    return;
  }
  showStatus(`Preparing ${photos.length} photo${photos.length === 1 ? "" : "s"} for ZIP download…`);
  const resolvedPhotos = await Promise.all(photos.map(async (photo) => ({ ...photo, dataUrl: await resolvePhotoDataUrl(photo) })));
  const files = resolvedPhotos.filter((photo) => photo.dataUrl).map((photo) => ({ name: photo.name, bytes: dataUrlToBytes(photo.dataUrl) }));
  if (!files.length) {
    showStatus("Saved photos could not be found on this device.", true);
    return;
  }
  downloadBlob(createZip(files), `room-check-photos-${new Date().toISOString().slice(0, 10)}.zip`);
  showStatus(`${files.length} photo${files.length === 1 ? "" : "s"} saved in one ZIP file.`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

buildingSelect.addEventListener("change", saveDraft);
roomNumber.addEventListener("input", saveDraft);
roomType.addEventListener("change", saveDraft);
photoInput.addEventListener("change", (event) => {
  handlePhotos(event.target.files);
  event.target.value = "";
});
roomForm.addEventListener("submit", (event) => event.preventDefault());
addCustomIssueButton.addEventListener("click", addCustomIssue);
saveEntryButton.addEventListener("click", saveCurrentEntry);
resetCurrentButton.addEventListener("click", confirmResetCurrentRoom);
copyTextButton.addEventListener("click", copyExportText);
downloadTextButton.addEventListener("click", downloadTextFile);
downloadCsvButton.addEventListener("click", downloadCsvFile);
downloadAllPhotosButton.addEventListener("click", downloadAllPhotos);
savePhotoIssuesButton.addEventListener("click", savePhotoIssueAssociations);
photoIssueDialog.addEventListener("close", () => { activePhotoIndex = null; });
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

async function removeLegacyOfflineCache() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in globalThis) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name.startsWith("room-checks-")).map((name) => caches.delete(name)));
  }
}

removeLegacyOfflineCache().catch((error) => console.warn("Could not remove the legacy offline cache", error));

renderBuildings();
renderIssueCatalog();
renderCustomIssues();
renderPhotos();
Promise.all([migrateDraftPhotos(), migrateStoredEntryPhotos()])
  .catch((error) => console.warn("Could not migrate photos out of localStorage", error))
  .finally(() => {
    renderPhotos();
    renderSavedEntries();
  });
