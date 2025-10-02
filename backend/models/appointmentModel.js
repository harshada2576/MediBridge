// models/appointmentModel.js

const supabase = require('../src/supabaseClient'); 
// NOTE: Supabase client import assumed to be correctly configured in ../src/supabaseClient.js

// Function to create a new appointment (existing)
exports.addAppointment = async (patientId, doctorId, date, reason) => {
    const { data, error } = await supabase
        .from('appointments')
        .insert([
            {
                patient_id: patientId,
                doctor_id: doctorId,
                appointment_date: date,
                reason: reason,
                status: 'Scheduled'
            }
        ])
        .select();

    if (error) {
        throw new Error('Failed to create appointment: ' + error.message);
    }
    return data[0];
};

// Function to get appointments for a specific user (existing)
exports.getAppointmentsByUser = async (userId, role) => {
    let query = supabase.from('appointments').select(`
        *,
        patient:patient_id (name),
        doctor:doctor_id (name)
    `);

    if (role === 'patient') {
        query = query.eq('patient_id', userId);
    } else if (role === 'doctor') {
        query = query.eq('doctor_id', userId);
    } else {
        query = query.limit(0);
    }

    const { data, error } = await query.order('appointment_date', { ascending: true });

    if (error) {
        throw new Error('Failed to retrieve appointments: ' + error.message);
    }
    return data;
};

// --- NEW FUNCTION: Get Single Appointment for Authorization ---
exports.getAppointmentById = async (appointmentId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
        
    // Handle error where no row is found gracefully (returns null/undefined)
    if (error && error.code !== 'PGRST116') { 
        throw new Error('Failed to retrieve appointment: ' + error.message);
    }
    return data;
};

// --- NEW FUNCTION: Update Appointment ---
exports.updateAppointment = async (appointmentId, updates) => {
    const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select();

    if (error) {
        throw new Error('Failed to update appointment: ' + error.message);
    }
    return data[0];
};

// --- NEW FUNCTION: Delete Appointment ---
exports.deleteAppointment = async (appointmentId) => {
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

    if (error) {
        throw new Error('Failed to delete appointment: ' + error.message);
    }
    return true; // Indicate success
};