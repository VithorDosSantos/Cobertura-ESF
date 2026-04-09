import { BELEN_ESF_UNITS } from "./constants.js";

export class UIService {
  constructor() {
    this.loginScreen = document.getElementById("loginScreen");
    this.mapScreen = document.getElementById("mapScreen");

    this.loginForm = document.getElementById("loginForm");
    this.fullName = document.getElementById("fullName");
    this.registration = document.getElementById("registration");
    this.esfUnit = document.getElementById("esfUnit");
    this.enterMapBtn = document.getElementById("enterMapBtn");

    this.savedAreaDialog = document.getElementById("savedAreaDialog");
    this.loadSavedBtn = document.getElementById("loadSavedBtn");
    this.startFreshBtn = document.getElementById("startFreshBtn");

    this.unitNameLabel = document.getElementById("unitNameLabel");
    this.userLabel = document.getElementById("userLabel");

    this.instructionText = document.getElementById("instructionText");
    this.areaMetric = document.getElementById("areaMetric");
    this.perimeterMetric = document.getElementById("perimeterMetric");
    this.pinsMetric = document.getElementById("pinsMetric");
    this.areaAlert = document.getElementById("areaAlert");

    this.clearAllBtn = document.getElementById("clearAllBtn");
    this.saveAreaBtn = document.getElementById("saveAreaBtn");
    this.exportCsvBtn = document.getElementById("exportCsvBtn");
    this.exportGeoJsonBtn = document.getElementById("exportGeoJsonBtn");
    this.backupBtn = document.getElementById("backupBtn");

    this.whereAmIBtn = document.getElementById("whereAmIBtn");
    this.insideStatus = document.getElementById("insideStatus");
    this.addressSearch = document.getElementById("addressSearch");
    this.searchAddressBtn = document.getElementById("searchAddressBtn");

    this.toggleEquipmentModeBtn = document.getElementById("toggleEquipmentModeBtn");
    this.equipmentModeLabel = document.getElementById("equipmentModeLabel");
    this.equipmentCategory = document.getElementById("equipmentCategory");

    this.pinsList = document.getElementById("pinsList");
    this.areaQrCanvas = document.getElementById("areaQrCanvas");

    this.populateUnits();
  }

  populateUnits() {
    const datalist = document.getElementById("esfUnitsList");
    datalist.innerHTML = BELEN_ESF_UNITS.map((unit) => `<option value="${unit}"></option>`).join("");
  }

  getLoginData() {
    return {
      fullName: this.fullName.value.trim(),
      registration: this.registration.value.trim(),
      unit: this.esfUnit.value.trim()
    };
  }

  validateLoginForm() {
    const { fullName, registration, unit } = this.getLoginData();
    const isValid = fullName.length >= 3 && registration.length > 0 && unit.length > 0;
    this.enterMapBtn.disabled = !isValid;
    return isValid;
  }

  showMapScreen(profile) {
    this.loginScreen.classList.add("hidden");
    this.mapScreen.classList.remove("hidden");
    this.unitNameLabel.textContent = profile.unit;
    this.userLabel.textContent = `${profile.fullName} - Matrícula ${profile.registration}`;
  }

  openSavedDialog() {
    this.savedAreaDialog.showModal();
  }

  closeSavedDialog() {
    this.savedAreaDialog.close();
  }

  setInstruction(text) {
    this.instructionText.textContent = text;
  }

  setMetrics(metrics) {
    this.areaMetric.textContent = `${metrics.areaKm2.toFixed(2)} km²`;
    this.perimeterMetric.textContent = `${metrics.perimeterKm.toFixed(2)} km`;
    this.pinsMetric.textContent = String(metrics.pinsCount);
  }

  setAreaAlert(text) {
    this.areaAlert.textContent = text;
  }

  setSaveEnabled(enabled) {
    this.saveAreaBtn.disabled = !enabled;
  }

  setExportEnabled(enabled) {
    this.exportCsvBtn.disabled = !enabled;
    this.exportGeoJsonBtn.disabled = !enabled;
  }

  setInsideStatus(kind, text) {
    this.insideStatus.className = `status-indicator ${kind}`;
    this.insideStatus.textContent = text;
  }

  setEquipmentMode(isEquipmentMode) {
    this.equipmentModeLabel.textContent = isEquipmentMode
      ? "Modo: adicionando equipamentos"
      : "Modo: área de cobertura";

    this.toggleEquipmentModeBtn.textContent = isEquipmentMode
      ? "Voltar para área"
      : "Adicionar equipamento";
  }

  renderPinsList(boundaryPoints) {
    this.pinsList.innerHTML = boundaryPoints
      .map(
        (point, index) =>
          `<li>Pin ${index + 1}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} ${
            point.note ? `- ${point.note}` : ""
          }</li>`
      )
      .join("");
  }

  renderQrCode(text) {
    // QRious está disponível globalmente via CDN.
    // eslint-disable-next-line no-undef
    const qr = new QRious({
      element: this.areaQrCanvas,
      value: text || "ESF Mapper",
      size: 180,
      level: "M"
    });
    return qr;
  }

  notify(message) {
    window.alert(message);
  }
}
