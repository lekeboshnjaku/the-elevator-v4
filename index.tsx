
import "./upload/verify/front-zip/front/styles.bundle.css";
import "./upload/verify/front-zip/front/styles.css";
import "./styles.css";

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import IntroGate from './src/IntroGate';
import { audioService } from './src/services/audioService';

/* ------------------------------------------------------------------ */
/*  Unlock Web-Audio on first user gesture (click / keydown) early    */
/* ------------------------------------------------------------------ */
audioService.initAudioUnlock();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <IntroGate>
      <App />
    </IntroGate>
  </React.StrictMode>
);