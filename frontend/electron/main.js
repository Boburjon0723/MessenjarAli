const { app, BrowserWindow, protocol, net, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

// Register 'app' as a standard and secure scheme
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true } }
]);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Essential for local resource loading in some cases
            preload: path.join(__dirname, 'preload.js'),
        },
        backgroundColor: '#050505',
    });

    if (isDev) {
        win.loadURL('http://localhost:3000');
        win.webContents.openDevTools();
    } else {
        // Use packaged Next.js build inside the app
        win.loadURL('app://./index.html');
    }

    if (!isDev) {
        // Non-blocking update tekshiruvi
        setTimeout(() => {
            checkForUpdates().catch(err => {
                console.error('Desktop update check failed:', err);
            });
        }, 3000);
    }
}

app.whenReady().then(() => {
    // Handle the 'app://' protocol
    protocol.handle('app', async (request) => {
        let url = new URL(request.url);
        let pathname = url.pathname;

        // Remove leading dots/slashes to normalize
        let normalizedPath = pathname;
        if (normalizedPath.startsWith('//')) normalizedPath = normalizedPath.slice(2);
        if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.slice(2);
        if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.slice(1);

        // Default to index.html
        if (normalizedPath === '' || normalizedPath === '/') {
            normalizedPath = 'index.html';
        }

        // Check if it's a directory-like route (no extension)
        // Next.js uses trailingslashes/directories for pages
        if (!path.extname(normalizedPath) && !normalizedPath.endsWith('/')) {
            normalizedPath += '/index.html';
        } else if (normalizedPath.endsWith('/')) {
            normalizedPath += 'index.html';
        }

        const fullPath = path.join(__dirname, '../out', normalizedPath);

        try {
            return net.fetch(pathToFileURL(fullPath).toString());
        } catch (error) {
            console.error(`Protocol error for ${request.url}:`, error);
            // Fallback to main index.html for SPA routing if file not found
            const indexPath = path.join(__dirname, '../out/index.html');
            return net.fetch(pathToFileURL(indexPath).toString());
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

async function checkForUpdates() {
    const currentVersion = app.getVersion();
    const url = `${BACKEND_URL.replace(/\/+$/, '')}/api/desktop/version`;

    try {
        const response = await net.fetch(url);
        if (!response.ok) {
            console.warn('Desktop update check failed with status:', response.status);
            return;
        }
        const data = await response.json();
        const latestVersion = data?.version;
        const downloadUrl = data?.url;

        if (!latestVersion || !downloadUrl) {
            return;
        }

        if (isVersionNewer(latestVersion, currentVersion)) {
            const result = await dialog.showMessageBox({
                type: 'info',
                buttons: ['Hozir yangilash', 'Keyin'],
                defaultId: 0,
                cancelId: 1,
                title: 'ExpertLine Desktop yangilanishi',
                message: `Yangi versiya topildi: ${latestVersion} (hozirgi: ${currentVersion}).`,
                detail: 'Yangilash paytida dastur qayta ishga tushadi.',
            });

            if (result.response === 0) {
                await downloadAndRunInstaller(downloadUrl);
            }
        }
    } catch (err) {
        console.error('Error while checking desktop updates:', err);
    }
}

function isVersionNewer(latest, current) {
    const latestParts = String(latest).split('.').map(n => parseInt(n, 10) || 0);
    const currentParts = String(current).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(latestParts.length, currentParts.length);

    for (let i = 0; i < len; i++) {
        const l = latestParts[i] || 0;
        const c = currentParts[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

async function downloadAndRunInstaller(downloadUrl) {
    const tempDir = os.tmpdir();
    const targetPath = path.join(tempDir, 'MaliDesktopSetup-latest.exe');

    try {
        const response = await net.fetch(downloadUrl);
        if (!response.ok) {
            await dialog.showErrorBox('Yuklab olishda xatolik', `Faylni yuklab bo'lmadi. Status: ${response.status}`);
            return;
        }

        const fileStream = fs.createWriteStream(targetPath);
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        spawn(targetPath, [], {
            detached: true,
            stdio: 'ignore',
        }).unref();

        app.quit();
    } catch (err) {
        console.error('Failed to download or run installer:', err);
        await dialog.showErrorBox('Yuklab olishda xatolik', 'Yangilash faylini yuklab olish yoki ishga tushirishda xatolik yuz berdi.');
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
