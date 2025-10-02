// controllers/recordController.js

const recordModel = require('../models/recordModel');

// POST /api/records
exports.createRecord = async (req, res) => {
    try {
        // doctorId is assumed to be extracted from the authenticated user's JWT (req.userId)
        // For demonstration, we'll assume both doctorId and patientId are in the body,
        // but this will need adjustment once full JWT user identity is implemented.
        const { patientId, doctorId, type, title, details } = req.body; 

        if (!patientId || !doctorId || !type || !title) {
            return res.status(400).json({ error: 'Missing required fields for medical record.' });
        }

        const newRecord = await recordModel.addRecord(
            patientId,
            doctorId,
            type,
            title,
            details
        );

        res.status(201).json({ 
            message: `${type} record created successfully!`, 
            record: newRecord 
        });

    } catch (err) {
        res.status(500).json({ error: `Failed to create record: ${err.message}` });
    }
};


// GET /api/records
exports.getRecords = async (req, res) => {
    try {
        // These are assumed to be attached by the verifyToken middleware
        const userId = req.userId; 
        const role = req.userRole; 
        const recordType = req.query.type; // Optional filter, e.g., ?type=Prescription
        
        if (!userId || !role) {
            return res.status(403).json({ error: 'Authentication data missing.' });
        }

        const records = await recordModel.getRecordsByUser(userId, role, recordType);

        res.json(records);

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch medical records: ' + err.message });
    }
};

// PUT /api/records/:id
exports.updateRecord = async (req, res) => {
    try {
        const recordId = req.params.id;
        const updates = req.body;

        const updatedRecord = await recordModel.updateRecord(recordId, updates);

        if (!updatedRecord) {
            return res.status(404).json({ message: 'Record not found.' });
        }

        res.json({ message: 'Record updated successfully.', record: updatedRecord });

    } catch (err) {
        res.status(500).json({ error: 'Failed to update record: ' + err.message });
    }
};
// controllers/recordController.js

const recordModel = require('../models/recordeModel');

// ... (existing exports for createRecord, getRecords, updateRecord) ...

// --- NEW FUNCTION: Delete Record ---
// DELETE /api/records/:id
exports.deleteRecord = async (req, res) => {
    try {
        const recordId = req.params.id;
        const userId = req.userId;     // From JWT
        const userRole = req.userRole; // From JWT

        // 1. Authorization Check: Fetch record to check ownership/assignment
        const record = await recordModel.getRecordById(recordId);

        if (!record) {
            return res.status(404).json({ message: 'Medical record not found.' });
        }

        // Authorization logic: Only the assigned doctor or an Admin can delete a record
        const isAuthorized = (record.doctor_id === userId) || (userRole === 'admin');

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this record.' });
        }
        
        // 2. Perform Deletion
        await recordModel.deleteRecord(recordId);

        res.json({ message: 'Medical record deleted successfully.' });

    } catch (err) {
        res.status(500).json({ error: 'Failed to delete medical record: ' + err.message });
    }
};