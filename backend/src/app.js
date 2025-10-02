// backend/src/app.js - FINAL CORRECTED PATH

const express = require('express');
const cors = require('cors'); 
const app = express();
// Correct the path: go up one level from src/ to backend/, then into routes/
const apiRouter = require('../routes/api'); // <--- CORRECTED PATH: '../routes/api'

// Configure CORS to allow access from the frontend
app.use(cors());

app.use(express.json()); // Parse JSON bodies
app.use('/api', apiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});