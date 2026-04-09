<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function decodeJsonColumn(?string $value): array
{
    if ($value === null || trim($value) === '') {
        return [];
    }

    $decoded = json_decode($value, true);
    if (!is_array($decoded)) {
        return [];
    }

    return $decoded;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $unitName = trim((string) ($_GET['unit'] ?? ''));
    if ($unitName === '') {
        jsonResponse([
            'ok' => false,
            'message' => 'Informe a unidade no parâmetro unit.'
        ], 400);
    }

    $pdo = getPdoOrNull();
    if ($pdo === null) {
        jsonResponse([
            'ok' => true,
            'area' => null,
            'source' => 'fallback'
        ]);
    }

    try {
        ensureCoverageTable($pdo);

        $statement = $pdo->prepare(
            'SELECT unit_name, profile_json, boundary_points_json, equipment_points_json, is_polygon_closed, metrics_json, saved_at
             FROM coverage_areas
             WHERE unit_name = :unit_name
             ORDER BY saved_at DESC, id DESC
             LIMIT 1'
        );

        $statement->execute(['unit_name' => $unitName]);
        $row = $statement->fetch();

        if (!$row) {
            jsonResponse([
                'ok' => true,
                'area' => null,
                'source' => 'database'
            ]);
        }

        jsonResponse([
            'ok' => true,
            'source' => 'database',
            'area' => [
                'profile' => decodeJsonColumn($row['profile_json']),
                'boundaryPoints' => decodeJsonColumn($row['boundary_points_json']),
                'equipmentPoints' => decodeJsonColumn($row['equipment_points_json']),
                'isPolygonClosed' => (bool) $row['is_polygon_closed'],
                'metrics' => decodeJsonColumn($row['metrics_json']),
                'savedAt' => (string) $row['saved_at']
            ]
        ]);
    } catch (Throwable $error) {
        jsonResponse([
            'ok' => true,
            'area' => null,
            'source' => 'fallback'
        ]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = readJsonBody();

    $profile = $payload['profile'] ?? null;
    $unitName = trim((string) (($profile['unit'] ?? '')));
    $boundaryPoints = $payload['boundaryPoints'] ?? [];
    $equipmentPoints = $payload['equipmentPoints'] ?? [];
    $metrics = $payload['metrics'] ?? [];
    $isPolygonClosed = (bool) ($payload['isPolygonClosed'] ?? false);
    $savedAt = parseSavedAtOrNow($payload['savedAt'] ?? null);

    if ($unitName === '') {
        jsonResponse([
            'ok' => false,
            'saved' => false,
            'message' => 'Unidade inválida para salvamento.'
        ], 400);
    }

    $pdo = getPdoOrNull();
    if ($pdo === null) {
        jsonResponse([
            'ok' => true,
            'saved' => false,
            'message' => 'Banco não configurado.'
        ]);
    }

    try {
        ensureCoverageTable($pdo);

        $statement = $pdo->prepare(
            'INSERT INTO coverage_areas (
                unit_name,
                profile_json,
                boundary_points_json,
                equipment_points_json,
                is_polygon_closed,
                metrics_json,
                saved_at
            ) VALUES (
                :unit_name,
                :profile_json,
                :boundary_points_json,
                :equipment_points_json,
                :is_polygon_closed,
                :metrics_json,
                :saved_at
            )'
        );

        $statement->execute([
            'unit_name' => $unitName,
            'profile_json' => json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'boundary_points_json' => json_encode($boundaryPoints, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'equipment_points_json' => json_encode($equipmentPoints, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'is_polygon_closed' => $isPolygonClosed ? 1 : 0,
            'metrics_json' => json_encode($metrics, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'saved_at' => $savedAt
        ]);

        jsonResponse([
            'ok' => true,
            'saved' => true,
            'message' => 'Área salva no banco com sucesso.'
        ]);
    } catch (Throwable $error) {
        jsonResponse([
            'ok' => true,
            'saved' => false,
            'message' => 'Falha ao salvar no banco.'
        ]);
    }
}

jsonResponse([
    'ok' => false,
    'message' => 'Método não permitido.'
], 405);
