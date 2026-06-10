// Vercel serverless entry point.
// Environment variables are injected by Vercel — no dotenv needed here.
const app = require('../backend/app');
module.exports = app;
