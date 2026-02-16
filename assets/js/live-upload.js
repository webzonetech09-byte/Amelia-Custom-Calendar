// ============================================
// TB SYNC - DevTools File Sync System
// ============================================

const CONFIG = {
    liveUrl: 'https://hypnova.ch/stargazer',
    secretKey: 'YOUR_SUPER_SECRET_KEY_12345',
    // Encode the path properly
    helperUrl: 'http://localhost/therapist-booking(10)/therapist-booking/includes/tb-sync-helper.php'
};

// ============================================
// Core Sync Function
// ============================================
async function tbSync(relativeFilePath, targetPath) {
    try {
        // Properly encode the entire URL
        const helperParams = new URLSearchParams({
            action: 'read',
            file: relativeFilePath
        });
        const helperFullUrl = `${CONFIG.helperUrl}?${helperParams}`;
        
        console.log('Fetching from:', helperFullUrl); // DEBUG
        
        // Read file from local server
        const fileResponse = await fetch(helperFullUrl);
        
        if (!fileResponse.ok) {
            console.error(`Helper returned ${fileResponse.status}`);
            return false;
        }
        
        const fileContent = await fileResponse.text();
        
        console.log(`Read ${fileContent.length} bytes from ${relativeFilePath}`); // DEBUG
        
        // Prepare upload request
        const url = `${CONFIG.liveUrl}/wp-json/tbsync/v1/upload`;
        const data = {
            file_path: targetPath,
            content: btoa(unescape(encodeURIComponent(fileContent))) // Base64 encode
        };
        
        // Send to live server
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Key': CONFIG.secretKey
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✓ Synced: ${relativeFilePath} → ${targetPath}`);
            console.log(`  Server path: ${result.full_path || 'N/A'}`);
            return true;
        } else {
            const error = await response.text();
            console.error(`✗ Failed: ${relativeFilePath} (HTTP ${response.status})`);
            console.error('Response:', error);
            return false;
        }
    } catch (error) {
        console.error(`✗ Error syncing ${relativeFilePath}:`, error);
        console.error('Stack:', error.stack); // More debug info
        return false;
    }
}

// ============================================
// Sync Multiple Files
// ============================================
async function tbSyncMultiple(files) {
    console.log(`Starting sync of ${files.length} files...`);
    
    for (const file of files) {
        await tbSync(file.source, file.target);
    }
    
    console.log('✓ All files synced!');
}

// ============================================
// Sync Entire Folder
// ============================================
async function tbSyncFolder(relativeDir) {
    try {
        // Properly encode parameters
        const helperParams = new URLSearchParams({
            action: 'list',
            dir: relativeDir
        });
        const helperFullUrl = `${CONFIG.helperUrl}?${helperParams}`;
        
        console.log('Listing from:', helperFullUrl); // DEBUG
        
        // Get file list from local helper
        const listResponse = await fetch(helperFullUrl);
        
        if (!listResponse.ok) {
            console.error(`Helper returned ${listResponse.status}`);
            return false;
        }
        
        const response = await listResponse.json();
        
        // Access files array correctly
        const files = response.files || [];
        
        console.log(`Found ${files.length} files to sync in ${relativeDir}...`);
        
        if (files.length === 0) {
            console.warn('⚠️ No files found in directory');
            return;
        }
        
        // Sync each file
        for (const file of files) {
            await tbSync(file, file);
        }
        
        console.log('✓ Folder sync complete!');
    } catch (error) {
        console.error('✗ Folder sync failed:', error);
        console.error('Stack:', error.stack);
    }
}

// ============================================
// Quick Sync Shortcuts
// ============================================
const quickSync = {
    // Sync single logger file
    logger: () => tbSync('includes/logger.php', 'includes/logger.php'),
    
    // Sync entire includes folder
    includesFolder: () => tbSyncFolder('includes'),
    
    // Sync assets folder
    assetsFolder: () => tbSyncFolder('assets'),
    
    // Sync custom file (pass relative path from plugin root)
    custom: (file) => tbSync(file, file),
    
    // Sync custom folder
    folder: (dir) => tbSyncFolder(dir)
};

// ============================================
// Usage Examples
// ============================================
console.log('🚀 tbSync loaded! Quick commands:');
console.log('  quickSync.logger()          - Sync logger.php');
console.log('  quickSync.includesFolder()  - Sync includes/ folder');
console.log('  quickSync.assetsFolder()    - Sync assets/ folder');
console.log('  quickSync.custom("admin/settings.php") - Sync custom file');
console.log('  quickSync.folder("admin")   - Sync custom folder');
console.log('  tbSync("file.php", "file.php") - Manual sync');