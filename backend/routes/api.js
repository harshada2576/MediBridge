// routes/api.js - UPDATED

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const appointmentController = require('../controllers/appointmentController'); 
const recordController = require('../controllers/recordController'); 
const { verifyToken } = require('../src/authMiddleware'); 

// --- PUBLIC ROUTES (Authentication) ---
router.post('/users', userController.addUser);
router.post('/login', userController.login);

// --- PROTECTED ROUTES (Requires JWT) ---

// APPOINTMENTS ROUTES (Full CRUD)
router.post('/appointments', verifyToken, appointmentController.createAppointment);
router.get('/appointments', verifyToken, appointmentController.getAppointments);
router.put('/appointments/:id', verifyToken, appointmentController.updateAppointment);
router.delete('/appointments/:id', verifyToken, appointmentController.deleteAppointment);


// MEDICAL RECORDS ROUTES (Full CRUD)
router.post('/records', verifyToken, recordController.createRecord);
router.get('/records', verifyToken, recordController.getRecords);
router.put('/records/:id', verifyToken, recordController.updateRecord);
router.delete('/records/:id', verifyToken, recordController.deleteRecord); // <--- NEW DELETE ROUTE


// User Management (Protected)
router.get('/users', verifyToken, userController.getAllUsers);

module.exports = router;