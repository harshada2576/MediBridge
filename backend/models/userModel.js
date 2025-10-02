// backend/models/userModel.js - CORRECTED FINAL SUPABASE VERSION

const supabase = require('../src/supabaseClient'); 
// This line correctly requires the Supabase client connection established in src/

// Function to save user profile data to the 'profiles' table after successful sign-up in Auth.
exports.createProfile = async (userId, name, role) => {
    const { data, error } = await supabase
        .from('profiles')
        .insert([
            { id: userId, name: name, role: role }
        ]);

    if (error) {
        throw new Error('Failed to create user profile: ' + error.message);
    }
    return data;
};

// Function to find a user's profile to verify role after successful Auth login
exports.getProfileByUserId = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role') 
        .eq('id', userId)
        .single();

    if (error) {
        throw new Error('Failed to retrieve user profile: ' + error.message);
    }
    return data;
};

exports.getAllUsers = async () => {
    // Fetches all profiles/users (Admin-only route)
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role');

    if (error) {
        throw new Error('Failed to retrieve all users: ' + error.message);
    }
    return data;
};