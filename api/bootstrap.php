<?php

declare(strict_types=1);

function loadEnvFile(string $filePath): void
{
    if (!is_file($filePath)) {
        return;
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        $parts = explode('=', $trimmed, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);

        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }

        if (getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }

    return $decoded;
}

function getDatabaseConfig(): array
{
    return [
        'host' => getenv('DB_HOST') ?: '',
        'port' => getenv('DB_PORT') ?: '3306',
        'name' => getenv('DB_NAME') ?: '',
        'user' => getenv('DB_USER') ?: '',
        'pass' => getenv('DB_PASS') ?: '',
        'charset' => getenv('DB_CHARSET') ?: 'utf8mb4'
    ];
}

function getPdoOrNull(): ?PDO
{
    $config = getDatabaseConfig();
    if ($config['host'] === '' || $config['name'] === '' || $config['user'] === '') {
        return null;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['name'],
        $config['charset']
    );

    try {
        return new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
    } catch (Throwable $error) {
        return null;
    }
}

function ensureCoverageTable(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS coverage_areas (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            unit_name VARCHAR(190) NOT NULL,
            profile_json JSON NOT NULL,
            boundary_points_json JSON NOT NULL,
            equipment_points_json JSON NOT NULL,
            is_polygon_closed TINYINT(1) NOT NULL DEFAULT 0,
            metrics_json JSON NOT NULL,
            saved_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_coverage_unit_saved (unit_name, saved_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'
    );
}

function ensureUnitsTable(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS esf_units (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(190) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'
    );
}

function parseSavedAtOrNow(?string $savedAt): string
{
    if (!$savedAt) {
        return (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    }

    try {
        return (new DateTimeImmutable($savedAt))->format('Y-m-d H:i:s');
    } catch (Throwable $error) {
        return (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    }
}

loadEnvFile(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');
