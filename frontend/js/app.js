// frontend/js/app.js - FINAL INTEGRATION CORE LOGIC

// --- Configuration and Global State ---

// IMPORTANT: Update this base URL to match your running Node.js server (e.g., http://localhost:3000)
const API_BASE_URL = 'http://localhost:3000/api'; 
let currentUser = null;
let currentToken = null;
let isDarkMode = false;

// --- Initialization and Utility Functions ---

document.addEventListener('DOMContentLoaded', function () {
    updateDateTime();
    setInterval(updateDateTime, 60000);
    initializeMobileMenu();
    checkDarkMode();
    
    // 1. Attempt to load saved state
    loadAuthState();
    
    // 2. Attach form listeners for authentication pages
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        const tempEmail = localStorage.getItem('tempLoginEmail');
        const tempRole = localStorage.getItem('tempLoginRole');
        if (tempEmail) document.getElementById('loginEmail').value = tempEmail;
        if (tempRole) document.getElementById('userRole').value = tempRole;
        localStorage.removeItem('tempLoginEmail');
        localStorage.removeItem('tempLoginRole');
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
        const passInput = document.getElementById('registerPassword');
        const confirmInput = document.getElementById('confirmPassword');
        if (passInput) passInput.addEventListener('input', () => checkPasswordStrength(passInput.value));
        if (confirmInput) confirmInput.addEventListener('input', checkPasswordMatch);
    }

    // 3. CORE PORTAL INITIALIZATION LOGIC
    if (currentUser) {
        if (window.location.pathname.includes('patient-portal.html')) {
            renderPatientPortalHeader();
        } else if (window.location.pathname.includes('doctor-portal.html')) {
            renderPortalHeader();
        } else if (window.location.pathname.includes('nurse-portal.html')) { // <-- NEW CHECK
            renderNursePortalHeader();
        }
    }
});

function loadAuthState() {
    const user = localStorage.getItem('currentUser');
    const token = localStorage.getItem('currentToken');
    const role = localStorage.getItem('currentRole');
    
    if (user && token && role) {
        currentUser = JSON.parse(user);
        currentToken = token;
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname.includes('register.html') ||
            window.location.pathname.includes('role-selection.html')) {
             redirectToPortal(role);
        }
    }
}

function saveAuthState(user, token) {
    currentUser = user;
    currentToken = token;
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('currentToken', token);
    localStorage.setItem('currentRole', user.role);
}

function clearAuthState() {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentToken');
    localStorage.removeItem('currentRole');
}

function redirectToPortal(role) {
    let portalFile = '';
    if (role === 'doctor') portalFile = 'doctor-portal.html';
    else if (role === 'patient') portalFile = 'patient-portal.html';
    else if (role === 'admin') portalFile = 'admin-portal.html';
    else if (role === 'nurse') portalFile = 'nurse-portal.html';
    
    if (portalFile) {
        window.location.href = portalFile;
    } else {
        showNotification('Invalid role specified.', 'error');
    }
}

function showPage(url) {
    window.location.href = url;
}

// --- API FETCH UTILITY ---

