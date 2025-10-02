// models/appointmentModel.js

const supabase = require('../src/supabaseClient'); 


// Function to create a new appointment
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
        console.error('Error adding appointment:', error);
        throw new Error('Failed to create appointment.');
    }
    return data[0];
};

// Function to get appointments for a specific user (either patient or doctor)
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
        // Admin or other role logic can go here
        throw new Error('Invalid role specified for fetching appointments.');
    }

    const { data, error } = await query.order('appointment_date', { ascending: true });

    if (error) {
        console.error('Error fetching appointments:', error);
        throw new Error('Failed to retrieve appointments.');
    }
    return data;
};

// You will add updateAppointment and deleteAppointment functions here later.