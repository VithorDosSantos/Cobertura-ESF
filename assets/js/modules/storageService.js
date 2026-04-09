import { STORAGE_KEY, STORAGE_LIMIT } from "./constants.js";
import { slugify } from "./utils.js";

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!parsed.units) {
      parsed.units = {};
    }
    return parsed;
  } catch {
    return { units: {} };
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveSessionUser(profile) {
  sessionStorage.setItem("esfSession", JSON.stringify(profile));
}

export function getSessionUser() {
  const data = sessionStorage.getItem("esfSession");
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getUnitVersions(unitName) {
  const key = slugify(unitName);
  const store = readStore();
  return store.units[key] || [];
}

export function saveUnitVersion(unitName, payload) {
  const key = slugify(unitName);
  const store = readStore();
  const versions = store.units[key] || [];

  const withMeta = {
    ...payload,
    savedAt: new Date().toISOString()
  };

  const nextVersions = [withMeta, ...versions].slice(0, STORAGE_LIMIT);
  store.units[key] = nextVersions;
  writeStore(store);

  return withMeta;
}

export function getLatestUnitVersion(unitName) {
  const versions = getUnitVersions(unitName);
  return versions[0] || null;
}

export function clearUnitHistory(unitName) {
  const key = slugify(unitName);
  const store = readStore();
  delete store.units[key];
  writeStore(store);
}

export function getStorageBackupJson() {
  return JSON.stringify(readStore(), null, 2);
}
