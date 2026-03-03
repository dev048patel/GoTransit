/*
    transit.routes.ts
    Defines the API endpoints for Transit resources.
    Maps HTTP methods and URLs to specific Controller functions.
*/
import { Router } from 'express';
import * as TransitController from '../controllers/TransitController';

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

/*
 -> @route GET /api/stop-predictions/:stopId
 -> Fetch predicted bus arrival times for a specific stop
 -> @access Public
 */
router.get('/stop-predictions/:stopId', TransitController.getStopPredictions);


export default router;
