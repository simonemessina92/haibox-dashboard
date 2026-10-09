const BASE_DEFAULTS = [];

const CONFIG_KEY = "haibox_dashboard_config_v3";
const LEGACY_LINKS_KEY = "haibox_links_ubuntu_v1";
const TILE_COUNT_OPTIONS = [4, 9, 12, 16, 24, 32];
const DEFAULT_TILE_COUNT = 12;
const MAX_TILE_COUNT = 32;
const CONFIG_VERSION = 4;
const LONG_PRESS_MS = 600;
const DEFAULT_LOGO_SRC = "./haivision-haibox-logo.png";
const MAX_LOGO_WIDTH = 1200;
const MAX_LOGO_HEIGHT = 420;
const MAX_LOGO_BYTES = 3500000;

const brandLogo = document.getElementById("brandLogo");
const grid = document.getElementById("grid");
const tileEditor = document.getElementById("tileEditor");
const tileName = document.getElementById("tileName");
const tileUrl = document.getElementById("tileUrl");
const btnTileSave = document.getElementById("btnTileSave");
const btnTileCancel = document.getElementById("btnTileCancel");
const btnTileClear = document.getElementById("btnTileClear");
const settingsButton = document.getElementById("settingsButton");
const settingsModal = document.getElementById("settingsModal");
const tileCountSelect = document.getElementById("tileCountSelect");
const settingsLogoPreview = document.getElementById("settingsLogoPreview");
const logoFileInput = document.getElementById("logoFileInput");
const configFileInput = document.getElementById("configFileInput");
const btnLogoUpload = document.getElementById("btnLogoUpload");
const btnLogoReset = document.getElementById("btnLogoReset");
const btnExportConfig = document.getElementById("btnExportConfig");
const btnImportConfig = document.getElementById("btnImportConfig");
const btnClearAllTabs = document.getElementById("btnClearAllTabs");
const btnSettingsSave = document.getElementById("btnSettingsSave");
const btnSettingsClose = document.getElementById("btnSettingsClose");

let state = createDefaultConfig();
let settingsDraft = null;
let activeTile = -1;
let saving = false;

function syncViewportHeight() {
  document.documentElement.style.setProperty("--app-vh", `${window.innerHeight}px`);
}

function normalizeUrl(raw) {
  let s = (raw || "").toString().trim();
  if (!s) return "";

  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\\/g, "/");

  const webScheme = s.match(/^(https?|file):/i);
  if (webScheme) {
    let protocol = webScheme[1].toLowerCase();
    let rest = s.slice(webScheme[0].length).trim().replace(/^\/+/, "");

    while (/^(https?|file):/i.test(rest)) {
      const nested = rest.match(/^(https?|file):/i);
      protocol = nested[1].toLowerCase();
      rest = rest.slice(nested[0].length).trim().replace(/^\/+/, "");
    }

    if (!rest) return "";
    return `${protocol}://${rest}`;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    return s.replace(/^([a-z][a-z0-9+.-]*):\/\//i, (_, scheme) => `${scheme.toLowerCase()}://`);
  }

  return "https://" + s.replace(/^\/+/, "");
}

function normalizeTileCount(raw) {
  const n = Number(raw);
  return TILE_COUNT_OPTIONS.includes(n) ? n : DEFAULT_TILE_COUNT;
}

function emptyTile() {
  return { name: "", url: "" };
}

function normalizeLinks(raw, targetCount = MAX_TILE_COUNT) {
  const source = Array.isArray(raw) ? raw : [];
  const out = [];

  for (let i = 0; i < targetCount; i++) {
    const fallback = BASE_DEFAULTS[i] || emptyTile();
    const item = source[i] || fallback;
    out.push({
      name: (item && item.name ? item.name : "").toString(),
      url: normalizeUrl(item && item.url ? item.url : "")
    });
  }

  return out;
}

function cloneLinks(items, targetCount = items.length) {
  return normalizeLinks(items, targetCount);
}

function createDefaultConfig() {
  return {
    version: CONFIG_VERSION,
    tileCount: DEFAULT_TILE_COUNT,
    logoDataUrl: "",
    links: normalizeLinks(BASE_DEFAULTS, MAX_TILE_COUNT)
  };
}

