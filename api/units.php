<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$fallbackUnits = [
    'ESF Jurunas I',
    'ESF Jurunas II',
    'ESF Guamá',
    'ESF Marco',
    'ESF Telégrafo',
    'ESF Sacramenta',
    'ESF Pedreira',
    'ESF Terra Firme',
    'ESF Bengui',
    'ESF Tapanã',
    'ESF Icoaraci',
    'ESF Outeiro',
    'ESF Mosqueiro',
    'ESF Cabanagem',
    'ESF Pratinha',
    'ESF Condor'
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
    ensureUnitsTable($pdo);
    $statement = $pdo->query('SELECT name FROM esf_units ORDER BY name ASC');
    $rows = $statement->fetchAll();

    $units = array_map(
        static fn(array $row): string => (string) $row['name'],
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
