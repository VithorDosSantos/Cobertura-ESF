import { downloadBlob, formatDateForFile, formatDateTime, sanitizeCsvValue, slugify } from "./utils.js";

function buildAreaCsv(state, profile) {
  const headers = [
    "unidade",
    "latitude",
    "longitude",
    "ordem",
    "nota",
    "profissional",
    "matricula",
    "data_exportacao"
  ];

  const exportTime = formatDateTime();
  const rows = state.boundaryPoints.map((point, index) => [
    profile.unit,
    point.lat,
    point.lng,
    index + 1,
    point.note || "",
    profile.fullName,
    profile.registration,
    exportTime
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map(sanitizeCsvValue).join(","))].join("\n");
  const filename = `area_cobertura_${slugify(profile.unit)}_${formatDateForFile()}.csv`;
  downloadBlob(csv, filename, "text/csv;charset=utf-8");
}

function buildGeoJson(state, profile) {
  const polygonFeature = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [...state.boundaryPoints.map((p) => [p.lng, p.lat]), [state.boundaryPoints[0].lng, state.boundaryPoints[0].lat]]
      ]
    },
    properties: {
      unidade: profile.unit,
      profissional: profile.fullName,
      matricula: profile.registration,
      area_km2: state.metrics.areaKm2,
      perimetro_km: state.metrics.perimeterKm,
      total_pins: state.boundaryPoints.length
    }
  };

  const boundaryPointFeatures = state.boundaryPoints.map((point, index) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [point.lng, point.lat]
    },
    properties: {
      tipo: "vertice_cobertura",
      ordem: index + 1,
      nota: point.note || ""
    }
  }));

  const featureCollection = {
    type: "FeatureCollection",
    features: [polygonFeature, ...boundaryPointFeatures]
  };

  const filename = `area_cobertura_${slugify(profile.unit)}_${formatDateForFile()}.geojson`;
  downloadBlob(JSON.stringify(featureCollection, null, 2), filename, "application/geo+json");
}

export function exportAllAsCsv(state, profile) {
  buildAreaCsv(state, profile);
}

export function exportAsGeoJson(state, profile) {
  buildGeoJson(state, profile);
}
