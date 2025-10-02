// routes/api.js - UPDATED

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const appointmentController = require('../controllers/appointmentController'); 
const recordController = require('../controllers/recordController'); // <--- NEW IMPORT
const { verifyToken } = require('../src/authMiddleware'); // Assuming authMiddleware is setup

// --- PUBLIC ROUTES (Authentication) ---

router.post('/users', userController.addUser);
router.post('/login', userController.login);

// --- PROTECTED ROUTES (Requires JWT) ---

// User Management (Protected)
router.get('/users', verifyToken, userController.getAllUsers);

// APPOINTMENTS ROUTES (Protected)
router.post('/appointments', verifyToken, appointmentController.createAppointment);
router.get('/appointments', verifyToken, appointmentController.getAppointments);

// MEDICAL RECORDS ROUTES <--- NEW ROUTES
router.post('/records', verifyToken, recordController.createRecord);
router.get('/records', verifyToken, recordController.getRecords);
router.put('/records/:id', verifyToken, recordController.updateRecord);


module.exports = router;