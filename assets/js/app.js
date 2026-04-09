import { exportAllAsCsv, exportAsGeoJson } from "./modules/exportService.js";
import { MapService } from "./modules/mapService.js";
import {
  getLatestUnitVersion,
  getStorageBackupJson,
  saveSessionUser,
  saveUnitVersion
} from "./modules/storageService.js";
import { UIService } from "./modules/uiService.js";
import { downloadBlob, formatDateForFile } from "./modules/utils.js";

const state = {
  profile: null,
  boundaryPoints: [],
  equipmentPoints: [],
  isPolygonClosed: false,
  isSaved: false,
  isEquipmentMode: false,
  hasUnsavedChanges: false,
  metrics: {
    areaKm2: 0,
    perimeterKm: 0,
    pinsCount: 0
  }
};

const ui = new UIService();
let mapService = null;

function getMapService() {
  if (!mapService) {
    mapService = new MapService("map", {
      onMapClick: (event) => handleMapClick(event),
      onClosePolygonRequested: () => closePolygon(),
      onBoundaryDrag: (index, lat, lng) => updateBoundaryPoint(index, lat, lng),
      onBoundaryNoteChange: (index, note) => updateBoundaryNote(index, note),
      onBoundaryRemove: (index) => removeBoundaryPoint(index),
      onEquipmentDrag: (index, lat, lng) => updateEquipmentPoint(index, lat, lng),
      onEquipmentNoteChange: (index, note) => updateEquipmentNote(index, note),
      onEquipmentRemove: (index) => removeEquipmentPoint(index),
      onLocationUpdate: (lat, lng) => evaluateInsideStatus(lat, lng),
      onNotice: (message) => ui.notify(message)
    });
  }

  return mapService;
}

let pendingSavedVersion = null;

function refreshInstruction() {
  const pins = state.boundaryPoints.length;

  if (state.isSaved) {
    ui.setInstruction("Área salva. Você já pode exportar os dados.");
    return;
  }

  if (pins === 0) {
    ui.setInstruction("Adicione o primeiro pin para iniciar a delimitação.");
    return;
  }

  if (pins <= 2) {
    ui.setInstruction("Adicione mais pins para permitir o fechamento da área.");
    return;
  }

  if (!state.isPolygonClosed) {
    ui.setInstruction("Clique no primeiro pin para fechar a área de cobertura.");
    return;
  }

  ui.setInstruction("Polígono fechado. Salve a área para liberar exportação.");
}

function recalculateMetrics() {
  state.metrics.pinsCount = state.boundaryPoints.length;

  if (state.isPolygonClosed && state.boundaryPoints.length >= 3) {
    const coordinates = [
      ...state.boundaryPoints.map((point) => [point.lng, point.lat]),
      [state.boundaryPoints[0].lng, state.boundaryPoints[0].lat]
    ];

    const polygon = turf.polygon([coordinates]);
    const line = turf.lineString(coordinates);

    state.metrics.areaKm2 = turf.area(polygon) / 1000000;
    state.metrics.perimeterKm = turf.length(line, { units: "kilometers" });
  } else {
    state.metrics.areaKm2 = 0;
    state.metrics.perimeterKm = 0;
  }

  ui.setMetrics(state.metrics);

  if (!state.isPolygonClosed) {
    ui.setAreaAlert("");
    return;
  }

  if (state.metrics.areaKm2 > 20) {
    ui.setAreaAlert("Alerta: área muito grande para cobertura ESF (> 20 km²).");
    return;
  }

  if (state.metrics.areaKm2 < 0.1) {
    ui.setAreaAlert("Alerta: área muito pequena para cobertura ESF (< 0.1 km²).");
    return;
  }

  ui.setAreaAlert("Área dentro da faixa esperada.");
}

