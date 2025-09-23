const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Example route to get all users
router.get('/users', userController.getAllUsers);

// Example route to add a user
router.post('/users', userController.addUser);

module.exports = router;
