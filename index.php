<?php
declare(strict_types=1);

$appName = 'ESF Mapper';
?>
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#2E7D32" />
    <title><?php echo htmlspecialchars($appName, ENT_QUOTES, 'UTF-8'); ?></title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
      rel="stylesheet"
    />

    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="icon" href="assets/icons/icon.svg" type="image/svg+xml" />

    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <link rel="stylesheet" href="assets/css/styles.css" />
  </head>
  <body>
    <main class="app-shell">
      <section id="loginScreen" class="screen login-screen" aria-labelledby="loginTitle">
        <div class="login-card">
          <div class="login-hero">
            <span class="eyebrow">Belém · saúde territorial</span>
            <h1 id="loginTitle">ESF Mapper</h1>
            <p class="subtitle">
              Delimite áreas de cobertura, acompanhe métricas e exporte dados com uma interface limpa,
              rápida e visualmente forte.
            </p>
            <div class="hero-tags" aria-label="Destaques do sistema">
              <span>Mapa interativo</span>
              <span>GeoJSON e CSV</span>
              <span>Offline-ready</span>
            </div>
          </div>

          <div class="login-panel">
            <form id="loginForm" class="form-grid" novalidate>
              <label for="fullName">Nome completo</label>
              <input id="fullName" name="fullName" type="text" minlength="3" required autocomplete="name" />

              <label for="registration">Matrícula</label>
              <input id="registration" name="registration" type="text" required autocomplete="off" />

              <label for="esfUnit">Unidade ESF</label>
              <input id="esfUnit" name="esfUnit" list="esfUnitsList" required autocomplete="off" />
              <datalist id="esfUnitsList"></datalist>

              <button id="enterMapBtn" type="submit" disabled>Entrar no Mapa</button>
            </form>
          </div>

          <dialog id="savedAreaDialog" aria-labelledby="savedAreaTitle">
            <h2 id="savedAreaTitle">Área salva encontrada</h2>
            <p>Deseja carregar a última área salva desta unidade?</p>
            <div class="dialog-actions">
              <button id="loadSavedBtn" type="button">Carregar área salva</button>
              <button id="startFreshBtn" type="button" class="secondary">Começar do zero</button>
            </div>
          </dialog>
        </div>
      </section>

      <section id="mapScreen" class="screen map-screen hidden" aria-live="polite">
        <header class="topbar">
          <div class="topbar-info">
            <span class="eyebrow eyebrow-inline">ESF Mapper</span>
            <strong id="unitNameLabel">Unidade</strong>
            <span id="userLabel">Profissional</span>
            <span class="topbar-note">Área de cobertura ativa e pronta para edição</span>
          </div>
          <div class="topbar-actions">
            <button id="clearAllBtn" type="button" class="danger">Limpar tudo</button>
            <button id="saveAreaBtn" type="button" disabled>Salvar área</button>
            <button id="exportCsvBtn" type="button" disabled>Exportar CSV</button>
            <button id="exportGeoJsonBtn" type="button" disabled>Exportar GeoJSON</button>
            <button id="backupBtn" type="button" class="secondary">Backup JSON</button>
          </div>
        </header>

        <div class="layout">
          <aside class="sidebar" id="sidebar">
            <section class="panel">
              <h2>Instruções</h2>
              <p id="instructionText">Adicione o primeiro pin para iniciar a área.</p>
            </section>

            <section class="panel metrics-panel">
              <h2>Métricas</h2>
              <ul>
                <li><span>Área:</span> <strong id="areaMetric">0.00 km²</strong></li>
                <li><span>Perímetro:</span> <strong id="perimeterMetric">0.00 km</strong></li>
                <li><span>Pins:</span> <strong id="pinsMetric">0</strong></li>
              </ul>
              <p id="areaAlert" class="alert-text" role="status"></p>
            </section>

            <section class="panel" id="fieldModePanel">
              <h2>Modo Campo</h2>
              <div class="field-row">
                <button id="whereAmIBtn" type="button">Estou aqui</button>
                <span id="insideStatus" class="status-indicator neutral">Sem leitura</span>
              </div>
              <label for="addressSearch">Buscar endereço</label>
              <div class="search-row">
                <input id="addressSearch" type="text" placeholder="Ex.: Av. Nazaré, Belém" />
                <button id="searchAddressBtn" type="button" class="secondary">Buscar</button>
              </div>
            </section>

            <section class="panel">
              <h2>Lista de Pins</h2>
              <ol id="pinsList"></ol>
            </section>

            <section class="panel">
              <h2>QR Code da área</h2>
              <canvas id="areaQrCanvas" width="180" height="180" aria-label="QR Code da área"></canvas>
            </section>
          </aside>

          <section class="map-container">
            <div id="map" role="application" aria-label="Mapa interativo de cobertura"></div>
          </section>
        </div>
      </section>
    </main>

    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script src="https://unpkg.com/@turf/turf@6.5.0/turf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>
    <script type="module" src="assets/js/app.js"></script>
  </body>
</html>
