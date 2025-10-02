// backend/src/app.js - FINAL CORRECTED PATH

const express = require('express');
const cors = require('cors'); 
const app = express();
// Correct the path: go up one level from src/ to backend/, then into routes/
const apiRouter = require('../routes/api'); // <--- CORRECTED PATH: '../routes/api'

// Configure CORS to allow access from the frontend
app.use(cors());

app.use(express.json()); // Parse JSON bodies
app.use('/api', apiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// --- NEW DOCTOR PATIENT FETCHING LOGIC (Add these to app.js) ---

// G.3: Fetches all users, filters them down to patients.
async function fetchPatients() {
    showLoading();
    try {
        // Fetches ALL profiles (users)
        const allUsers = await fetchAuthenticated('/users', 'GET');
        hideLoading();
        
        // Client-side filter: only show those explicitly tagged as 'patient'
        const patients = allUsers.filter(user => user.role === 'patient');
        return patients;

    } catch (error) {
        hideLoading();
        showNotification('Failed to load patient list. Check backend connectivity.', 'error');
        return [];
    }
}

// G.3: Renders the patient cards in the Doctor Portal's Patients tab
function renderDoctorPatients(patients) {
    const grid = document.getElementById('patientCardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (patients.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 p-4">No active patients found in the system.</p>';
        return;
    }

    patients.forEach(patient => {
        // --- NOTE: Simulate dynamic clinical data for demonstration ---
        const age = Math.floor(Math.random() * (75 - 25 + 1)) + 25; 
        const condition = ['Hypertension', 'Diabetes', 'Cardiac Checkup', 'Routine Care'][Math.floor(Math.random() * 4)];
        const initials = patient.name.split(' ').map(n => n[0]).join('');

        const card = document.createElement('div');
        card.className = 'patient-card bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600';
        card.innerHTML = `
            <div class="flex items-center space-x-4 mb-4">
                <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold text-xl">${initials}</span>
                </div>
                <div>
                    <h3 class="font-bold text-gray-800 dark:text-white text-lg">${patient.name}</h3>
                    <p class="text-gray-600 dark:text-gray-400">Age: ${age} • Role: Patient</p>
                    <div class="flex items-center mt-1">
                        <div class="status-indicator status-online"></div>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Active Patient</span>
                    </div>
                </div>
            </div>
            <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600 dark:text-gray-400">Condition:</span>
                    <span class="text-gray-800 dark:text-white">${condition}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600 dark:text-gray-400">Email:</span>
                    <span class="text-gray-800 dark:text-white text-xs">${patient.email}</span>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="startConsultation('${patient.id}', '${patient.name}')" 
                    class="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    <i class="fas fa-stethoscope mr-1"></i> Consult
                </button>
                <button onclick="prescribeMedication('${patient.id}', '${patient.name}')"
                    class="bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                    <i class="fas fa-pills"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}


// --- UPDATE CORE LOAD HOOK ---

// ACTION: Find the existing renderPortalHeader function in app.js and ensure this call is added:
function renderPortalHeader() {
    // ... (existing name update logic) ...
    
    if (currentUser.role === 'doctor') {
        // Fetch Appointments for Dashboard
        fetchAppointmentsForUser().then(appointments => {
            // ... (appointment rendering calls) ...
        });
        
        // NEW: Fetch and Render Patients (for the Patients tab)
        fetchPatients().then(patients => {
            renderDoctorPatients(patients);
        }).catch(err => console.error(err));
    }
    // ... (rest of the function) ...
}