async function fetchAuthenticated(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}` 
    };

    const config = {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                clearAuthState();
                showPage('login.html');
            }
            throw new Error(data.message || data.error || `API Error: ${response.status}`);
        }
        return data;

    } catch (error) {
        console.error("Authenticated Fetch Error:", error);
        throw error;
    }
}

// --- CORE AUTHENTICATION LOGIC ---

async function handleLogin(event) {
    event.preventDefault();
    showLoading();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('userRole').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        
        const data = await response.json();
        hideLoading();

        if (response.ok) {
            const user = { id: data.user.id, name: data.user.name || 'User', email: data.user.email, role: data.user.role };
            saveAuthState(user, data.token);
            showNotification(`Welcome ${user.name}!`, 'success');
            redirectToPortal(user.role);
        } else {
            showNotification(data.message || data.error || 'Login failed.', 'error');
        }

    } catch (error) {
        hideLoading();
        showNotification('Network error. Check server connection.', 'error');
    }
}

async function handleRegistration(event) {
    event.preventDefault();
    showLoading();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('registerRole').value;
    
    if (password !== confirmPassword) {
        hideLoading();
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: `${firstName} ${lastName}`, 
                email, 
                password, 
                role 
            })
        });
        
        const data = await response.json();
        hideLoading();

        if (response.ok) {
            localStorage.setItem('tempLoginEmail', email);
            localStorage.setItem('tempLoginRole', role);

            showNotification(data.message || 'Registration successful. Please login.', 'success');
            showPage('login.html');
        } else {
            showNotification(data.error || 'Registration failed.', 'error');
        }

    } catch (error) {
        hideLoading();
        showNotification('Network error. Failed to register user.', 'error');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuthState();
        showNotification('Logged out successfully', 'info');
        showPage('login.html');
    }
}

// --- API DATA FETCHING ---

async function fetchAppointmentsForUser() {
    try {
        const endpoint = `/appointments?role=${currentUser.role}`;
        const appointments = await fetchAuthenticated(endpoint, 'GET');
        return appointments;

    } catch (error) {
        showNotification('Failed to load appointments.', 'error');
        return [];
    }
}

async function fetchRecordsForUser() {
    try {
        const records = await fetchAuthenticated('/records', 'GET');
        return records;

    } catch (error) {
        showNotification('Failed to load medical records.', 'error');
        return [];
    }
}

async function createNewAppointment(appointmentData) {
    try {
        const response = await fetchAuthenticated('/appointments', 'POST', {
            doctorId: appointmentData.doctorId, 
            date: appointmentData.date,
            reason: appointmentData.reason
        });
        
        showNotification('Appointment successfully scheduled!', 'success');
        return response.appointment;

    } catch (error) {
        showNotification('Failed to book appointment.', 'error');
    }
}

// --- CORE PORTAL ACTION HANDLERS (D.1 & D.2) ---

/**
 * D.1: Cancels an appointment using the DELETE API endpoint.
 * @param {string} appointmentId 
 */
async function cancelAppointment(appointmentId) {
    if (!confirm("Are you sure you want to cancel this appointment? This action cannot be undone.")) {
        return;
    }

    showLoading();

    try {
        // Send DELETE request to the protected endpoint
        await fetchAuthenticated(`/appointments/${appointmentId}`, 'DELETE');

        hideLoading();
        showNotification('Appointment cancelled successfully!', 'success');
        
        // Reload the page to refresh the appointment list
        window.location.reload(); 

    } catch (error) {
        hideLoading();
        showNotification('Failed to cancel appointment. You may not have permission.', 'error');
    }
}

/**
 * D.2: Deletes a medical record using the DELETE API endpoint.
 * @param {string} recordId 
 */
async function deleteRecord(recordId) {
    if (!confirm("Are you sure you want to permanently delete this medical record?")) {
        return;
    }

    showLoading();

    try {
        // Send DELETE request to the protected endpoint
        await fetchAuthenticated(`/records/${recordId}`, 'DELETE');

        hideLoading();
        showNotification('Medical record deleted successfully!', 'success');
        
        // Refresh the page
        window.location.reload(); 

    } catch (error) {
        hideLoading();
        showNotification('Failed to delete record. You may not have permission.', 'error');
    }
}


// --- DOCTOR/PATIENT FORM HANDLERS (C.1 & C.2) ---

// Patient Appointment Booking Handler (Used by Patient Portal)
async function handlePatientAppointmentForm(event) {
    showLoading();

    const form = event.target;
    const date = form.querySelector('[name="date"]').value;
    const time = form.querySelector('[name="time"]').value;
    const doctorName = form.querySelector('[name="doctor"]').value;
    const reason = form.querySelector('[name="reason"]').value;
    const type = form.querySelector('[name="appointmentType"]:checked').value;

    const appointmentDateTime = `${date}T${time}:00Z`;
    const dummyDoctorId = "550e8400-e29b-41d4-a716-446655440000"; // Placeholder Doctor UUID

    try {
        await createNewAppointment({
            doctorId: dummyDoctorId, 
            date: appointmentDateTime,
            reason: `${type}: ${reason}` 
        });

        hideLoading();
        window.location.reload(); 

    } catch (error) {
        hideLoading();
        showNotification('Failed to book appointment. Check console for details.', 'error');
    }
}

// C.1: Consultation Form Handler
async function handleConsultationForm(event) {
    event.preventDefault();
    closeModal();
    showLoading();

    const form = event.target;
    const patientId = form.querySelector('[name="patientId"]').value;
    const patientName = form.querySelector('[name="patientName"]').value;
    const notes = form.querySelector('[name="notes"]').value;
    const diagnosis = form.querySelector('[name="diagnosis"]').value;
    const followUp = form.querySelector('[name="followUp"]').value;

    if (!patientId || !notes) {
        hideLoading();
        showNotification('Consultation notes and patient ID are required.', 'error');
        return;
    }

    try {
        const recordData = {
            patientId: patientId,
            type: 'Consultation',
            title: `Consultation with ${patientName}`,
            details: {
                notes: notes,
                diagnosis: diagnosis,
                follow_up_date: followUp
            }
        };

        await fetchAuthenticated('/records', 'POST', recordData);

        hideLoading();
        showNotification(`Consultation record for ${patientName} saved successfully!`, 'success');
        
    } catch (error) {
        hideLoading();
        showNotification('Failed to save consultation record.', 'error');
    }
}

// C.2: Prescription Form Handler
async function handlePrescriptionForm(event) {
    event.preventDefault();
    closeModal();
    showLoading();

    const form = event.target;
    const patientId = form.querySelector('[name="patientId"]').value;
    const patientName = form.querySelector('[name="patientName"]').value;
    const medication = form.querySelector('[name="medication"]').value;
    const dosage = form.querySelector('[name="dosage"]').value;
    const frequency = form.querySelector('[name="frequency"]').value;
    const duration = form.querySelector('[name="duration"]').value;
    const instructions = form.querySelector('[name="instructions"]').value;

    if (!patientId || !medication || !dosage || !frequency) {
        hideLoading();
        showNotification('Medication, dosage, and patient ID are required.', 'error');
        return;
    }

    try {
        const recordData = {
            patientId: patientId,
            type: 'Prescription',
            title: `${medication} (${dosage})`,
            details: {
                medication: medication,
                dosage: dosage,
                frequency: frequency,
                duration: duration,
                instructions: instructions
            }
        };

        await fetchAuthenticated('/records', 'POST', recordData);

        hideLoading();
        showNotification(`Prescription for ${patientName} saved successfully!`, 'success');
        
    } catch (error) {
        hideLoading();
        showNotification('Failed to save prescription. Check API/console.', 'error');
    }
}


// --- PORTAL RENDERING LOGIC (continued) ---

// (Other rendering functions like renderPatientAppointments, renderFullAppointments etc. are assumed to be defined)


// --- UTILITY PLACEHOLDERS ---

function initializeDoctorCharts() { /* Logic for Chart.js charts on Doctor Portal */ }
function initializePatientCharts() { /* Logic for Chart.js charts on Patient Portal */ }
function initializeAdminCharts() { /* Logic for Chart.js charts on Admin Portal */ }
function initializeNurseCharts() { /* Logic for Chart.js charts on Nurse Portal */ }
function initializeCalendar() { /* Logic for FullCalendar on Doctor Portal */ }
function showSection(sectionId) { /* Portal navigation logic */ }
function updateDateTime() { /* Utility function */ }
function initializeMobileMenu() { /* Utility function */ }
function checkPasswordMatch() { /* Utility function */ }
function checkPasswordStrength() { /* Utility function */ }
function showLoading() { 
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}
function hideLoading() { 
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}
function toggleDarkMode() { /* Utility function */ }
function togglePasswordVisibility(inputId) { /* Utility function */ }
function toggleNotifications() { /* Utility function */ }
function toggleMessages() { /* Utility function */ }
function toggleProfileMenu() { /* Utility function */ }
function showNotification(message, type) { 
    // Basic implementation for showNotification
    console.log(`Notification (${type}): ${message}`);
    // You must ensure the full showNotification and closeModal utilities are in your app.js
}

function closeModal() { 
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
}

function showModal(title, content, actionText, actionCallback) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalAction = document.getElementById('modalAction');

    if (!modal) return;
    
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    modalAction.textContent = actionText;

    const newModalAction = modalAction.cloneNode(true);
    modalAction.parentNode.replaceChild(newModalAction, modalAction);

    newModalAction.addEventListener('click', actionCallback);
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Additional functions referenced in HTML (placeholder implementation)
function quickAddPatient() { showNotification('Add Patient form coming soon!', 'info'); }
function addAppointment() { showNotification('Add Appointment form coming soon!', 'info'); }
function viewTestResults() { showNotification('Viewing Test Results (API pending)!', 'info'); }
function viewPrescriptions() { showNotification('Viewing Prescriptions (API pending)!', 'info'); }
function messageDoctor() { showNotification('Messaging system coming soon!', 'info'); }
// --- NEW FUNCTIONS FOR APPOINTMENT MANAGEMENT (Add these to app.js) ---

/**
 * Launches a modal to edit an existing appointment.
 * This function should be called from the "Edit" button on the Doctor's Appointment List.
 * @param {string} appointmentId 
 * @param {string} currentDetails - JSON string or object containing current date, time, doctorId, status, etc.
 */
// --- MODIFIED FUNCTION IN frontend/js/app.js ---

function rescheduleAppointment(aptDetails) {
    // The aptDetails object is passed directly from the render function now
    const currentApt = aptDetails;

    showModal(
        `Reschedule Appointment (${currentApt.id.substring(0, 8)}...)`,
        `
        <form id="rescheduleForm">
            <input type="hidden" name="appointmentId" value="${currentApt.id}">
            <input type="hidden" name="patientName" value="${currentApt.patientName}">

            <div class="space-y-4">
                <div class="bg-blue-50 dark:bg-gray-700 p-3 rounded-lg border border-blue-200 dark:border-gray-600">
                    <p class="font-medium text-sm">Patient: ${currentApt.patientName}</p>
                </div>
                
                <h4 class="font-semibold mt-4 text-gray-800 dark:text-gray-300">New Schedule</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Date *</label>
                        <input type="date" name="newDate" required value="${currentApt.date}" 
                               class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Time *</label>
                        <input type="time" name="newTime" required value="${currentApt.time}"
                               class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>

                <h4 class="font-semibold mt-4 text-gray-800 dark:text-gray-300">Status Update</h4>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select name="status" class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="Scheduled" ${currentApt.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="Confirmed" ${currentApt.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Completed" ${currentApt.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${currentApt.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            </div>
        </form>
        `,
        'Update Appointment',
        () => {
             const form = document.getElementById('rescheduleForm');
             if (form.checkValidity()) {
                 handleRescheduleForm({ preventDefault: () => {}, target: form });
             } else {
                 form.reportValidity();
             }
        }
    );
}
/**
 * Handles the form submission for rescheduling/updating an appointment.
 * Calls the PUT /api/appointments/:id endpoint.
 */
async function handleRescheduleForm(event) {
    event.preventDefault();
    closeModal();
    showLoading();

    const form = event.target;
    const appointmentId = form.querySelector('[name="appointmentId"]').value;
    const newDate = form.querySelector('[name="newDate"]').value;
    const newTime = form.querySelector('[name="newTime"]').value;
    const newStatus = form.querySelector('[name="status"]').value;

    const newDateTime = `${newDate}T${newTime}:00Z`;

    try {
        const updates = {
            appointment_date: newDateTime,
            status: newStatus
        };

        await fetchAuthenticated(`/appointments/${appointmentId}`, 'PUT', updates);

        hideLoading();
        showNotification('Appointment successfully rescheduled/updated!', 'success');
        
        // Reload page to display new data (or call render functions directly)
        window.location.reload(); 

    } catch (error) {
        hideLoading();
        showNotification('Failed to update appointment. Check permissions.', 'error');
    }
}
// --- MODIFIED FUNCTION IN frontend/js/app.js ---

// --- MODIFIED FUNCTION IN frontend/js/app.js ---

function renderPatientAppointments(appointments) {
    const list = document.getElementById('patientAppointmentsList');
    if (!list) return;

    // Filter appointments that are 'Scheduled' or 'Confirmed'
    const upcomingAppointments = appointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
    list.innerHTML = ''; 

    if (upcomingAppointments.length === 0) {
        list.innerHTML = '<p class="text-gray-500 p-4 text-sm">You have no upcoming appointments.</p>';
        return;
    }

    upcomingAppointments.slice(0, 2).forEach(apt => {
        const doctorName = apt.doctor ? apt.doctor.name : 'Unknown Doctor';
        const date = new Date(apt.appointment_date).toLocaleDateString();
        const time = new Date(apt.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const isNext = (apt === upcomingAppointments[0]);
        const colorClass = isNext ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20';

        const item = document.createElement('div');
        item.className = `flex justify-between items-center border-l-4 ${colorClass} pl-4 pr-2 py-3 rounded-r-lg`;
        item.innerHTML = `
            <div class="flex-1">
                <p class="font-semibold text-gray-800 dark:text-white">${doctorName}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${apt.reason}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${date} at ${time}</p>
            </div>
            
            <button onclick="cancelAppointment('${apt.id}')" 
                    class="bg-red-500 text-white px-3 py-1 text-xs rounded-lg hover:bg-red-600 transition-colors">
                <i class="fas fa-times mr-1"></i>Cancel
            </button>
        `;
        list.appendChild(item);
    });
}
// --- ADMIN PORTAL HANDLERS (Add these to app.js) ---

// G.1: User Management Handler (Fetches ALL Users - Admin Privilege)
async function manageUsers() {
    showLoading();
    try {
        // Fetches ALL users (a privileged action assumed to be allowed for Admin role)
        const users = await fetchAuthenticated('/users', 'GET');
        hideLoading();
        
        showModal(
            'System User Management',
            renderUserTable(users), // Show users in a table
            'Close', 
            closeModal
        );

    } catch (error) {
        hideLoading();
        showNotification('Access denied or failed to load users.', 'error');
    }
}

// G.1: Reports & Analytics Handler (Fetches ALL Records - Admin Privilege)
async function viewReports() {
    showLoading();
    try {
        // Fetches ALL records (Consultations, Prescriptions, etc.)
        const records = await fetchAuthenticated('/records', 'GET');
        hideLoading();
        
        showModal(
            'System Reports & Analytics',
            renderRecordsSummary(records), // Show records summary
            'Close',
            closeModal
        );

    } catch (error) {
        hideLoading();
        showNotification('Access denied or failed to load reports.', 'error');
    }
}

// G.1: Utility function to render a user table for the modal
function renderUserTable(users) {
    let tableHtml = `
        <p class="text-sm text-gray-600 mb-4">Total Users: ${users.length}</p>
        <div class="overflow-x-auto max-h-80">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Name</th>
                        <th class="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Email</th>
                        <th class="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Role</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
    `;

    users.forEach(user => {
        tableHtml += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="py-2 px-4 whitespace-nowrap text-sm font-medium">${user.name}</td>
                <td class="py-2 px-4 whitespace-nowrap text-sm">${user.email}</td>
                <td class="py-2 px-4 whitespace-nowrap text-xs">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'doctor' ? 'bg-blue-100 text-blue-800' : user.role === 'patient' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}">${user.role}</span>
                </td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>`;
    return tableHtml;
}

// G.1: Utility function to render a records summary for the modal
function renderRecordsSummary(records) {
    const recordTypes = records.reduce((acc, record) => {
        acc[record.record_type] = (acc[record.record_type] || 0) + 1;
        return acc;
    }, {});
    
    let summaryHtml = `
        <p class="text-sm text-gray-600 mb-4">Total Records: ${records.length}</p>
        <div class="space-y-3">
    `;

    for (const [type, count] of Object.entries(recordTypes)) {
        summaryHtml += `
            <div class="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span class="font-medium">${type}s</span>
                <span class="font-bold text-lg">${count}</span>
            </div>
        `;
    }

    summaryHtml += `
        </div>
        <p class="text-xs text-gray-500 mt-4">Showing total count of all records (Consultations, Prescriptions, Reports).</p>
    `;
    return summaryHtml;
}
// --- NEW NURSE PORTAL RENDERING & TASK HANDLER (Add to app.js) ---

// G.2: Task Completion Handler (Marks a record as 'Completed')
async function completeTask(recordId) {
    showLoading();

    try {
        const updates = { status: 'Completed' };
        
        // Use PUT endpoint to update the status of the record (Task/Vitals/Medication)
        await fetchAuthenticated(`/records/${recordId}`, 'PUT', updates);

        hideLoading();
        showNotification('Task marked as complete!', 'success');
        
        // Refresh the nurse portal view after completion
        // Note: For a real app, you'd update the DOM directly for a smoother experience.
        window.location.reload(); 

    } catch (error) {
        hideLoading();
        showNotification('Failed to complete task. Check API permissions.', 'error');
    }
}

// G.2: Render Logic for Nurse Portal
async function renderNursePortalHeader() {
    // Update header name
    const nameElements = document.querySelectorAll('.currentUser-name');
    if (currentUser) {
        nameElements.forEach(el => {
             el.textContent = `Welcome, Nurse ${currentUser.name.split(' ').pop()}!`;
        });
    }

    // Fetch all necessary data (for now, fetching all records for tasks)
    const records = await fetchRecordsForUser();
    
    renderNurseTasks(records);
    // You would add renderVitalsSummary(records) here to fill quick stats
}

// G.2: Renders the list of active tasks for the nurse
function renderNurseTasks(records) {
    const list = document.getElementById('nurseTaskList');
    if (!list) return;

    // Filter for open tasks (e.g., specific record types that function as tasks)
    const openTasks = records.filter(r => 
        (r.record_type.includes('Vitals') || r.record_type.includes('Medication')) && r.status !== 'Completed'
    );
    
    list.innerHTML = ''; 

    if (openTasks.length === 0) {
        list.innerHTML = '<p class="text-gray-500 p-4 text-sm">No pending patient care tasks for this shift.</p>';
        return;
    }

    openTasks.forEach(task => {
        const patientName = task.patient ? task.patient.name : 'Unknown Patient';
        const isMedication = task.record_type === 'Medication';
        const isUrgent = task.title.includes('Urgent');

        const colorClass = isUrgent ? 'bg-red-50 border-red-500' : isMedication ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300';
        const icon = isMedication ? 'fas fa-pills' : 'fas fa-heartbeat';
        
        const item = document.createElement('div');
        item.className = `flex items-center space-x-3 p-4 ${colorClass} rounded-xl border-l-4`;
        item.innerHTML = `
            <input type="checkbox" class="rounded" onclick="completeTask('${task.id}')">
            <div class="flex-1">
                <p class="font-medium text-gray-800 dark:text-white">${task.title}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${patientName} - Room 201</p>
                <p class="text-xs text-red-600 dark:text-red-400">${isUrgent ? 'URGENT ATTENTION' : 'Due: 11:00 AM'}</p>
            </div>
            <i class="${icon} text-xl text-gray-400"></i>
        `;
        list.appendChild(item);
    });
}
// --- NEW DOCTOR PATIENT FETCHING LOGIC (Add to app.js) ---

// G.3: Fetches all users, filters them down to patients.
async function fetchPatients() {
    try {
        // NOTE: This route fetches ALL users (patients, doctors, admins).
        // It relies on RLS/Backend authorization to only return profiles
        // the current user (doctor/admin) is allowed to see.
        const allUsers = await fetchAuthenticated('/users', 'GET');
        
        // Client-side filter: only show those explicitly tagged as 'patient'
        const patients = allUsers.filter(user => user.role === 'patient');
        return patients;

    } catch (error) {
        showNotification('Failed to load patient list.', 'error');
        return [];
    }
}

// G.3: Renders the patient cards in the Doctor Portal
function renderDoctorPatients(patients) {
    const grid = document.getElementById('patientCardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (patients.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 p-4">No active patients assigned to your profile.</p>';
        return;
    }

    patients.forEach(patient => {
        // Simulate patient details (Age, Condition) as this isn't stored in the basic 'users' table
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
// --- MODIFIED FUNCTION IN frontend/js/app.js ---

function renderPortalHeader() {
    // ... (existing name update logic) ...
    
    if (currentUser.role === 'doctor') {
        // Fetch Appointments for Dashboard
        fetchAppointmentsForUser().then(appointments => {
            renderTodaySchedule(appointments);
            renderFullAppointments(appointments);
        }).catch(err => console.error(err));
        
        // NEW: Fetch and Render Patients (for the Patients tab)
        fetchPatients().then(patients => {
            renderDoctorPatients(patients);
        }).catch(err => console.error(err));
    }
    // ... (rest of the function) ...
}
// --- NEW DOCTOR PATIENT FETCHING LOGIC (Add this to app.js) ---

// G.3: Fetches all users, filters them down to patients.
async function fetchPatients() {
    showLoading();
    try {
        // This relies on the protected /api/users endpoint.
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
        const condition = ['Hypertension', 'Diabetes', 'Routine Checkup', 'Cardiac Checkup'][Math.floor(Math.random() * 4)];
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
        
        // NEW: Fetch and Render Patients (called once on Doctor Portal load)
        fetchPatients().then(patients => {
            renderDoctorPatients(patients);
        }).catch(err => console.error(err));
    }
    // ... (rest of the function) ...
}