function isValidLogoDataUrl(value) {
  return typeof value === "string" && /^data:image\//i.test(value) && value.length <= MAX_LOGO_BYTES;
}

function normalizeConfig(raw) {
  if (Array.isArray(raw)) {
    const defaults = createDefaultConfig();
    return { ...defaults, links: normalizeLinks(raw, MAX_TILE_COUNT) };
  }

  if (!raw || typeof raw !== "object") return createDefaultConfig();

  return {
    version: CONFIG_VERSION,
    tileCount: normalizeTileCount(raw.tileCount),
    logoDataUrl: isValidLogoDataUrl(raw.logoDataUrl) ? raw.logoDataUrl : "",
    links: normalizeLinks(raw.links || raw.tiles || [], MAX_TILE_COUNT)
  };
}

function hasChromeStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;
}

function chromeStorageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      const err = chrome.runtime && chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(result || {});
    });
  });
}

function chromeStorageSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const err = chrome.runtime && chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });
}

function readJsonFromLocalStorage(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (err) {
    console.warn(`HAIBOX localStorage read failed for ${key}`, err);
    return null;
  }
}

function writeLocalBackups(nextState) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(nextState));
    localStorage.setItem(LEGACY_LINKS_KEY, JSON.stringify(nextState.links));
  } catch (err) {
    console.warn("HAIBOX local backup write failed", err);
  }
}

async function loadConfig() {
  if (hasChromeStorage()) {
    try {
      const result = await chromeStorageGet([CONFIG_KEY, LEGACY_LINKS_KEY]);
      if (result[CONFIG_KEY]) {
        const config = normalizeConfig(result[CONFIG_KEY]);
        return config;
      }

      if (result[LEGACY_LINKS_KEY]) {
        const config = normalizeConfig(result[LEGACY_LINKS_KEY]);
        return config;
      }
    } catch (err) {
      console.warn("HAIBOX chrome.storage read failed", err);
    }
  }

  const localConfig = readJsonFromLocalStorage(CONFIG_KEY);
  if (localConfig) return normalizeConfig(localConfig);

  const localLegacy = readJsonFromLocalStorage(LEGACY_LINKS_KEY);
  if (localLegacy) return normalizeConfig(localLegacy);

  return createDefaultConfig();
}

async function saveConfig(nextConfig) {
  const normalized = normalizeConfig(nextConfig);
  let chromeSaved = false;
  let storageError = null;

  if (hasChromeStorage()) {
    try {
      await chromeStorageSet({ [CONFIG_KEY]: normalized, [LEGACY_LINKS_KEY]: normalized.links });
      chromeSaved = true;
    } catch (err) {
      storageError = err;
      console.error("HAIBOX chrome.storage save failed", err);
    }
  }

  writeLocalBackups(normalized);

  if (!chromeSaved && hasChromeStorage()) {
    throw storageError || new Error("chrome.storage save failed");
  }

  return normalized;
}

function getLogoSrc(config = state) {
  return config.logoDataUrl || DEFAULT_LOGO_SRC;
}

function applyLogo(config = state) {
  const src = getLogoSrc(config);
  brandLogo.src = src;
  settingsLogoPreview.src = src;
}

function getGridColumns(tileCount) {
  if (tileCount <= 4) return 2;
  if (tileCount <= 9) return 3;
  if (tileCount <= 16) return 4;
  if (tileCount <= 24) return 6;
  return 8;
}

function updateGridShape(tileCount) {
  const cols = getGridColumns(tileCount);
  const rows = Math.ceil(tileCount / cols);
  grid.style.setProperty("--grid-cols", cols);
  grid.style.setProperty("--grid-rows", rows);
  grid.dataset.count = String(tileCount);
  grid.dataset.density = tileCount >= 24 ? "dense" : tileCount >= 16 ? "medium" : "normal";
}

function openLink(url) {
  if (!url) return;
  window.location.assign(url);
}

