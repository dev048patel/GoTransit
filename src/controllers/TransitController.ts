/*
This file is Backend Part, where all the logic is implemented. ( Answer API calls )
1. Receive HTTP requests from the client
2. Call the appropriate service layer
3. Return the response to the client ( JSON response)
 */
import { Request, Response } from 'express';
import { TransitService } from '../models/services/TransitService';
import { RealTimeService } from '../models/services/RealTimeService';
import { StopPredictionService } from '../models/services/StopPredictionService';
import { setOverride } from '../models/services/routeOverrides';

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

// getStops : handle the request to get all stops.
export const getStops = async (req: Request, res: Response) => {
    try {
        const stops = await transitService.getStops();
        res.json(stops);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stops' });
    }
};

// getColors : handle the request to get all route colors.
export const getColors = async (req: Request, res: Response) => {
    try {
        const colors = await transitService.getColors();
        res.json(colors);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch colors' });
    }
};

// getLiveBuses : handle the request to get live bus positions.
export const getLiveBuses = async (req: Request, res: Response) => {
    try {
        const liveData = await RealTimeService.getLiveBuses();
        res.json(liveData);
    } catch (error) {
        console.error("Controller Error fetching live buses:", error);
        res.status(500).json({ error: 'Failed to fetch live buses' });
    }
};

// getAdminRoutes : fetch all routes with override data merged in for admin panel.
export const getAdminRoutes = async (req: Request, res: Response) => {
    try {
        const adminRoutes = await transitService.getAllRoutesAdmin();
        res.json(adminRoutes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin routes' });
    }
};

// getStopPredictions : fetch real-time predicted arrivals for a specific stop.
// Accepts optional query params: ?limit=N, ?routes=4,18,22 (comma-separated route IDs)
// When routes are provided, fetches per-route in parallel for more complete data.
export const getStopPredictions = async (req: Request, res: Response) => {
    try {
        const limitParam = parseInt(req.query.limit as string);
        const routeIdParam = req.query.route_id as string;
        const routesParam = req.query.routes as string;

        // Determine limit: explicit param > time-based default
        let limit: number;
        if (!isNaN(limitParam) && limitParam > 0) {
            limit = Math.min(limitParam, 30);
        } else {
            const hour = new Date().getHours();
            const isPeak = (hour >= 7 && hour <= 9) || (hour >= 15 && hour <= 18);
            limit = isPeak ? 20 : 10;
        }

        let predictions: any[];
        if (routeIdParam) {
            // Single route_id — direct pass-through to TransitLive API
            predictions = await StopPredictionService.getPredictions(
                req.params.stopId, { limit, routeId: routeIdParam }
            );
        } else if (routesParam) {
            // Comma-separated routes — fetch per-route in parallel
            const routeIds = routesParam.split(',').map(r => r.trim()).filter(Boolean);
            predictions = await StopPredictionService.getPredictionsAllRoutes(
                req.params.stopId, routeIds, limit
            );
        } else {
            predictions = await StopPredictionService.getPredictions(
                req.params.stopId, { limit }
            );
        }

        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stop predictions' });
    }
};

// updateRoute : handle PATCH to rename or hide/show a route.
export const updateRoute = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { route_name, hidden } = req.body;

        const data: Record<string, any> = {};
        if (route_name !== undefined) data.route_name = route_name;
        if (hidden !== undefined) data.hidden = hidden;

        setOverride(id, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update route' });
    }
};
