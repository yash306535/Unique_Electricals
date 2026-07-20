const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

// The exported web build ships as an extraResource (a verbatim copy outside
// the asar). It cannot live inside the asar: Expo emits icon fonts under
// web/assets/node_modules/@expo/vector-icons/..., and electron-builder strips
// any `node_modules` path from the app bundle — which silently removed every
// icon font from the packaged app.
const WEB_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, 'web');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

// The Expo web export references assets with absolute paths (e.g. /_expo/...),
// which do not resolve under the file:// protocol. Serving the exported files
// over a local HTTP server makes those absolute paths work correctly.
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';

      const filePath = path.join(WEB_DIR, path.normalize(urlPath));
      // Prevent path traversal outside the web directory.
      if (!filePath.startsWith(WEB_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // Only fall back to index.html for navigation requests (no file
          // extension). A missing *asset* must 404 — otherwise fonts/scripts
          // silently receive HTML, which shows up as missing icons.
          if (path.extname(filePath)) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          fs.readFile(path.join(WEB_DIR, 'index.html'), (e2, d2) => {
            if (e2) {
              res.writeHead(404);
              res.end('Not found');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(d2);
          });
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

let mainWindow;

async function createWindow() {
  const port = await startServer();

  const origin = `http://127.0.0.1:${port}`;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Unique Electricals',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(origin);

  // Open only *external* origins in the system browser. Same-origin and
  // about:blank/blob/data must stay in-app — the challan PDF prints through
  // an in-page frame and would break if we denied it here.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isExternal =
      /^https?:\/\//i.test(url) && !url.startsWith(origin);
    if (isExternal) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
