/*
This file is Backend Part, where all the logic is implemented. ( Answer API calls )
1. Receive HTTP requests from the client
2. Call the appropriate service layer
3. Return the response to the client ( JSON response)
 */
import { Request, Response } from 'express';
import { TransitService } from '../services/TransitService';
import { RealTimeService } from '../services/RealTimeService';
import { StopPredictionService } from '../services/StopPredictionService';
import { getOverrides, setOverride } from '../services/routeOverrides';

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
        const routes = await transitService.getAvailableRoutes();
        const overrides = getOverrides();

        const adminRoutes = routes.map((route: any) => {
            const override = overrides[route.id] || {};
            return {
                ...route,
                route_name: override.route_name ?? route.route_name,
                status: override.hidden ? 'Hidden' : 'Active',
                last_updated: override.route_name || override.hidden !== undefined ? 'Admin Override' : route.last_updated,
            };
        });

        res.json(adminRoutes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin routes' });
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
