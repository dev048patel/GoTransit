/*
This is Frontend part. Rule and Setting of MAO
1. Map defualt settings
2. Type definitions
3. Constants(Model)
*/
// import mapStyles from '../mapStyles';

// Type Definitions (ensures data consistency) 
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

export interface MapRestriction {
  latLngBounds: MapBounds;
  strictBounds: boolean;
}

export interface MapOptions {
  styles?: any[];
  disableDefaultUI: boolean;
  zoomControl: boolean;
  restriction?: MapRestriction;
}

// The Model Object
export const MapModel = {
  // Default Center (Regina)
  center: {
    lat: 50.44521,
    lng: -104.618896,
  } as Coordinates,

  // Configuration Options passed to Google Maps
  options: {
    // styles: mapStyles,
    disableDefaultUI: true,
    zoomControl: true,
    restriction: {
      latLngBounds: {
        north: 50.53,
        south: 50.36,
        west: -104.81,
        east: -104.36,
      },
      strictBounds: true, // Prevents user from panning outside Regina
    },
  } as MapOptions,

  // Default Zoom Level
  defaultZoom: 11,

  // CSS Styles for the map container
  containerStyle: {
    width: '100vw',
    height: '100vh',
  } as React.CSSProperties,

  libraries: ['places'] as ("places" | "drawing" | "geometry" | "localContext" | "visualization")[],
};
