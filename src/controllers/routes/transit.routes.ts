/*
    transit.routes.ts
    Defines the API endpoints for Transit resources.
    Maps HTTP methods and URLs to specific Controller functions.
*/
import { Router } from 'express';
import * as TransitController from '../TransitController';

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

 /* route = GET /api/admin/routes
 Fetch all routes for the admin panel (includes hidden routes + status)
 */
router.get('/admin/routes', TransitController.getAdminRoutes);

/*
 route = PATCH /api/admin/routes/:id
 Update a route's name or visibility (admin only)
 */
router.patch('/admin/routes/:id', TransitController.updateRoute);


export default router;