function renderGrid() {
  const tileCount = normalizeTileCount(state.tileCount);
  const visibleLinks = state.links.slice(0, tileCount);
  updateGridShape(tileCount);
  grid.innerHTML = "";

  visibleLinks.forEach((item, idx) => {
    const tile = document.createElement("button");
    tile.className = "card";
    tile.type = "button";
    tile.draggable = false;
    tile.setAttribute("aria-label", item.name || `Tile ${idx + 1}`);
    if (!item.url) {
      tile.classList.add("disabled");
      tile.setAttribute("aria-disabled", "true");
    }
    tile.innerHTML = `<div class="v">${escapeHtml(item.name || "") || "&nbsp;"}</div>`;

    let pressTimer = null;
    let pressFired = false;
    let pointerDown = false;
    let moved = false;
    let startX = 0;
    let startY = 0;

    function clearPress() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }

    tile.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      if (ev.pointerType !== "mouse") ev.preventDefault();
      startX = ev.clientX;
      startY = ev.clientY;
      pointerDown = true;
      moved = false;
      pressFired = false;
      clearPress();
      try {
        tile.setPointerCapture(ev.pointerId);
      } catch {
        // Some browsers may reject capture after touch cancellation.
      }
      pressTimer = setTimeout(() => {
        pressTimer = null;
        pressFired = true;
        pointerDown = false;
        openTileEditor(idx);
      }, LONG_PRESS_MS);
    });

    tile.addEventListener("pointermove", (ev) => {
      if (!pressTimer) return;
      if (Math.abs(ev.clientX - startX) > 12 || Math.abs(ev.clientY - startY) > 12) {
        moved = true;
        clearPress();
      }
    });

    tile.addEventListener("pointerup", (ev) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      const shouldOpen = pointerDown && !pressFired && !moved && !!item.url;
      pointerDown = false;
      clearPress();
      if (shouldOpen) openLink(item.url);
    });

    tile.addEventListener("pointerleave", () => { pointerDown = false; clearPress(); });
    tile.addEventListener("pointercancel", () => { pointerDown = false; clearPress(); });
    tile.addEventListener("contextmenu", (ev) => ev.preventDefault());
    tile.addEventListener("dragstart", (ev) => ev.preventDefault());
    tile.addEventListener("click", (ev) => ev.preventDefault());
    tile.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && item.url) {
        ev.preventDefault();
        openLink(item.url);
      }
    });

    grid.appendChild(tile);
  });
}

