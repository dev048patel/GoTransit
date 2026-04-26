/**
 * MapPage.tsx — GoTransit Regina
 *
 * Extracted from App.tsx so it can be React.lazy()-loaded.
 * This keeps the heavy map bundle (Google Maps + transitShapes.json)
 * out of the initial download for landing page visitors.
 */

import React from 'react';
import { MapView } from './MapView';
import { useMapController } from '../controllers/useMapController';
import DepartureReminderBanner from './DepartureReminderBanner';

export default function MapPage() {
    const {
        isLoaded, loadError, center, setCenter, options, containerStyle,
        zoom, setZoom, stops, routes, selectedRoute, setSelectedRoute,
        routePaths, liveBuses, handlePlaceSelect, selectedPlaceMarker,
        setSelectedPlaceMarker, currentZoom, onZoomChanged, userLocation,
    } = useMapController();

    return (
        <>
        <DepartureReminderBanner />
        <MapView
            isLoaded={isLoaded}
            loadError={loadError}
            center={center}
            setCenter={setCenter}
            options={options}
            containerStyle={containerStyle}
            zoom={zoom}
            setZoom={setZoom}
            stops={stops}
            routes={routes}
            selectedRoute={selectedRoute}
            setSelectedRoute={setSelectedRoute}
            routePaths={routePaths}
            liveBuses={liveBuses}
            handlePlaceSelect={handlePlaceSelect}
            selectedPlaceMarker={selectedPlaceMarker}
            setSelectedPlaceMarker={setSelectedPlaceMarker}
            currentZoom={currentZoom}
            onZoomChanged={onZoomChanged}
            userLocation={userLocation}
        />
        </>
    );
}
