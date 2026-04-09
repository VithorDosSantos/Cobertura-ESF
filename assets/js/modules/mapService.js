import { BELEN_CENTER, DEFAULT_ZOOM } from "./constants.js";

function makePinIcon(index, isFirst) {
  return L.divIcon({
    className: "",
    html: `<div class="pin-marker ${isFirst ? "first" : ""}">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

export class MapService {
  constructor(mapId, hooks) {
    this.hooks = hooks;
    this.map = L.map(mapId).setView(BELEN_CENTER, DEFAULT_ZOOM);
    this.boundaryMarkers = [];
    this.polyline = null;
    this.polygon = null;
    this.userLocationMarker = null;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(this.map);

    this.map.on("click", (event) => this.hooks.onMapClick(event));
  }

  refreshSize() {
    // Leaflet precisa recalcular o tamanho ao sair de telas ocultas/layouts responsivos.
    setTimeout(() => this.map.invalidateSize(), 120);
  }

  async centerByUnitName(unitName) {
    try {
      const query = encodeURIComponent(`${unitName}, Belém, Pará`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`
      );
      const data = await response.json();
      if (!data.length) {
        throw new Error("Unidade não encontrada");
      }

      const target = [Number(data[0].lat), Number(data[0].lon)];
      this.map.setView(target, 15);
      this.refreshSize();
      return true;
    } catch {
      this.map.setView(BELEN_CENTER, DEFAULT_ZOOM);
      this.refreshSize();
      this.hooks.onNotice("Não foi possível localizar a unidade. Mapa centralizado em Belém.");
      return false;
    }
  }

  centerByCoordinates(lat, lng, zoom = 15) {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false;
    }

    this.map.setView([latitude, longitude], zoom);
    this.refreshSize();
    return true;
  }

  renderBoundary(boundaryPoints, isClosed) {
    this.boundaryMarkers.forEach((marker) => marker.remove());
    this.boundaryMarkers = [];

    boundaryPoints.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        draggable: true,
        icon: makePinIcon(index, index === 0)
      });

      marker.on("click", () => {
        if (index === 0 && boundaryPoints.length >= 3 && !isClosed) {
          this.hooks.onClosePolygonRequested();
        }
      });

      marker.on("dragend", (event) => {
        const { lat, lng } = event.target.getLatLng();
        this.hooks.onBoundaryDrag(index, lat, lng);
      });

      marker.on("popupopen", () => {
        const noteField = document.getElementById(`pin-note-${index}`);
        const removeButton = document.getElementById(`pin-remove-${index}`);

        if (noteField) {
          noteField.addEventListener("input", (event) => {
            this.hooks.onBoundaryNoteChange(index, event.target.value);
          });
        }

        if (removeButton) {
          removeButton.addEventListener("click", () => {
            this.hooks.onBoundaryRemove(index);
            this.map.closePopup();
          });
        }
      });

      const popupHtml = `
        <strong>Pin ${index + 1}</strong><br/>
        Lat: ${point.lat.toFixed(6)}<br/>
        Lng: ${point.lng.toFixed(6)}
        <label for="pin-note-${index}">Nota</label>
        <textarea id="pin-note-${index}" class="popup-note">${point.note || ""}</textarea>
        <button id="pin-remove-${index}" type="button" class="danger">Remover</button>
      `;
      marker.bindPopup(popupHtml);

      marker.addTo(this.map);
      this.boundaryMarkers.push(marker);
    });

    if (this.polyline) {
      this.polyline.remove();
    }

    if (boundaryPoints.length) {
      this.polyline = L.polyline(
        boundaryPoints.map((point) => [point.lat, point.lng]),
        {
          color: "#1565C0",
          weight: 3
        }
      ).addTo(this.map);
    }

    if (this.polygon) {
      this.polygon.remove();
      this.polygon = null;
    }

    if (isClosed && boundaryPoints.length >= 3) {
      this.polygon = L.polygon(
        boundaryPoints.map((point) => [point.lat, point.lng]),
        {
          color: "#1565C0",
          weight: 2,
          fillColor: "#1565C0",
          fillOpacity: 0.26
        }
      ).addTo(this.map);
    }
  }

  async searchAddress(addressText) {
    const query = encodeURIComponent(`${addressText}, Belém, Pará`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
    const data = await response.json();

    if (!data.length) {
      throw new Error("Endereço não encontrado");
    }

    const target = [Number(data[0].lat), Number(data[0].lon)];
    this.map.setView(target, 16);
    this.refreshSize();
    L.popup().setLatLng(target).setContent("Endereço localizado").openOn(this.map);

    return target;
  }

  locateUser() {
    if (!navigator.geolocation) {
      throw new Error("Geolocalização indisponível no dispositivo");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (this.userLocationMarker) {
          this.userLocationMarker.remove();
        }

        this.userLocationMarker = L.marker([lat, lng]).addTo(this.map).bindPopup("Você está aqui");
        this.userLocationMarker.openPopup();
        this.map.setView([lat, lng], 16);
        this.refreshSize();
        this.hooks.onLocationUpdate(lat, lng);
      },
      () => {
        this.hooks.onNotice("Não foi possível obter sua localização atual.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }
}
