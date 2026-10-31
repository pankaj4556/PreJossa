import React from 'react';
import { createRoot } from 'react-dom/client';
import LandingApp from './LandingApp';

const container = document.getElementById('landing-root');
if (container) {
  const root = createRoot(container);
  root.render(<LandingApp />);
}
