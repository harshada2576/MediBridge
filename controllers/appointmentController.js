// controllers/appointmentController.js

const appointmentModel = require('../models/appointmentModel');

// POST /api/appointments (existing)
exports.createAppointment = async (req, res) => {
    // ... (existing implementation) ...
};


// GET /api/appointments (existing)
exports.getAppointments = async (req, res) => {
    // ... (existing implementation) ...
};

// --- NEW FUNCTION: Update Appointment ---
// PUT /api/appointments/:id
exports.updateAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.userId;     // From JWT
        const userRole = req.userRole; // From JWT
        const updates = req.body;

        // 1. Authorization Check: Ensure the user owns the appointment or is the assigned doctor/admin
        const appointment = await appointmentModel.getAppointmentById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        // Authorization logic: Patient OR assigned doctor OR Admin can modify
        const isAuthorized = (appointment.patient_id === userId) || (appointment.doctor_id === userId) || (userRole === 'admin');

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to modify this appointment.' });
        }

        // 2. Perform Update
        const updatedAppointment = await appointmentModel.updateAppointment(appointmentId, updates);

        res.json({ message: 'Appointment updated successfully.', appointment: updatedAppointment });

    } catch (err) {
        res.status(500).json({ error: 'Failed to update appointment: ' + err.message });
    }
};

// --- NEW FUNCTION: Delete Appointment (Cancellation) ---
// DELETE /api/appointments/:id
exports.deleteAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.userId;     // From JWT
        const userRole = req.userRole;

        // 1. Authorization Check
        const appointment = await appointmentModel.getAppointmentById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }
        
        const isAuthorized = (appointment.patient_id === userId) || (appointment.doctor_id === userId) || (userRole === 'admin');

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to cancel this appointment.' });
        }

        // 2. Perform Deletion
        await appointmentModel.deleteAppointment(appointmentId);

        res.json({ message: 'Appointment cancelled successfully.' });

    } catch (err) {
        res.status(500).json({ error: 'Failed to delete appointment: ' + err.message });
    }
};