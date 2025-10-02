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
        } else if (window.location.pathname.includes('-portal.html')) {
            renderPortalHeader(); // Generic Doctor/Admin/Nurse portal logic
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

// --- PORTAL RENDERING LOGIC ---

function renderPortalHeader() {
    // Logic for Doctor, Admin, Nurse portals (using currentUser-name class)
    const nameElements = document.querySelectorAll('.currentUser-name');
    if (currentUser) {
        nameElements.forEach(el => el.textContent = currentUser.name);
    }
    
    if (currentUser.role === 'doctor') {
        fetchAppointmentsForUser().then(appointments => {
            renderTodaySchedule(appointments);
            renderFullAppointments(appointments);
        }).catch(err => console.error(err));
    }
}


// --- DOCTOR PORTAL RENDERING (PLACEHOLDERS/UTILITIES) ---

function renderTodaySchedule(appointments) { 
    const list = document.getElementById('todaysScheduleList');
    if (!list) return;

    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.appointment_date.startsWith(today));
    
    list.innerHTML = '';

    if (todayAppointments.length === 0) {
        list.innerHTML = '<p class="text-gray-500 p-4">No appointments scheduled for today.</p>';
        return;
    }

    todayAppointments.forEach(apt => {
        const patientName = apt.patient ? apt.patient.name : 'Unknown Patient';
        const startTime = new Date(apt.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const isUrgent = apt.reason.toLowerCase().includes('urgent');
        const colorClass = isUrgent ? 'from-red-50 to-red-100 border-red-500' : 'from-blue-50 to-blue-100 border-blue-500';
        
        const item = document.createElement('div');
        item.className = `flex items-center space-x-4 p-4 bg-gradient-to-r ${colorClass} rounded-xl border-l-4`;
        item.innerHTML = `
            <div class="text-center min-w-0">
                <p class="text-lg font-bold text-gray-800 dark:text-white">${startTime.split(' ')[0]}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${startTime.split(' ')[1]}</p>
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-800 dark:text-white">${patientName}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${apt.reason}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Status: ${apt.status}</p>
            </div>
            <button onclick="startConsultation('${apt.patient_id}', '${patientName}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Start</button>
        `;
        list.appendChild(item);
    });
}

function renderFullAppointments(appointments) {
    const tableBody = document.getElementById('fullAppointmentsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    appointments.forEach(apt => {
        const patientName = apt.patient ? apt.patient.name : 'Unknown Patient';
        const date = new Date(apt.appointment_date).toLocaleDateString();
        const time = new Date(apt.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const statusClass = apt.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

        const row = document.createElement('tr');
        row.className = 'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors';
        row.innerHTML = `
            <td class="py-4 px-4">
                <p class="font-semibold text-gray-800 dark:text-white">${patientName}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">${apt.reason}</p>
            </td>
            <td class="py-4 px-4">
                <p class="font-medium text-gray-800 dark:text-white">${date}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">${time}</p>
            </td>
            <td class="py-4 px-4">
                <span class="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm">Consultation</span>
            </td>
            <td class="py-4 px-4">
                <span class="${statusClass} px-3 py-1 rounded-full text-sm">${apt.status}</span>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center space-x-2">
                    <button class="tooltip text-blue-600 hover:text-blue-800 dark:text-blue-400 p-2 rounded-lg" onclick="startConsultation('${apt.patient_id}', '${patientName}')" data-tooltip="Start Consultation">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="tooltip text-red-600 hover:text-red-800 dark:text-red-400 p-2 rounded-lg" onclick="cancelAppointment('${apt.id}')" data-tooltip="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --- PATIENT PORTAL RENDERING LOGIC ---

async function renderPatientPortalHeader() {
    const nameElements = document.querySelectorAll('.currentUser-name');
    if (currentUser) {
        nameElements.forEach(el => {
            el.textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
        });
    }

    const [appointments, records] = await Promise.all([
        fetchAppointmentsForUser(),
        fetchRecordsForUser()
    ]);

    renderPatientAppointments(appointments);
    renderPatientRecords(records);
}


function renderPatientAppointments(appointments) {
    const list = document.getElementById('patientAppointmentsList');
    if (!list) return;

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
        item.className = `border-l-4 ${colorClass} pl-4 py-3 rounded-r-lg`;
        item.innerHTML = `
            <p class="font-semibold text-gray-800 dark:text-white">${doctorName}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">${apt.reason}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${date} at ${time}</p>
        `;
        list.appendChild(item);
    });
}

function renderPatientRecords(records) {
    const list = document.getElementById('patientRecordsList');
    if (!list) return;
    
    const reports = records.filter(r => r.record_type.includes('Report') || r.record_type.includes('X-Ray') || r.record_type.includes('Prescription'))
                           .sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    
    list.innerHTML = ''; 
    
    if (reports.length === 0) {
        list.innerHTML = '<p class="text-gray-500 p-4 text-sm">No recent test results or prescriptions available.</p>';
        return;
    }

    reports.slice(0, 2).forEach(record => {
        const date = new Date(record.record_date).toLocaleDateString();
        const isLab = record.record_type === 'Lab Report';
        const isPrescription = record.record_type === 'Prescription';
        const title = record.title;
        
        let colorClass = isLab ? 'bg-green-50 dark:bg-green-900/20' : isPrescription ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-blue-50 dark:bg-blue-900/20';
        
        const statusSpan = record.status === 'Final' ? 
            `<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Final</span>` : 
            `<span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">Pending</span>`;

        const item = document.createElement('div');
        item.className = `flex justify-between items-center p-4 ${colorClass} rounded-xl`;
        item.innerHTML = `
            <div>
                <p class="font-semibold text-gray-800 dark:text-white">${title}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${date}</p>
            </div>
            ${statusSpan}
        `;
        list.appendChild(item);
    });
}


// --- DOCTOR PORTAL FORM HANDLERS (C.1 & C.2) ---

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

// --- MODAL LAUNCHERS (Used by Doctor/Patient HTML) ---

function startConsultation(patientId, patientName = 'Patient') {
    showModal(
        `Start Consultation: ${patientName}`,
        `
        <form id="consultationForm">
            <input type="hidden" name="patientId" value="${patientId}">
            <input type="hidden" name="patientName" value="${patientName}">

            <div class="space-y-4">
                <div class="bg-blue-50 dark:bg-gray-700 p-3 rounded-lg border border-blue-200 dark:border-gray-600">
                    <p class="font-medium text-sm">Patient: ${patientName} (ID: ${patientId.substring(0, 8)}...)</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consultation Notes *</label>
                    <textarea name="notes" required class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg h-32 focus:ring-2 focus:ring-blue-500" placeholder="Detailed notes on patient history and examination findings..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnosis/Impression</label>
                    <input type="text" name="diagnosis" class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., Acute Bronchitis">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Follow-up Date</label>
                    <input type="date" name="followUp" class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
        </form>
        `,
        'Save Consultation',
        () => {
             const form = document.getElementById('consultationForm');
             if (form.checkValidity()) {
                 handleConsultationForm({ preventDefault: () => {}, target: form });
             } else {
                 form.reportValidity();
             }
        }
    );
}

function prescribeMedication(patientId = 'N/A', patientName = 'Unknown Patient') {
    showModal(
        `New Prescription for ${patientName}`,
        `
        <form id="prescriptionForm">
            <input type="hidden" name="patientId" value="${patientId}">
            <input type="hidden" name="patientName" value="${patientName}">

            <div class="space-y-4">
                <div class="bg-blue-50 dark:bg-gray-700 p-3 rounded-lg border border-blue-200 dark:border-gray-600">
                    <p class="font-medium text-sm">Patient: ${patientName}</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medication Name *</label>
                    <input type="text" name="medication" required class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., Lisinopril">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dosage *</label>
                        <input type="text" name="dosage" required class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., 10mg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency *</label>
                        <select name="frequency" required class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="Once Daily">Once Daily</option>
                            <option value="Twice Daily">Twice Daily</option>
                            <option value="Three Times Daily">Three Times Daily</option>
                            <option value="As Needed">As Needed</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                    <input type="text" name="duration" class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., 30 days">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Instructions</label>
                    <textarea name="instructions" class="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg h-20 focus:ring-2 focus:ring-blue-500" placeholder="Take with food, do not crush, etc."></textarea>
                </div>
            </div>
        </form>
        `,
        'Issue Prescription',
        () => {
             const form = document.getElementById('prescriptionForm');
             if (form.checkValidity()) {
                 handlePrescriptionForm({ preventDefault: () => {}, target: form });
             } else {
                 form.reportValidity();
             }
        }
    );
}


// --- UTILITY PLACEHOLDERS (Ensure these match your HTML calls) ---

function initializeDoctorCharts() { /* Chart.js logic */ }
function initializePatientCharts() { /* Chart.js logic */ }
function initializeAdminCharts() { /* Chart.js logic */ }
function initializeNurseCharts() { /* Chart.js logic */ }
function initializeCalendar() { /* FullCalendar logic */ }
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
function showNotification(message, type) { /* Utility function */ }

// NOTE: showModal function must be correctly defined, replace your existing placeholder if needed.
function showModal(title, content, actionText, actionCallback) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalAction = document.getElementById('modalAction');

    if (!modal) return;
    
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    modalAction.textContent = actionText;

    // Remove old listeners and add the new one
    // We clone to safely remove all previous listeners
    const newModalAction = modalAction.cloneNode(true);
    modalAction.parentNode.replaceChild(newModalAction, modalAction);

    newModalAction.addEventListener('click', actionCallback);
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Additional utility functions called by HTML (placeholder implementation)
function quickAddPatient() { showNotification('Add Patient form coming soon!', 'info'); }
function cancelAppointment(aptId) { showNotification(`Appointment ${aptId} cancelled (API pending)!`, 'warning'); }
function addAppointment() { showNotification('Add Appointment form coming soon!', 'info'); }
function viewTestResults() { showNotification('Viewing Test Results (API pending)!', 'info'); }
function viewPrescriptions() { showNotification('Viewing Prescriptions (API pending)!', 'info'); }
function messageDoctor() { showNotification('Messaging system coming soon!', 'info'); }