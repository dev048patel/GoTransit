/**
 * @file server.ts
 * @description Entry point for the Express Backend Server.
 * @purpose Initializes the App, sets up middleware (CORS, JSON), and mounts routes.
 */
import dotenv from 'dotenv';
// Load environment variables from .env.local (only needed locally; Railway sets vars directly)
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors'; // Cross Origin Resource Sharing : Allow cross-origin requests (Frontend -> Backend) like React -> Node.js ( Port 3000 -> Port 3001)
import transitRoutes from './controllers/routes/transit.routes';
import analyticsRoutes from './controllers/routes/analytics.routes';
import featureRoutes from './controllers/routes/feature.routes';

const app = express();
const port = Number(process.env.PORT) || 3001; // Railway assigns PORT dynamically

// Allow only specific origins to access the backend
// Access-Control-Allow-Origin : Allow this domain to access our API
const allowedOrigins = [
    'https://www.gotransitregina.ca',
    'https://gotransitregina.ca',
    'https://gotransit-production.up.railway.app', // Railway deployment
    'http://localhost:3000', // Vite dev (npm run start)
    'http://localhost:5173', // Vite dev (npm run dev)
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));


// Middleware

app.use(express.json()); // Parse incoming JSON request bodies

// Mount Routes
// Usage: All transit-related endpoints will start with /api
app.use('/api', transitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/features', featureRoutes);

// Health Check Endpoint
app.get('/api/status', (req, res) => {
    res.json({ message: 'Backend is running!', status: 'OK' });
});

// Start Server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});

export default app;
