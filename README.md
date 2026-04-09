# ESF Mapper

Sistema web para delimitação de cobertura ESF de Belém (PA), desenvolvido para uso de agentes e gestores de saúde.

## Funcionalidades entregues

- Login com validação obrigatória: nome, matrícula e unidade ESF (autocomplete)
- Sessão salva em `sessionStorage`
- Detecção de área salva por unidade com opção de carregar ou iniciar nova delimitação
- Mapa Leaflet + OpenStreetMap centralizado em Belém (`-1.4558, -48.4902`)
- Busca da unidade e endereços via Nominatim
- Delimitação por pins numerados com fechamento ao clicar no primeiro pin
- Edição por arraste, nota por pin e remoção de pin
- Polyline e polígono semitransparente
- Painel de instruções dinâmicas por estado
- Métricas automáticas com Turf.js: área (km²), perímetro (km), total de pins
- Alertas de área muito grande (> 20 km²) ou muito pequena (< 0.1 km²)
- Modo campo: botão "Estou aqui" + indicador dentro/fora da área
- Cadastro de equipamentos de saúde com categorias:
  - UPA
  - Farmácia
  - Escola
  - CAPS
  - Hospital
  - Outro
- Exportação CSV:
  - arquivo da área de cobertura
  - arquivo separado de equipamentos
- Exportação GeoJSON:
  - polígono como Feature principal
  - vértices e equipamentos como Features separadas
- Persistência em `localStorage` com histórico de até 5 versões por unidade
- Backup JSON completo do armazenamento local
- Aviso ao sair da página com alterações não salvas
- Responsivo para mobile, tablet e desktop
- PWA básico com `manifest.webmanifest` e `service-worker.js`
- QR Code da área (conteúdo resumido em JSON)

## Estrutura de pastas

```text
esf-mapper/
  index.php
  .env.example
  manifest.webmanifest
  service-worker.js
  api/
    bootstrap.php
    units.php
    areas.php
  assets/
    css/
      styles.css
    icons/
      icon.svg
    js/
      app.js
      modules/
        constants.js
        utils.js
        storageService.js
        mapService.js
        exportService.js
        uiService.js
```

## Como rodar localmente

1. Entre na pasta do projeto.
2. Se quiser usar banco depois, copie `.env.example` para `.env` e preencha os dados do MySQL.
3. Inicie um servidor PHP local:

```bash
php -S localhost:8080
```

4. Abra no navegador:

```text
http://localhost:8080
```

## Camada PHP e banco

- A aplicação agora usa `index.php` como entrada principal.
- Existe uma API em PHP para futuras integrações de banco:
  - `GET /api/units.php` lista unidades (usa fallback local se o banco não estiver configurado)
  - `GET /api/areas.php?unit=...` busca última área salva da unidade
  - `POST /api/areas.php` salva área de cobertura
- Enquanto o banco não estiver configurado, o sistema continua funcionando com persistência local (`localStorage`).

### Regra de unidades do login

- O login agora busca somente as unidades habilitadas em `esf_mapper_unidades`.
- Isso evita mostrar todas as unidades da base e mantém apenas as unidades específicas da sua operação.
- Se não houver banco configurado, o endpoint usa um fallback mínimo para não quebrar o fluxo.
- Não existe tabela de tipos de unidade no app; o escopo é somente ESF/USF habilitadas na whitelist.

## Estrutura SQL de unidades

- Script base criado em `database/schema_unidades_saude.sql`.
- Esse script foi derivado do seu dump de referência e inclui:
  - estrutura da tabela `unidades_saude`
  - tabela `esf_mapper_unidades` (whitelist para o login)
  - índices e chaves estrangeiras
  - carga inicial de unidades com coordenadas para o mapa
  - views `vw_unidades_mapa` e `vw_esf_mapper_unidades_ativas`
  - sem tabela de tipos de unidade, porque o sistema trabalha apenas com ESF/USF do escopo definido

Importação exemplo:

```bash
mysql -u seu_usuario -p seu_banco < database/schema_unidades_saude.sql
```

## Observações

- A geocodificação depende de conectividade com a API pública do Nominatim.
- O funcionamento offline (PWA) cobre os arquivos locais da aplicação, mas não os tiles online do mapa.
