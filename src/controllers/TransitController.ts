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
import { SecurityEventService } from '../models/services/SecurityEventService';
import { clientIp, isText, reject } from './middleware/security';

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
        // The feed (TransitLive) failed, not us: the map keeps showing its last positions
        res.status(502).json({ error: 'Failed to fetch live buses' });
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

// getStopPredictions : fetch all predicted arrivals for a specific stop.
// Single call to TransitLive with routes=all&lim=100 to get full day schedule.
export const getStopPredictions = async (req: Request, res: Response) => {
    try {
        if (!/^\d{1,6}$/.test(req.params.stopId)) { reject(req, res, 'Invalid stop number'); return; }
        const predictions = await StopPredictionService.getPredictions(req.params.stopId);
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stop predictions' });
    }
};

// updateRoute : handle PATCH to rename or hide/show a route.
export const updateRoute = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { route_name, hidden } = req.body ?? {};
        if (!/^[A-Za-z0-9_-]{1,20}$/.test(id)) { reject(req, res, 'Invalid route'); return; }
        if (route_name !== undefined && !isText(route_name, 80)) { reject(req, res, 'Invalid route name'); return; }
        if (hidden !== undefined && typeof hidden !== 'boolean') { reject(req, res, 'Invalid visibility'); return; }

        const data: Record<string, any> = {};
        if (route_name !== undefined) data.route_name = route_name;
        if (hidden !== undefined) data.hidden = hidden;

        setOverride(id, data);
        void SecurityEventService.record({ type: 'route_changed', severity: 'info', ip: clientIp(req), userId: req.user?.id, path: req.originalUrl,
            message: `Admin changed route ${id}: ${JSON.stringify(data)}` });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update route' });
    }
};
