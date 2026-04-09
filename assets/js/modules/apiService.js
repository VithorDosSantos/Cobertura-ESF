const API_BASE = "./api";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function fetchUnits() {
  try {
    const data = await requestJson("/units.php");
    if (!data || !Array.isArray(data.units)) {
      return null;
    }

    return data.units;
  } catch {
    return null;
  }
}

export async function fetchLatestAreaByUnit(unitName) {
  if (!unitName) {
    return null;
  }

  try {
    const query = new URLSearchParams({ unit: unitName });
    const data = await requestJson(`/areas.php?${query.toString()}`);
    return data?.area || null;
  } catch {
    return null;
  }
}

export async function saveAreaRemote(payload) {
  try {
    const data = await requestJson("/areas.php", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    return Boolean(data?.saved);
  } catch {
    return false;
  }
}
