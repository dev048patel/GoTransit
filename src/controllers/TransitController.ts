/*
This file is Backend Part, where all the logic is implemented. ( Answer API calls )
1. Receive HTTP requests from the client
2. Call the appropriate service layer
3. Return the response to the client ( JSON response)
 */
import { Request, Response } from 'express';
import { TransitService } from '../services/TransitService';

// Initialize the Service
const transitService = new TransitService();

// getRoutes : handle the request to get all routes.
// It will call the service layer and return the response to the client.
export const getRoutes = async (req: Request, res: Response) => {
    try {
        const routes = await transitService.getAvailableRoutes();
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
};

// getRouteById : handle the request to get a single route.
// It will call the service layer and return the response to the client.
export const getRouteById = async (req: Request, res: Response) => {
    try {
        const route = await transitService.getRouteDetails(req.params.id);
        if (route) {
            res.json(route);
        } else {
            res.status(404).json({ error: 'Route not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch route' });
    }
};
