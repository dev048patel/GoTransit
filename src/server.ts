/**
 * @file server.ts
 * @description Entry point for the Express Backend Server.
 * @purpose Initializes the App, sets up middleware (CORS, JSON), and mounts routes.
 */
import dotenv from 'dotenv';
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors'; // Cross Origin Resource Sharing : Allow cross-origin requests (Frontend -> Backend) like React -> Node.js ( Port 3000 -> Port 3001)
import transitRoutes from './routes/transit.routes';

const app = express();
const port = 3001;

// Middleware
app.use(cors()); // Allow cross-origin requests (Frontend -> Backend)
app.use(express.json()); // Parse incoming JSON request bodies

// Mount Routes
// Usage: All transit-related endpoints will start with /api
app.use('/api', transitRoutes);

// Health Check Endpoint
app.get('/api/status', (req, res) => {
    res.json({ message: 'Backend is running!', status: 'OK' });
});

// Start Server strictly if this file is executed directly (not imported)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

export default app;
