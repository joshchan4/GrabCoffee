const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Routes

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
