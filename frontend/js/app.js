// frontend/js/app.js - CORE LOGIC FOR API INTEGRATION

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
    
    // Attempt to load saved state
    loadAuthState();
    
    // Attach form listeners for authentication pages
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
        // Attach live validation
        const passInput = document.getElementById('registerPassword');
        const confirmInput = document.getElementById('confirmPassword');
        if (passInput) passInput.addEventListener('input', () => checkPasswordStrength(passInput.value));
        if (confirmInput) confirmInput.addEventListener('input', checkPasswordMatch);
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
        // Attach the JWT for authentication
        'Authorization': `Bearer ${currentToken}` 
    };

    const config = {
        method: method,
        headers: headers,
    };
    
    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Force logout if token is invalid or expired
                clearAuthState();
                showPage('login.html');
            }
            throw new Error(data.message || data.error || `API Error: ${response.status}`);
        }

        return data;

    } catch (error) {
        console.error("Authenticated Fetch Error:", error);
        throw error; // Re-throw to be caught by the calling function
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
            
            // Redirect to the appropriate portal using the stored role
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
    
    // Gather data (assuming all fields from the form are collected)
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
            // Store registration info to pre-fill login page
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


// --- DEMO/PORTAL FUNCTION REPLACEMENTS (High-Priority: Appointments) ---

// Replace the old demo function with a real API call
async function fetchAppointmentsForUser() {
    try {
        // Fetch appointments for the current user and their role
        const endpoint = `/appointments?role=${currentUser.role}`;
        const appointments = await fetchAuthenticated(endpoint, 'GET');
        
        // This is where you would call a function to render the data in the DOM
        console.log("Fetched Appointments:", appointments);
        return appointments;

    } catch (error) {
        showNotification('Failed to load appointments.', 'error');
        return [];
    }
}

// Replace the old demo function with a real API call
async function createNewAppointment(appointmentData) {
    try {
        // The API expects patientId, doctorId, date, reason
        const response = await fetchAuthenticated('/appointments', 'POST', {
            patientId: currentUser.role === 'patient' ? currentUser.id : appointmentData.patientId,
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

// --- PLACEHOLDER FUNCTIONS (Minimal changes needed) ---

// Placeholder functions for chart initialization and portal specific logic 
// (These require Chart.js and FullCalendar imports in HTML to work)

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
function showLoading() { /* Utility function */ }
function hideLoading() { /* Utility function */ }
function toggleDarkMode() { /* Utility function */ }
function togglePasswordVisibility(inputId) { /* Utility function */ }
function toggleNotifications() { /* Utility function */ }
function toggleMessages() { /* Utility function */ }
function toggleProfileMenu() { /* Utility function */ }
// ... other portal specific actions (quickAddPatient, viewTestResults, etc.) ...
// --- NEW FUNCTION: Patient Appointment Form Handler ---
async function handlePatientAppointmentForm(event) {
    event.preventDefault();
    closeModal();
    showLoading();

    const form = event.target;
    const date = form.querySelector('[name="date"]').value;
    const time = form.querySelector('[name="time"]').value;
    const doctorName = form.querySelector('[name="doctor"]').value;
    const reason = form.querySelector('[name="reason"]').value;
    const type = form.querySelector('[name="appointmentType"]:checked').value;

    // NOTE: In a real application, you would need the actual UUID of the doctor (doctorId), 
    // not just their name. For now, we'll use a placeholder UUID and pass the full date/time.
    const appointmentDateTime = `${date}T${time}:00Z`;
    const dummyDoctorId = "550e8400-e29b-41d4-a716-446655440000"; // Placeholder Doctor UUID

    try {
        const newAppointment = await createNewAppointment({
            // patientId is automatically picked up from the JWT by the backend (correct security practice)
            doctorId: dummyDoctorId, 
            date: appointmentDateTime,
            reason: `${type}: ${reason}` 
        });

        hideLoading();
        showNotification(`Appointment confirmed with ${doctorName}! Status: ${newAppointment.status}`, 'success');
        
        // Refresh the page or the relevant section to show the new appointment
        window.location.reload(); 

    } catch (error) {
        hideLoading();
        showNotification('Failed to book appointment. Please try again.', 'error');
    }
}