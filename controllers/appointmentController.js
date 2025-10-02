// controllers/appointmentController.js

const appointmentModel = require('../models/appointmentModel');

// POST /api/appointments
exports.createAppointment = async (req, res) => {
    try {
        // Assuming patientId is passed in the request body for now, 
        // but should ideally be extracted from the JWT (req.userId).
        const { patientId, doctorId, date, reason } = req.body; 

        if (!patientId || !doctorId || !date || !reason) {
            return res.status(400).json({ error: 'Missing required appointment fields.' });
        }

        const newAppointment = await appointmentModel.addAppointment(
            patientId,
            doctorId,
            date,
            reason
        );

        res.status(201).json({ 
            message: 'Appointment scheduled successfully!', 
            appointment: newAppointment 
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to create appointment: ' + err.message });
    }
};


// GET /api/appointments
exports.getAppointments = async (req, res) => {
    try {
        // Assuming a user ID and role have been attached by the verifyToken middleware
        const userId = req.userId; 
        // In a real app, you fetch the role from the JWT payload or DB lookup
        // For now, let's assume the user sends their role, or we look it up.
        // For demonstration, let's assume Doctor is logging in.
        const role = req.query.role || 'doctor'; 
        
        if (!userId) {
            return res.status(403).json({ error: 'User ID is missing from token.' });
        }

        const appointments = await appointmentModel.getAppointmentsByUser(userId, role);

        res.json(appointments);

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch appointments: ' + err.message });
    }
};