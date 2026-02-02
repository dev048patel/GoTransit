import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        // Open the browser on server start
        open: true,
        // Default port for Vite is 5173, but we can stick to 3000 if preferred,
        // though usually better to let it be standard or change if needed.
        // Let's keep it standard for now or 3000 which CRA users are used to.
        port: 3000,
    },
    build: {
        outDir: 'build', // CRA outputs to 'build', Vite defaults to 'dist'. Changing to 'build' for compatibility.
    },
});
