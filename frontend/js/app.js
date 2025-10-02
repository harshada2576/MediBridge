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
        // Pre-fill login data if stored after registration
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
        // Attach live validation (placeholders: ensure these utility functions exist)
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
        // Auto-redirect authenticated user if they land on login/register
        if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
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

// Global page navigation (updated to use correct file names)
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
            // Patient ID is implied from JWT on the backend
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
    
    // Fetch data and trigger rendering for the Doctor portal
    if (currentUser.role === 'doctor') {
        fetchAppointmentsForUser().then(appointments => {
            renderTodaySchedule(appointments);
            renderFullAppointments(appointments);
        }).catch(err => console.error(err));
    }
}

// PATIENT APPOINTMENT BOOKING HANDLER
async function handlePatientAppointmentForm(event) {
    // This is called from the bookAppointment() function defined in patient_portal.html
    // The bookAppointment() function handles the form submission and validation.
    
    // We are trusting the calling function (bookAppointment) has already called preventDefault and closeModal.
    showLoading();

    const form = event.target;
    const date = form.querySelector('[name="date"]').value;
    const time = form.querySelector('[name="time"]').value;
    const doctorName = form.querySelector('[name="doctor"]').value;
    const reason = form.querySelector('[name="reason"]').value;
    const type = form.querySelector('[name="appointmentType"]:checked').value;

    const appointmentDateTime = `${date}T${time}:00Z`;
    // NOTE: This MUST be a valid UUID present in your Supabase 'profiles' table for a doctor
    const dummyDoctorId = "550e8400-e29b-41d4-a716-446655440000"; 

    try {
        const newAppointment = await createNewAppointment({
            doctorId: dummyDoctorId, 
            date: appointmentDateTime,
            reason: `${type}: ${reason}` 
        });

        hideLoading();
        showNotification(`Appointment confirmed with ${doctorName}!`, 'success');
        
        // Refresh page to show the new appointment in the upcoming list
        window.location.reload(); 

    } catch (error) {
        hideLoading();
        showNotification('Failed to book appointment. Check console for details.', 'error');
    }
}


// PATIENT PORTAL RENDERING LOGIC
async function renderPatientPortalHeader() {
    // 1. Update all instances of user name and welcome message
    const nameElements = document.querySelectorAll('.currentUser-name');
    if (currentUser) {
        nameElements.forEach(el => {
            el.textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
        });
    }

    // 2. Fetch all necessary data concurrently
    const [appointments, records] = await Promise.all([
        fetchAppointmentsForUser(),
        fetchRecordsForUser()
    ]);

    // 3. Render specific sections
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
function closeModal() { 
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
}
// Note: showModal is not defined here but is called by bookAppointment and relies on the modal HTML structure.