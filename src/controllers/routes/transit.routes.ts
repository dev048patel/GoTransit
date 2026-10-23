/*
    transit.routes.ts
    Defines the API endpoints for Transit resources.
    Maps HTTP methods and URLs to specific Controller functions.
*/
import { Router } from 'express';
import * as TransitController from '../TransitController';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { rateLimit } from '../middleware/security';

const router = Router();

/*
  route = GET /api/routes
  Fetch all available transit routes
  
 */
router.get('/routes', TransitController.getRoutes);

/*
  route = GET /api/routes/:id
  Fetch details for a specific route by ID
  
 */
router.get('/routes/:id', TransitController.getRouteById);

/*
 route = GET /api/stops
 Fetch all available transit stops
 
 */
router.get('/stops', TransitController.getStops);

/*
 route = GET /api/colors
 Fetch all available transit route colors
 
 */
router.get('/colors', TransitController.getColors);

/*
 route = GET /api/live
 Fetch live bus positions
 
 */
router.get('/live', TransitController.getLiveBuses);

/**
 * GET /api/plan/arrive-by?from=lat,lng&to=lat,lng&time=HH:MM
 * The latest scheduled trip that arrives by `time` (Regina time; a time already passed means tomorrow).
 * Limited per address: each answer runs the timetable planner.
 */
router.get('/plan/arrive-by', rateLimit('plan-arrive-by', 30), TransitController.planArriveBy);

/*
 route = GET /api/stop-predictions/:stopId
 Fetch real-time predicted bus arrivals for a specific stop
 */
router.get('/stop-predictions/:stopId', rateLimit('stop-predictions', 600), TransitController.getStopPredictions);

/*
 route = GET /api/admin/routes
 Fetch all routes for the admin panel (includes hidden routes + status)
 */
router.get('/admin/routes', requireAuth, requireAdmin, TransitController.getAdminRoutes);

/*
 route = PATCH /api/admin/routes/:id
 Update a route's name or visibility (admin only)
 */
router.patch('/admin/routes/:id', requireAuth, requireAdmin, TransitController.updateRoute);


export default router;
