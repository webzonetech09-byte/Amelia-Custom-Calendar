<?php

if (!defined('ABSPATH')) exit;



// For Local file upload and sync to server
function tbSync($sourcePath, $targetPath) {
    // Configuration
    $liveUrl = 'https://hypnova.ch/stargazer';
    $secretKey = 'YOUR_SUPER_SECRET_KEY_12345'; // Same as above
    
    // Read local file
    if (!file_exists($sourcePath)) {
        die("Source file not found: $sourcePath");
    }
    
    $fileContent = file_get_contents($sourcePath);
    
    // Prepare request
    $url = $liveUrl . '/wp-json/tbsync/v1/upload';
    $data = array(
        'file_path' => $targetPath,
        'content' => base64_encode($fileContent)
    );
    
    // Send via cURL
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json',
            'X-Sync-Key: ' . $secretKey
        )
    ));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Output result
    if ($httpCode === 200) {
        echo "✓ Synced: $sourcePath → $targetPath\n";
    } else {
        echo "✗ Failed: $sourcePath (HTTP $httpCode)\n";
        echo "Response: $response\n";
    }
}

// Usage
// tbSync(
//     'D:/laragon/www/therapist-booking/includes/logger.php',
//     'includes/logger.php' // Relative to plugin root
// );

// Sync entire folder
function tbSyncFolder($sourceDir, $targetDir) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($sourceDir),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    foreach ($files as $file) {
        if ($file->isFile()) {
            $sourcePath = $file->getPathname();
            $relativePath = str_replace($sourceDir, '', $sourcePath);
            $targetPath = $targetDir . $relativePath;
            
            tbSync($sourcePath, $targetPath);
        }
    }
}

// Usage
// tbSyncFolder(
//     'D:/laragon/www/therapist-booking/includes/',
//     'includes/'
// );


// == For live server: Add this to your plugin's main file to handle incoming sync requests ==
// =================================================================
// 1. FORCE CORS HEADERS EARLY (The "Nuclear" Fix)
// =================================================================
add_action('init', function() {
    // Only run this logic for our specific sync URL
    if (strpos($_SERVER['REQUEST_URI'], 'tbsync/v1/upload') !== false) {
        
        // Allow ANY origin (localhost, etc.)
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, X-Sync-Key");
        
        // If the browser is just "Checking" (OPTIONS), say YES and stop WordPress.
        // This bypasses all permissions/errors/REST API quirks.
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit();
        }
    }
});

// =================================================================
// 2. REGISTER THE REST ROUTE
// =================================================================
add_action('rest_api_init', function () {
    register_rest_route('tbsync/v1', '/upload', array(
        'methods' => 'POST',
        'callback' => 'tb_sync_handle_upload',
        // Simple permission check (we handled OPTIONS above already)
        'permission_callback' => function($request) {
            $secret_key = 'YOUR_SUPER_SECRET_KEY_12345'; 
            return $request->get_header('X-Sync-Key') === $secret_key;
        }
    ));
});

// =================================================================
// 3. HANDLE THE FILE UPLOAD
// =================================================================
function tb_sync_handle_upload($request) {
    
    // Get Data
    $params = $request->get_json_params();
    $file_path = isset($params['file_path']) ? $params['file_path'] : '';
    $content = isset($params['content']) ? $params['content'] : '';
    
    if (empty($file_path) || empty($content)) {
        return new WP_REST_Response(['error' => 'No data'], 400);
    }

    // Determine Path
    // NOTE: Adjust this logic if you are in a theme vs plugin
    // If this code is in a plugin file:
    $base_dir = dirname(plugin_dir_path(__FILE__)); 
    // If this code is in functions.php of a theme:
    // $base_dir = get_stylesheet_directory(); 

    $file_path = ltrim($file_path, '/');
    $full_path = $base_dir . '/' . $file_path;
    
    // Security: Ensure we aren't writing outside the folder
    if (strpos($full_path, $base_dir) !== 0) {
        return new WP_REST_Response(['error' => 'Security violation'], 403);
    }

    // Create Directory
    $dir = dirname($full_path);
    if (!file_exists($dir)) {
        wp_mkdir_p($dir);
    }

    // Write File
    $decoded = base64_decode($content);
    $written = @file_put_contents($full_path, $decoded);

    if ($written === false) {
        return new WP_REST_Response([
            'error' => 'Write failed. Check permissions.',
            'path' => $full_path
        ], 500);
    }

    return new WP_REST_Response([
        'success' => true, 
        'path' => $file_path
    ], 200);
}