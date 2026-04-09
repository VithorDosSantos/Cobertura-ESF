<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$fallbackUnits = [
    ['name' => 'USF TAPANÃ I', 'latitude' => -1.34843300, 'longitude' => -48.46217700],
    ['name' => 'USF BENGUI', 'latitude' => -1.37406100, 'longitude' => -48.45177800],
    ['name' => 'USF TELÉGRAFO', 'latitude' => -1.42142600, 'longitude' => -48.48539400],
    ['name' => 'USF CONDOR', 'latitude' => -1.47148600, 'longitude' => -48.47964900],
    ['name' => 'USF TERRA FIRME', 'latitude' => -1.29788500, 'longitude' => -48.44292100],
    ['name' => 'USF OUTEIRO', 'latitude' => -1.26444100, 'longitude' => -48.46270000],
    ['name' => 'USF PARACURI', 'latitude' => -1.31276400, 'longitude' => -48.48333000],
    ['name' => 'USF SACRAMENTA', 'latitude' => -1.41341800, 'longitude' => -48.46711300]
];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse([
        'ok' => false,
        'message' => 'Método não permitido.'
    ], 405);
}

$pdo = getPdoOrNull();
if ($pdo === null) {
    jsonResponse([
        'ok' => true,
        'source' => 'fallback',
        'units' => $fallbackUnits
    ]);
}

try {
    $statement = $pdo->query(
        'SELECT
            COALESCE(cfg.nome_exibicao, us.nome) AS name,
            us.latitude,
                        us.longitude
         FROM esf_mapper_unidades cfg
         INNER JOIN unidades_saude us ON us.id = cfg.unidade_saude_id
         WHERE cfg.ativo = 1
           AND us.ativo = 1
         ORDER BY cfg.ordem ASC, COALESCE(cfg.nome_exibicao, us.nome) ASC'
    );
    $rows = $statement->fetchAll();

    $units = array_map(
        static fn(array $row): array => [
            'name' => (string) $row['name'],
            'latitude' => $row['latitude'] !== null ? (float) $row['latitude'] : null,
            'longitude' => $row['longitude'] !== null ? (float) $row['longitude'] : null
        ],
        $rows
    );

    if (count($units) === 0) {
        $units = $fallbackUnits;
    }

    jsonResponse([
        'ok' => true,
        'source' => 'database',
        'units' => $units
    ]);
} catch (Throwable $error) {
    jsonResponse([
        'ok' => true,
        'source' => 'fallback',
        'units' => $fallbackUnits
    ]);
}