function renderAll() {
  const map = getMapService();
  map.renderBoundary(state.boundaryPoints, state.isPolygonClosed);
  map.renderEquipment(state.equipmentPoints);
  ui.renderPinsList(state.boundaryPoints);
  recalculateMetrics();
  refreshInstruction();
  ui.setSaveEnabled(state.isPolygonClosed);
  ui.setExportEnabled(state.isSaved);

  const qrPayload = JSON.stringify({
    unidade: state.profile?.unit,
    pins: state.boundaryPoints,
    equipamentos: state.equipmentPoints,
    areaKm2: state.metrics.areaKm2,
    perimetroKm: state.metrics.perimeterKm
  });
  ui.renderQrCode(qrPayload);
}

function markUnsavedChange() {
  state.hasUnsavedChanges = true;
  state.isSaved = false;
}

function handleMapClick(event) {
  const { lat, lng } = event.latlng;

  if (state.isEquipmentMode) {
    state.equipmentPoints.push({
      lat,
      lng,
      category: ui.equipmentCategory.value,
      note: ""
    });
    markUnsavedChange();
    renderAll();
    return;
  }

  if (state.isPolygonClosed) {
    ui.notify("Remova um pin para reabrir a área antes de adicionar novos pontos.");
    return;
  }

  state.boundaryPoints.push({ lat, lng, note: "" });
  markUnsavedChange();
  renderAll();
}

function closePolygon() {
  if (state.boundaryPoints.length < 3) {
    ui.notify("São necessários ao menos 3 pins para fechar a área.");
    return;
  }

  state.isPolygonClosed = true;
  markUnsavedChange();
  renderAll();
}

function updateBoundaryPoint(index, lat, lng) {
  const point = state.boundaryPoints[index];
  if (!point) {
    return;
  }

  point.lat = lat;
  point.lng = lng;
  markUnsavedChange();
  renderAll();
}

function updateBoundaryNote(index, note) {
  const point = state.boundaryPoints[index];
  if (!point) {
    return;
  }

  point.note = note;
  markUnsavedChange();
}

function removeBoundaryPoint(index) {
  state.boundaryPoints.splice(index, 1);
  state.isPolygonClosed = false;
  markUnsavedChange();
  renderAll();
}

function updateEquipmentPoint(index, lat, lng) {
  const point = state.equipmentPoints[index];
  if (!point) {
    return;
  }

  point.lat = lat;
  point.lng = lng;
  markUnsavedChange();
}

function updateEquipmentNote(index, note) {
  const point = state.equipmentPoints[index];
  if (!point) {
    return;
  }

  point.note = note;
  markUnsavedChange();
}

function removeEquipmentPoint(index) {
  state.equipmentPoints.splice(index, 1);
  markUnsavedChange();
  renderAll();
}

function evaluateInsideStatus(lat, lng) {
  if (!state.isPolygonClosed || state.boundaryPoints.length < 3) {
    ui.setInsideStatus("neutral", "Área não fechada");
    return;
  }

  const polygonCoords = [
    ...state.boundaryPoints.map((point) => [point.lng, point.lat]),
    [state.boundaryPoints[0].lng, state.boundaryPoints[0].lat]
  ];

  const polygon = turf.polygon([polygonCoords]);
  const point = turf.point([lng, lat]);
  const inside = turf.booleanPointInPolygon(point, polygon);

  if (inside) {
    ui.setInsideStatus("inside", "Dentro da área");
  } else {
    ui.setInsideStatus("outside", "Fora da área");
  }
}

function saveCurrentArea() {
  if (!state.isPolygonClosed || state.boundaryPoints.length < 3) {
    ui.notify("Não é possível salvar sem polígono fechado.");
    return;
  }

  const payload = {
    profile: state.profile,
    boundaryPoints: state.boundaryPoints,
    equipmentPoints: state.equipmentPoints,
    isPolygonClosed: state.isPolygonClosed,
    metrics: state.metrics
  };

  saveUnitVersion(state.profile.unit, payload);
  state.isSaved = true;
  state.hasUnsavedChanges = false;
  renderAll();
  ui.notify("Área salva com sucesso.");
}

