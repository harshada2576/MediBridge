// models/recordeModel.js

const supabase = require('../src/supabaseClient'); 

// NOTE: This model assumes the 'medical_records' table exists in Supabase.

// Function to create a new medical record (existing)
exports.addRecord = async (patientId, doctorId, type, title, details) => {
    const { data, error } = await supabase
        .from('medical_records')
        .insert([
            {
                patient_id: patientId,
                doctor_id: doctorId,
                record_type: type,
                title: title,
                details: details
            }
        ])
        .select();

    if (error) {
        throw new Error(`Failed to create ${type} record: ` + error.message);
    }
    return data[0];
};

// Function to get records based on user role (existing)
exports.getRecordsByUser = async (userId, role, recordType) => {
    let query = supabase.from('medical_records').select(`
        *,
        patient:patient_id (name),
        doctor:doctor_id (name)
    `);
    
    if (role === 'patient') {
        query = query.eq('patient_id', userId);
    } else if (role === 'doctor') {
        query = query.eq('doctor_id', userId);
    }

    if (recordType) {
        query = query.eq('record_type', recordType);
    }

    const { data, error } = await query.order('record_date', { ascending: false });

    if (error) {
        throw new Error('Failed to retrieve medical records: ' + error.message);
    }
    return data;
};

// --- NEW FUNCTION: Get Single Record by ID (For Authorization Check) ---
exports.getRecordById = async (recordId) => {
    const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', recordId)
        .single();
        
    if (error && error.code !== 'PGRST116') { 
        throw new Error('Failed to retrieve medical record: ' + error.message);
    }
    return data;
};

// Function to update a record (existing)
exports.updateRecord = async (recordId, updates) => {
    const { data, error } = await supabase
        .from('medical_records')
        .update(updates)
        .eq('id', recordId)
        .select();

    if (error) {
        throw new Error('Failed to update medical record: ' + error.message);
    }
    return data[0];
};

// --- NEW FUNCTION: Delete Record ---
exports.deleteRecord = async (recordId) => {
    const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordId);

    if (error) {
        throw new Error('Failed to delete medical record: ' + error.message);
    }
    return true; // Indicate success
};