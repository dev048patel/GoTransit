/*
    transit.routes.ts
    Defines the API endpoints for Transit resources.
    Maps HTTP methods and URLs to specific Controller functions.
*/
import { Router } from 'express';
import * as TransitController from '../controllers/TransitController';

const router = Router();

/*
  -> @route GET /api/routes
  -> Fetch all available transit routes
  -> @access Public
 */
router.get('/routes', TransitController.getRoutes);

/*
  -> @route GET /api/routes/:id
  -> Fetch details for a specific route by ID
  -> @access Public
 */
router.get('/routes/:id', TransitController.getRouteById);

/*
 -> @route GET /api/stops
 -> Fetch all available transit stops
 -> @access Public
 */
router.get('/stops', TransitController.getStops);

/*
 -> @route GET /api/colors
 -> Fetch all available transit route colors
 -> @access Public
 */
router.get('/colors', TransitController.getColors);

/*
 -> @route GET /api/live
 -> Fetch live bus positions
 -> @access Public
 */
router.get('/live', TransitController.getLiveBuses);


export default router;
