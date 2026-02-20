import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, 'data/users.json');

/* ── Dev-only Vite plugin: persist user registry to disk ─────────── */
function devStorePlugin() {
    return {
        name: 'gotransit-dev-store',
        configureServer(server: any) {
            // Ensure data/ dir and file exist on startup
            fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
            if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

            server.middlewares.use('/dev-api/users', (req: any, res: any, next: any) => {
                // CORS preflight
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                if (req.method === 'OPTIONS') {
                    res.statusCode = 204;
                    res.end();
                    return;
                }

                // GET — read all users from disk
                if (req.method === 'GET') {
                    res.setHeader('Content-Type', 'application/json');
                    try {
                        res.end(fs.readFileSync(DATA_FILE, 'utf-8'));
                    } catch {
                        res.end('[]');
                    }
                    return;
                }

                // POST — overwrite users file with request body
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            // Validate JSON before writing
                            JSON.parse(body);
                            fs.writeFileSync(DATA_FILE, body);
                            res.statusCode = 200;
                        } catch {
                            res.statusCode = 400;
                        }
                        res.end();
                    });
                    return;
                }

                next();
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), devStorePlugin()],
    server: {
        open: true,
        port: 3000,
    },
    build: {
        outDir: 'build',
    },
});