function clearAllData() {
  const shouldClear = window.confirm("Deseja limpar toda a delimitação atual?");
  if (!shouldClear) {
    return;
  }

  state.boundaryPoints = [];
  state.equipmentPoints = [];
  state.isPolygonClosed = false;
  state.isSaved = false;
  state.hasUnsavedChanges = false;
  renderAll();
}

function loadVersion(version) {
  state.boundaryPoints = (version?.boundaryPoints || []).map((point) => ({ ...point }));
  state.equipmentPoints = (version?.equipmentPoints || []).map((point) => ({ ...point }));
  state.isPolygonClosed = Boolean(version?.isPolygonClosed);
  state.metrics = version?.metrics || state.metrics;
  state.isSaved = true;
  state.hasUnsavedChanges = false;
  renderAll();
}

function exportBackupJson() {
  const filename = `backup_esf_mapper_${formatDateForFile()}.json`;
  downloadBlob(getStorageBackupJson(), filename, "application/json");
}

async function submitLogin(event) {
  event.preventDefault();

  if (!ui.validateLoginForm()) {
    return;
  }

  state.profile = ui.getLoginData();
  saveSessionUser(state.profile);

  pendingSavedVersion = getLatestUnitVersion(state.profile.unit);

  if (pendingSavedVersion) {
    ui.openSavedDialog();
    return;
  }

  await startMapFlow(false);
}

async function startMapFlow(loadSaved) {
  ui.showMapScreen(state.profile);
  const map = getMapService();
  map.refreshSize();
  await map.centerByUnitName(state.profile.unit);

  if (loadSaved && pendingSavedVersion) {
    loadVersion(pendingSavedVersion);
  } else {
    state.boundaryPoints = [];
    state.equipmentPoints = [];
    state.isPolygonClosed = false;
    state.isSaved = false;
    state.hasUnsavedChanges = false;
    renderAll();
  }

  map.refreshSize();
}

function registerEvents() {
  [ui.fullName, ui.registration, ui.esfUnit].forEach((field) => {
    field.addEventListener("input", () => ui.validateLoginForm());
  });

  ui.loginForm.addEventListener("submit", submitLogin);

  ui.loadSavedBtn.addEventListener("click", async () => {
    ui.closeSavedDialog();
    await startMapFlow(true);
  });

  ui.startFreshBtn.addEventListener("click", async () => {
    ui.closeSavedDialog();
    pendingSavedVersion = null;
    await startMapFlow(false);
  });

  ui.clearAllBtn.addEventListener("click", clearAllData);
  ui.saveAreaBtn.addEventListener("click", saveCurrentArea);
  ui.exportCsvBtn.addEventListener("click", () => exportAllAsCsv(state, state.profile));
  ui.exportGeoJsonBtn.addEventListener("click", () => exportAsGeoJson(state, state.profile));
  ui.backupBtn.addEventListener("click", exportBackupJson);

  ui.whereAmIBtn.addEventListener("click", () => {
    try {
      getMapService().locateUser();
    } catch (error) {
      ui.notify(error.message || "Não foi possível usar geolocalização.");
    }
  });

  ui.searchAddressBtn.addEventListener("click", async () => {
    const query = ui.addressSearch.value.trim();
    if (!query) {
      ui.notify("Digite um endereço para buscar.");
      return;
    }

    try {
      await getMapService().searchAddress(query);
    } catch {
      ui.notify("Endereço não encontrado em Belém.");
    }
  });

  ui.toggleEquipmentModeBtn.addEventListener("click", () => {
    state.isEquipmentMode = !state.isEquipmentMode;
    ui.setEquipmentMode(state.isEquipmentMode);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.hasUnsavedChanges) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  window.addEventListener("resize", () => {
    if (mapService) {
      mapService.refreshSize();
    }
  });
}

function setupPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  // Em ambiente local de desenvolvimento, evita cache antigo quebrando tiles do mapa.
  if (isLocalhost) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    return;
  }

  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    // Não interrompe o fluxo se o service worker falhar.
  });
}

registerEvents();
setupPwa();
ui.validateLoginForm();
ui.setEquipmentMode(false);
