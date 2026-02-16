<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$pluginDir = dirname(__DIR__); // therapic-booking folder

// Debug mode
error_log("TB Sync Helper - Action: $action");
error_log("TB Sync Helper - Plugin Dir: $pluginDir");

// Read single file
if ($action === 'read') {
    $file = $_GET['file'] ?? '';
    $fullPath = $pluginDir . '/' . ltrim($file, '/');
    
    error_log("TB Sync Helper - Requested file: $file");
    error_log("TB Sync Helper - Full path: $fullPath");
    
    // Check if file exists
    if (!file_exists($fullPath)) {
        http_response_code(404);
        die(json_encode(['error' => 'File not found', 'path' => $fullPath]));
    }
    
    // Check if within plugin directory
    if (strpos(realpath($fullPath), realpath($pluginDir)) !== 0) {
        http_response_code(403);
        die(json_encode(['error' => 'Access denied', 'path' => $fullPath]));
    }
    
    // Return file content as plain text
    header('Content-Type: text/plain');
    die(file_get_contents($fullPath));
}

// List files in folder
if ($action === 'list') {
    $dir = $_GET['dir'] ?? '';
    $fullPath = $pluginDir . '/' . ltrim($dir, '/');
    
    error_log("TB Sync Helper - Requested dir: $dir");
    error_log("TB Sync Helper - Full path: $fullPath");
    
    if (!is_dir($fullPath)) {
        http_response_code(404);
        die(json_encode(['error' => 'Directory not found', 'path' => $fullPath]));
    }
    
    if (strpos(realpath($fullPath), realpath($pluginDir)) !== 0) {
        http_response_code(403);
        die(json_encode(['error' => 'Access denied']));
    }
    
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($fullPath),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    $fileList = [];
    foreach ($files as $file) {
        if ($file->isFile()) {
            // FIXED: Return relative path from plugin root
            $absolutePath = str_replace('\\', '/', $file->getPathname());
            $pluginDirNormalized = str_replace('\\', '/', $pluginDir);
            $relativePath = str_replace($pluginDirNormalized . '/', '', $absolutePath);
            
            $fileList[] = $relativePath;
        }
    }
    
    die(json_encode(['files' => $fileList, 'count' => count($fileList)]));
}

http_response_code(400);
die(json_encode(['error' => 'Invalid action', 'received' => $action]));