function escapeHtml(s) {
  return (s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}

function openTileEditor(index) {
  if (saving) return;
  activeTile = index;
  const item = state.links[index] || emptyTile();
  tileName.value = item.name || "";
  tileUrl.value = item.url || "";
  tileEditor.classList.add("show");
  tileEditor.setAttribute("aria-hidden", "false");
  setTimeout(() => tileName.focus(), 0);
}

function closeTileEditor() {
  if (saving) return;
  tileEditor.classList.remove("show");
  tileEditor.setAttribute("aria-hidden", "true");
  activeTile = -1;
}

function setSavingState(isSaving) {
  saving = isSaving;
  btnTileSave.disabled = isSaving;
  btnTileClear.disabled = isSaving;
  btnTileCancel.disabled = isSaving;
  btnSettingsSave.disabled = isSaving;
  btnClearAllTabs.disabled = isSaving;
}

async function updateConfig(edit) {
  const update = async () => saveConfig(edit(await loadConfig()));
  if (navigator.locks) return navigator.locks.request("haibox-config-write", update);
  return update();
}

function validateImport(raw) {
  const links = Array.isArray(raw) ? raw : raw && (raw.links || raw.tiles);
  if (!Array.isArray(links) || links.length > MAX_TILE_COUNT ||
      (!Array.isArray(raw) && raw.type && raw.type !== "haibox-dashboard-config") ||
      (!Array.isArray(raw) && raw.tileCount !== undefined && !TILE_COUNT_OPTIONS.includes(raw.tileCount)) ||
      (!Array.isArray(raw) && raw.logoDataUrl && !isValidLogoDataUrl(raw.logoDataUrl))) {
    throw new Error("Invalid HAIBOX configuration.");
  }
  for (const tile of links) {
    if (!tile || typeof tile.name !== "string" || typeof tile.url !== "string") throw new Error("Invalid tile.");
    validateTileUrl(tile.url);
  }
  return normalizeConfig(raw);
}

function validateTileUrl(raw) {
  const url = normalizeUrl(raw);
  if (!url) return "";
  const parsed = new URL(url);
  if (!["https:", "http:", "file:"].includes(parsed.protocol)) throw new Error("Use an HTTP, HTTPS or file URL.");
  if (parsed.protocol !== "file:" && !parsed.hostname) throw new Error("Invalid URL.");
  return url;
}

async function saveActiveTile() {
  if (activeTile < 0 || saving) return;
  const index = activeTile;
  let tile;
  try { tile = { name: tileName.value.trim(), url: validateTileUrl(tileUrl.value) }; }
  catch (err) { alert(err.message || "Invalid URL."); return; }

  setSavingState(true);
  try {
    state = await updateConfig(latest => { latest.links[index] = tile; return latest; });
    renderGrid();
    closeTileEditorAfterSave();
  } catch (err) {
    console.error("HAIBOX save failed", err);
    alert("Save failed. Please reload the extension and try again.");
  } finally {
    setSavingState(false);
  }
}

async function clearActiveTile() {
  if (activeTile < 0 || saving) return;
  const index = activeTile;

  setSavingState(true);
  try {
    state = await updateConfig(latest => { latest.links[index] = emptyTile(); return latest; });
    renderGrid();
    closeTileEditorAfterSave();
  } catch (err) {
    console.error("HAIBOX clear failed", err);
    alert("Save failed. Please reload the extension and try again.");
  } finally {
    setSavingState(false);
  }
}

function closeTileEditorAfterSave() {
  tileEditor.classList.remove("show");
  tileEditor.setAttribute("aria-hidden", "true");
  activeTile = -1;
}

function openSettings() {
  if (saving) return;
  settingsDraft = { tileCount: state.tileCount, logoDataUrl: state.logoDataUrl };
  tileCountSelect.value = String(settingsDraft.tileCount);
  settingsLogoPreview.src = settingsDraft.logoDataUrl || DEFAULT_LOGO_SRC;
  settingsModal.classList.add("show");
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  if (saving) return;
  settingsModal.classList.remove("show");
  settingsModal.setAttribute("aria-hidden", "true");
  settingsDraft = null;
  logoFileInput.value = "";
  configFileInput.value = "";
}

async function saveSettings() {
  if (!settingsDraft || saving) return;
  setSavingState(true);
  try {
    const draft = { ...settingsDraft };
    state = await updateConfig(latest => ({ ...latest, tileCount: normalizeTileCount(draft.tileCount), logoDataUrl: draft.logoDataUrl || "" }));
    applyLogo();
    renderGrid();
    closeSettingsAfterSave();
  } catch (err) {
    console.error("HAIBOX settings save failed", err);
    alert("Settings save failed. Please try again.");
  } finally {
    setSavingState(false);
  }
}

function closeSettingsAfterSave() {
  settingsModal.classList.remove("show");
  settingsModal.setAttribute("aria-hidden", "true");
  settingsDraft = null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

async function resizeLogoFile(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please select an image file.");

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_LOGO_WIDTH / img.naturalWidth, MAX_LOGO_HEIGHT / img.naturalHeight);
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let output = canvas.toDataURL("image/webp", 0.9);
  if (!isValidLogoDataUrl(output)) output = canvas.toDataURL("image/png");
  if (!isValidLogoDataUrl(output)) throw new Error("Logo is too large after resizing. Please use a smaller image.");
  return output;
}

async function handleLogoUpload(file) {
  try {
    const logoDataUrl = await resizeLogoFile(file);
    if (!settingsDraft) openSettings();
    settingsDraft.logoDataUrl = logoDataUrl;
    settingsLogoPreview.src = logoDataUrl;
  } catch (err) {
    console.error("HAIBOX logo upload failed", err);
    alert(err.message || "Logo upload failed.");
  } finally {
    logoFileInput.value = "";
  }
}

function resetLogoDraft() {
  if (!settingsDraft) return;
  settingsDraft.logoDataUrl = "";
  settingsLogoPreview.src = DEFAULT_LOGO_SRC;
}

function buildExportPayload() {
  return {
    type: "haibox-dashboard-config",
    version: CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    tileCount: state.tileCount,
    logoDataUrl: state.logoDataUrl || "",
    links: cloneLinks(state.links, MAX_TILE_COUNT)
  };
}

function exportConfig() {
  const payload = JSON.stringify(buildExportPayload(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `haibox-dashboard-config-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsText(file);
  });
}

async function importConfigFile(file) {
  if (!file) return;
  setSavingState(true);
  try {
    if (file.size > 5000000) throw new Error("Configuration file is too large.");
    const text = await readFileAsText(file);
    const imported = validateImport(JSON.parse(text));
    if (!confirm("Replace all current tiles, tile count and logo with this configuration?")) return;
    state = await updateConfig(() => imported);
    applyLogo();
    renderGrid();
    if (settingsModal.classList.contains("show")) {
      settingsDraft = { tileCount: state.tileCount, logoDataUrl: state.logoDataUrl };
      tileCountSelect.value = String(state.tileCount);
      settingsLogoPreview.src = getLogoSrc();
    }
    alert("Config imported successfully.");
  } catch (err) {
    console.error("HAIBOX import failed", err);
    alert("Import failed. Please select a valid HAIBOX config JSON file.");
  } finally {
    configFileInput.value = "";
    setSavingState(false);
  }
}

async function clearAllTabs() {
  if (saving) return;
  const confirmed = confirm("Clear all tab names and links? Logo and tile count will stay unchanged.");
  if (!confirmed) return;

  setSavingState(true);
  try {
    state = await updateConfig(latest => ({ ...latest, links: Array.from({ length: MAX_TILE_COUNT }, emptyTile) }));
    renderGrid();
    if (tileEditor.classList.contains("show")) closeTileEditorAfterSave();
    alert("All tabs cleared.");
  } catch (err) {
    console.error("HAIBOX clear all tabs failed", err);
    alert("Clear all failed. Please try again.");
  } finally {
    setSavingState(false);
  }
}
async function init() {
  syncViewportHeight();
  window.addEventListener("resize", syncViewportHeight);
  window.addEventListener("orientationchange", syncViewportHeight);
  state = await loadConfig();
  applyLogo();
  renderGrid();
}

btnTileSave.addEventListener("click", saveActiveTile);
btnTileCancel.addEventListener("click", closeTileEditor);
btnTileClear.addEventListener("click", clearActiveTile);
settingsButton.addEventListener("click", openSettings);
btnSettingsClose.addEventListener("click", closeSettings);
btnSettingsSave.addEventListener("click", saveSettings);
btnLogoUpload.addEventListener("click", () => logoFileInput.click());
btnLogoReset.addEventListener("click", resetLogoDraft);
btnExportConfig.addEventListener("click", exportConfig);
btnImportConfig.addEventListener("click", () => configFileInput.click());
btnClearAllTabs.addEventListener("click", clearAllTabs);

tileCountSelect.addEventListener("change", () => {
  if (!settingsDraft) return;
  settingsDraft.tileCount = normalizeTileCount(tileCountSelect.value);
});

logoFileInput.addEventListener("change", () => handleLogoUpload(logoFileInput.files && logoFileInput.files[0]));
configFileInput.addEventListener("change", () => importConfigFile(configFileInput.files && configFileInput.files[0]));

tileEditor.addEventListener("click", (ev) => { if (ev.target === tileEditor) closeTileEditor(); });
settingsModal.addEventListener("click", (ev) => { if (ev.target === settingsModal) closeSettings(); });

document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape") return;
  if (tileEditor.classList.contains("show")) closeTileEditor();
  else if (settingsModal.classList.contains("show")) closeSettings();
});

if (hasChromeStorage()) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[CONFIG_KEY]) return;
    state = normalizeConfig(changes[CONFIG_KEY].newValue);
    applyLogo();
    renderGrid();
    // Keep unsaved form values intact while updating the dashboard behind them.
  });
}

init();



