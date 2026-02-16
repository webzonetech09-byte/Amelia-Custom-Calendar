const fs = require('fs');
const path = require('path');

const CONFIG = {
    liveUrl: 'https://hypnova.ch/stargazer',
    secretKey: 'YOUR_SUPER_SECRET_KEY_12345',
    // REMOVED "(10)" from the URL below:
    helperUrl: 'http://localhost/therapist-booking/includes/tb-sync-helper.php'
};

// Get the file from VS Code "Run on Save"
const fullSavedPath = process.argv[2];
if (!fullSavedPath) process.exit(1);

// Calculate relative path for the helper
// This converts "E:\laragon\www\therapist-booking\includes\logger.php" -> "includes/logger.php"
const projectRoot = 'E:\\laragon\\www\\therapist-booking';
let relativePath = fullSavedPath.replace(projectRoot, '').replace(/\\/g, '/');
if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);

async function runSync() {
    try {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 🔄 Syncing: ${relativePath}`);

        // 1. Fetch from Local Helper (Just like your DevTools does)
        const helperParams = new URLSearchParams({ action: 'read', file: relativePath });
        const helperFullUrl = `${CONFIG.helperUrl}?${helperParams}`;
        
        const fileResponse = await fetch(helperFullUrl);
        if (!fileResponse.ok) {
            console.error(`   ❌ Local Helper Error: ${fileResponse.status}`);
            return;
        }
        
        const fileContent = await fileResponse.text();

        // 2. Prepare Upload (Node.js version of btoa)
        const base64Content = Buffer.from(fileContent, 'utf-8').toString('base64');
        
        const url = `${CONFIG.liveUrl}/wp-json/tbsync/v1/upload`;
        const data = {
            file_path: relativePath,
            content: base64Content
        };

        // 3. Send to Live Server
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
            console.log(`   ✅ SUCCESS!`);
            console.log(`   📍 Server Path: ${result.full_path}`);
        } else {
            const errorText = await response.text();
            console.error(`   ❌ Failed: ${response.status}`);
            console.error(`   💬 Response: ${errorText}`);
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    }
}

runSync();