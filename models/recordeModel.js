// models/recordModel.js

const supabase = require('../src/supabaseClient'); 

// NOTE: Before running Node, you must execute the SQL below in your Supabase console to create the table.
/*
-- Recommended Supabase SQL Schema for Medical Records
CREATE TABLE public.medical_records (
    id SERIAL PRIMARY KEY,
    patient_id uuid REFERENCES auth.users(id),
    doctor_id uuid REFERENCES auth.users(id),
    record_type TEXT NOT NULL CHECK (record_type IN ('Consultation', 'Prescription', 'Lab Report', 'X-Ray')),
    record_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    details JSONB, -- Stores structured data like symptoms, diagnosis, medication list, etc.
    status TEXT DEFAULT 'Final'
);
-- Remember to enable RLS (Row Level Security)!
*/

// Function to create a new medical record (Consultation or Prescription)
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
        console.error('Error adding medical record:', error);
        throw new Error(`Failed to create ${type} record.`);
    }
    return data[0];
};

// Function to get records based on user role
exports.getRecordsByUser = async (userId, role, recordType) => {
    // Select all fields, and join to get patient/doctor names
    let query = supabase.from('medical_records').select(`
        *,
        patient:patient_id (name),
        doctor:doctor_id (name)
    `);

    // Filter by user role
    if (role === 'patient') {
        query = query.eq('patient_id', userId);
    } else if (role === 'doctor') {
        query = query.eq('doctor_id', userId);
    } 

    // Optional: Filter by specific record type (e.g., ?type=Prescription)
    if (recordType) {
        query = query.eq('record_type', recordType);
    }

    const { data, error } = await query.order('record_date', { ascending: false });

    if (error) {
        console.error('Error fetching medical records:', error);
        throw new Error('Failed to retrieve medical records.');
    }
    return data;
};

// Function to update a record (e.g., changing status or details)
exports.updateRecord = async (recordId, updates) => {
    const { data, error } = await supabase
        .from('medical_records')
        .update(updates)
        .eq('id', recordId)
        .select();

    if (error) {
        console.error('Error updating record:', error);
        throw new Error('Failed to update medical record.');
    }
    return data[0];
};