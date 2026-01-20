/**
 * @file transit.routes.ts
 * @description Defines the API endpoints for Transit resources.
 * @purpose Maps HTTP methods and URLs to specific Controller functions.
 */
import { Router } from 'express';
import * as TransitController from '../controllers/TransitController';

const router = Router();

/**
 * @route GET /api/routes
 * @desc Fetch all available transit routes
 * @access Public
 */
router.get('/routes', TransitController.getRoutes);

/**
 * @route GET /api/routes/:id
 * @desc Fetch details for a specific route by ID
 * @access Public
 */
router.get('/routes/:id', TransitController.getRouteById);

export default router;
