// Local development entry point.
// In production (Vercel), api/index.js is used instead.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const express = require('express');
const app = require('./app');

// Serve built frontend for single-server local testing (npm start)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Roadmap app running at http://127.0.0.1:${PORT}`);
  if (!process.env.SYNAPSE_AUTH_TOKEN) {
    console.warn('WARNING: SYNAPSE_AUTH_TOKEN is not set. API calls will fail.');
  }
});
