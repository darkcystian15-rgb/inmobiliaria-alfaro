<?php
// Install in the document root of media.inmobiliariaalbertoalfaro.com.pe.
// Keep configuration and documents OUTSIDE every public document root.
ini_set('display_errors', '0');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
function fail_request($status) { http_response_code($status); exit; }
$configPath = '/home5/inmobi16/documentos-config.php';
if (!is_file($configPath)) fail_request(503);
$config = require $configPath;
$token = $config['token'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = $config['upload_origin'] ?? 'https://intranet.inmobiliariaalbertoalfaro.com.pe';
if ($origin === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Max-Age: 600');
}
if ($method === 'OPTIONS') {
    if ($origin !== $allowedOrigin) fail_request(403);
    http_response_code(204); exit;
}
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$claims = null;
if (strlen($token) < 32) fail_request(401);
if (!hash_equals('Bearer ' . $token, $auth)) {
    if ($method !== 'PUT' || $origin !== $allowedOrigin || strlen($auth) > 8000 || !preg_match('/^Bearer literal-v1\.([A-Za-z0-9_-]+)\.([a-f0-9]{64})$/D', $auth, $matches)) fail_request(401);
    if (!hash_equals(hash_hmac('sha256', 'literal-v1.' . $matches[1], $token), $matches[2])) fail_request(401);
    $claims = json_decode(base64_decode(strtr($matches[1], '-_', '+/')), true);
    if (!is_array($claims) || ($claims['type'] ?? '') !== 'COPIA_LITERAL_CRI' || !is_int($claims['expires'] ?? null) || $claims['expires'] < time() || !is_int($claims['size'] ?? null) || $claims['size'] < 1 || $claims['size'] > 50 * 1024 * 1024) fail_request(401);
    if (($claims['path'] ?? '') !== ($_GET['path'] ?? '') || strpos($claims['path'], '/copia-literal-cri/') === false || !preg_match('/\.(pdf|doc|docx|xls|xlsx)$/iD', $claims['path'])) fail_request(403);
}
if (isset($_GET['capabilities'])) {
    if ($claims !== null || $method !== 'GET') fail_request(403);
    header('Content-Type: application/json');
    echo '{"literalUploadVersion":1,"maxLiteralBytes":52428800}'; exit;
}
$path = $_GET['path'] ?? '';
// Accept both the new code/position folders and the previous layout.
$legacyPattern = '#^inmuebles/(posicion-[1-9][0-9]*|sin-posicion)/inmueble-[1-9][0-9]*/[a-z-]+/[a-zA-Z0-9._-]+\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$#D';
$currentPattern = '#^inmuebles/[a-zA-Z0-9_-]+-(posicion-[1-9][0-9]*|sin-posicion)/[a-z-]+/[a-zA-Z0-9._-]+\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$#D';
if (!is_string($path) || strlen($path) > 1000 || (!preg_match($legacyPattern, $path) && !preg_match($currentPattern, $path))) fail_request(400);
$root = $config['directory'] ?? '';
if (!$root || !is_dir($root) || is_link($root)) fail_request(503);
$root = realpath($root);
$file = $root . '/' . $path;
// Reject symlinks anywhere in the relative path.
$cursor = $root;
foreach (explode('/', $path) as $part) { $cursor .= '/' . $part; if (is_link($cursor)) fail_request(400); }
if ($method === 'PUT') {
    $limit = $claims !== null ? $claims['size'] : 4 * 1024 * 1024;
    if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > $limit) fail_request(413);
    $input = fopen('php://input', 'rb');
    $bytes = stream_get_contents($input, $limit + 1);
    fclose($input);
    if ($bytes === false || strlen($bytes) === 0 || strlen($bytes) > $limit) fail_request(413);
    if ($claims !== null && strlen($bytes) !== $claims['size']) fail_request(400);
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if ($extension === 'pdf' && substr($bytes, 0, 5) !== '%PDF-') fail_request(400);
    if (in_array($extension, ['doc', 'xls'], true) && substr($bytes, 0, 8) !== hex2bin('d0cf11e0a1b11ae1')) fail_request(400);
    if (in_array($extension, ['docx', 'xlsx'], true) && substr($bytes, 0, 2) !== 'PK') fail_request(400);
    if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
        $image = @getimagesizefromstring($bytes);
        $mimes = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
        if (!$image || ($image['mime'] ?? '') !== $mimes[$extension] || $image[0] * $image[1] > 40000000) fail_request(400);
    }
    $directory = dirname($file);
    if (!is_dir($directory) && !mkdir($directory, 0700, true)) fail_request(500);
    $output = @fopen($file, 'xb');
    if (!$output) fail_request(409);
    chmod($file, 0600);
    $written = fwrite($output, $bytes);
    fclose($output);
    if ($written !== strlen($bytes)) { unlink($file); fail_request(500); }
    http_response_code(201);
    header('Content-Type: application/json');
    echo '{"ok":true}';
} elseif ($method === 'GET') {
    if (!is_file($file)) fail_request(404);
    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . filesize($file));
    readfile($file);
} elseif ($method === 'DELETE') {
    if (is_file($file) && !unlink($file)) fail_request(500);
    http_response_code(204);
} else {
    header('Allow: PUT, GET, DELETE');
    fail_request(405);
}
