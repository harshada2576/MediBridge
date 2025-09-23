const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes'); // if you have routes
const db = require('../database/db'); // SQLite connection

app.use(express.json());
app.use('/api/users', userRoutes); // example route

module.exports = app;
