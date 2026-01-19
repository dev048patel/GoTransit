import React from 'react'
import './App.css'
import mapStyles from './mapStyles'
// Importing google maps functionalities
import {
  GoogleMap,
  useLoadScript,
} from '@react-google-maps/api'

export function App() {
  const libraries = ['places'] // writing over here avoid rendering this evertime
  // Placing here to avoid rendering
  const mapContainerStyle = {
    width: '100vw',
    height: '100vh',
  }
  // Long and Lat of Reigna
  const center = {
    lat: 50.44521,
    lng: -104.618896,
  }
  //
  const options = {
    styles: mapStyles,
    disableDefaultUI: true, // This will remove the default UI i.e., Street View, View(Satellite/Default)...
    zoomControl: true,
  }

  // Loading Google API key
  const { isLoaded, LoadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  if (LoadError) return 'Error Loading maps'
  if (!isLoaded) return 'Loading Maps '

  return (
    <div>
      <h1 className="Logo">
        GoTransitRegina{" "}
        <span role="img" aria-label="Bus Stop">
          🚏
        </span>
      </h1>
      <Search />
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={10}
        center={center}
        options={options}
      ></GoogleMap>
    </div>
  )
}

function Search(){

}
