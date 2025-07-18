const express = require('express');
const cors = require('cors');
require('dotenv').config();


// Route imports
const path = require('path');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const port = process.env.PORT || 3001;

// Routes
app.use(cors());

// Stripe webhook route FIRST, with raw body
app.use('/api/payment/webhook', express.raw({type: 'application/json'}));

// All other routes use JSON body parser
app.use(express.json());
app.use('/api/payment', paymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// For placeholder dragonpayment
app.use(express.static(path.join(__dirname, 'public')));

// At the bottom of server.js (after all routes):
app.use((err, req, res, next) => {
  console.error("🔴  Server error:", err.stack || err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server running on port ${port}`);
});
