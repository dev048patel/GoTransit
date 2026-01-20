/* 
This file is the Frontend Entry Point.
DOM -> This is the HTML page that the browser loads.

*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

const rootElement = document.getElementById('root'); // Here root element is found in DOM
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement); // Here React takes over DOM 
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
