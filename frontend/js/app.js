// --- Start of Configuration and Global Variables ---

// NOTE: Tailwind configuration must remain in each HTML file for dynamic loading.
// All other global vars and functions are extracted here.

let currentUser = null;
let isDarkMode = false;
let notificationCount = 0;

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('Page loaded, initializing...');
    updateDateTime();
    setInterval(updateDateTime, 60000);
    initializeMobileMenu();
    initializeTooltips();
    initializeNotifications();
    checkDarkMode();

    // Attach event listeners for login/registration forms on specific pages
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
    
    // Auto-init dashboard charts if a portal is the active page
    const bodyId = document.body.id;
    if (bodyId === 'doctorPortalBody') {
        setTimeout(initializeDoctorCharts, 100);
        setTimeout(initializeCalendar, 100);
        showSection('dashboard'); // Default view
    } else if (bodyId === 'patientPortalBody') {
        setTimeout(initializePatientCharts, 100);
    } else if (bodyId === 'adminPortalBody') {
        setTimeout(initializeAdminCharts, 100);
    } else if (bodyId === 'nursePortalBody') {
        setTimeout(initializeNurseCharts, 100);
    }
});

// --- End of Configuration and Global Variables ---

// --- Utility Functions ---

function toggleDarkMode() {
    console.log('Toggling dark mode...');
    isDarkMode = !isDarkMode;
    const html = document.documentElement;
    const icon = document.getElementById('darkModeIcon');

    if (isDarkMode) {
        html.classList.add('dark');
        if (icon) icon.className = 'fas fa-sun text-yellow-400';
        localStorage.setItem('darkMode', 'true');
    } else {
        html.classList.remove('dark');
        if (icon) icon.className = 'fas fa-moon text-gray-600';
        localStorage.setItem('darkMode', 'false');
    }
}

function checkDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        isDarkMode = true;
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('darkModeIcon');
        if (icon) icon.className = 'fas fa-sun text-yellow-400';
    }
}

function showPage(url) {
    window.location.href = url;
}

function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function getNameFromEmail(email) {
    const names = {
        'doctor@medicare.com': 'Dr. Sarah Johnson',
        'patient@medicare.com': 'John Smith',
        'admin@medicare.com': 'Admin User',
        'nurse@medicare.com': 'Nurse Wilson'
    };
    return names[email] || 'User';
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-icon');

    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    console.log('Showing notification:', message, type);
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification-toast bg-white dark:bg-gray-800 border-l-4 p-4 rounded-lg shadow-xl`;

    let borderColor = 'border-blue-500';
    let icon = 'fas fa-info-circle text-blue-500';

    if (type === 'success') {
        borderColor = 'border-green-500';
        icon = 'fas fa-check-circle text-green-500';
    } else if (type === 'error') {
        borderColor = 'border-red-500';
        icon = 'fas fa-exclamation-circle text-red-500';
    } else if (type === 'warning') {
        borderColor = 'border-yellow-500';
        icon = 'fas fa-exclamation-triangle text-yellow-500';
    }

    notification.className += ` ${borderColor}`;

    notification.innerHTML = `
        <div class="flex items-center">
            <i class="${icon} mr-3"></i>
            <div class="flex-1">
                <p class="text-gray-800 dark:text-white font-medium">${message}</p>
            </div>
            <button onclick="closeNotification(this)" class="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        closeNotification(notification.querySelector('button'));
    }, 5000);
}

function closeNotification(button) {
    const notification = button.closest('.notification-toast');
    notification.classList.remove('show');
    setTimeout(() => {
        notification.remove();
    }, 300);
}

function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', function () {
            sidebar.classList.toggle('open');
        });

        document.addEventListener('click', function (e) {
            if (window.innerWidth < 768 &&
                !sidebar.contains(e.target) &&
                !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
}

function initializeTooltips() {
    // Placeholder - for custom tooltips
}

function initializeNotifications() {
    setTimeout(() => {
        showNotification('Welcome to MediCare v10! All systems are operational.', 'success');
    }, 2000);
}

// --- Authentication Logic ---

function handleLogin(event) {
    event.preventDefault();
    console.log('Handling login...');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('userRole').value;

    if (!email || !password || !role) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    showLoading();

    // --- DEMO LOGIC - TO BE REPLACED BY SUPABASE API CALL ---
    const demoEmail = `${role}@medicare.com`;
    const demoPassword = 'password123';
    
    setTimeout(() => {
        hideLoading();
        
        if (email === demoEmail && password === demoPassword) {
            currentUser = { email: email, role: role, name: getNameFromEmail(email) };

            if (role === 'doctor') {
                showPage('doctor-portal.html');
            } else if (role === 'patient') {
                showPage('patient-portal.html');
            } else if (role === 'admin') {
                showPage('admin-portal.html');
            } else if (role === 'nurse') {
                showPage('nurse-portal.html');
            }
            showNotification(`Welcome ${currentUser.name}!`, 'success');
        } else {
            showNotification('Invalid credentials. Please check the demo user/pass.', 'error');
        }
    }, 1500);
    // --- END DEMO LOGIC ---
}

function handleRegistration(event) {
    event.preventDefault();
    console.log('Handling registration...');

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('registerEmail').value;
    // ... other fields ...
    const role = document.getElementById('registerRole').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (!agreeTerms) {
        showNotification('Please agree to the terms and conditions', 'error');
        return;
    }

    showLoading();
    
    // --- DEMO LOGIC - TO BE REPLACED BY SUPABASE API CALL ---
    setTimeout(() => {
        hideLoading();
        showNotification('Account created successfully! Redirecting to login...', 'success');
        showPage('login.html');

        // Pre-fill login form (simulated)
        localStorage.setItem('tempLoginEmail', email);
        localStorage.setItem('tempLoginRole', role);
    }, 2000);
    // --- END DEMO LOGIC ---
}

function showRegisterForm() {
    showPage('register.html');
}

// Password strength/match checker (retained from f5.html)
function checkPasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;

    let strength = 0;
    let message = '';
    let className = '';

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength < 3) {
        message = 'Weak password';
        className = 'password-strength-weak';
    } else if (strength < 5) {
        message = 'Medium strength';
        className = 'password-strength-medium';
    } else {
        message = 'Strong password';
        className = 'password-strength-strong';
    }

    strengthDiv.textContent = message;
    strengthDiv.className = `mt-2 text-sm ${className}`;
}

function checkPasswordMatch() {
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchDiv = document.getElementById('passwordMatch');

    if (!matchDiv) return;

    if (confirmPassword === '') {
        matchDiv.textContent = '';
        return;
    }

    if (password === confirmPassword) {
        matchDiv.textContent = 'Passwords match';
        matchDiv.className = 'mt-2 text-sm text-green-600';
    } else {
        matchDiv.textContent = 'Passwords do not match';
        matchDiv.className = 'mt-2 text-sm text-red-600';
    }
}

function toggleMedicalLicense() {
    const role = document.getElementById('registerRole').value;
    const licenseDiv = document.getElementById('medicalLicense');
    const licenseInput = document.getElementById('licenseNumber');

    if (role === 'doctor' || role === 'nurse') {
        licenseDiv.classList.remove('hidden');
        licenseInput.required = true;
    } else {
        licenseDiv.classList.add('hidden');
        licenseInput.required = false;
    }
}


// --- Portal Specific Logic (Navigation) ---

function showSection(sectionId) {
    console.log('Showing section:', sectionId);

    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.classList.remove('active');
    });

    const activeItem = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');

        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const titles = {
                'dashboard': 'Dashboard',
                'calendar': 'Calendar',
                'appointments': 'Appointments',
                'patients': 'My Patients',
                'consultations': 'Consultations',
                'prescriptions': 'Prescriptions',
                'reports': 'Reports'
            };
            pageTitle.textContent = titles[sectionId] || 'Dashboard';
        }

        if (sectionId === 'calendar') {
            initializeCalendar();
        }
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function toggleMessages() {
    showNotification('Messages feature coming soon!', 'info');
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function (e) {
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const profileDropdown = document.getElementById('profileDropdown');

    if (notificationsDropdown && !e.target.closest('#notificationsDropdown') && !e.target.closest('[onclick="toggleNotifications()"]')) {
        notificationsDropdown.classList.add('hidden');
    }

    if (profileDropdown && !e.target.closest('#profileDropdown') && !e.target.closest('[onclick="toggleProfileMenu()"]')) {
        profileDropdown.classList.add('hidden');
    }
});


// --- Chart and Calendar Initialization (Requires Chart.js and FullCalendar imports in HTML) ---

function initializeDoctorCharts() {
    // Appointments Chart
    const appointmentsCtx = document.getElementById('appointmentsChart');
    if (appointmentsCtx && typeof Chart !== 'undefined') {
        new Chart(appointmentsCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Appointments',
                    data: [12, 19, 8, 15, 22, 8, 14],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    // Demographics Chart
    const demographicsCtx = document.getElementById('demographicsChart');
    if (demographicsCtx && typeof Chart !== 'undefined') {
        new Chart(demographicsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Male', 'Female', 'Other'],
                datasets: [{ data: [45, 52, 3], backgroundColor: ['#3b82f6', '#ec4899', '#10b981'] }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

function initializePatientCharts() {
    // Health Chart
    const healthCtx = document.getElementById('patientHealthChart');
    if (healthCtx && typeof Chart !== 'undefined') {
        new Chart(healthCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Blood Pressure',
                    data: [120, 118, 125, 122, 119, 121],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Heart Rate',
                    data: [72, 75, 70, 73, 71, 74],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: false } } }
        });
    }
}

function initializeCalendar() {
    const calendarEl = document.getElementById('doctorCalendar');
    if (calendarEl && typeof FullCalendar !== 'undefined') {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: [
                { title: 'John Smith - Follow-up', start: '2024-12-20T10:00:00', end: '2024-12-20T10:30:00', color: '#3b82f6' },
                { title: 'Maria Rodriguez - Consultation', start: '2024-12-20T11:00:00', end: '2024-12-20T11:45:00', color: '#10b981' },
                { title: 'Robert Wilson - Urgent', start: '2024-12-20T14:00:00', end: '2024-12-20T14:30:00', color: '#ef4444' }
            ],
            eventClick: function (info) {
                showNotification(`Appointment: ${info.event.title}`, 'info');
            }
        });
        calendar.render();
    }
}

function initializeAdminCharts() { /* Admin chart initialization logic here */ }
function initializeNurseCharts() { /* Nurse chart initialization logic here */ }

// --- Modal Functionality (Portal specific actions - kept as placeholders) ---
function quickAddPatient() { showNotification('Add Patient form would open here', 'info'); }
function addAppointment() { showNotification('Add Appointment form would open here', 'info'); }
function startConsultation(patientId) { showNotification(`Starting consultation for ${patientId}`, 'info'); }
function bookAppointment() { showNotification('Appointment booking form would open here', 'info'); }
function viewTestResults() { showNotification('Test results viewer would open here', 'info'); }
function viewPrescriptions() { showNotification('Prescriptions viewer would open here', 'info'); }
function messageDoctor() { showNotification('Messaging system would open here', 'info'); }
function viewProfile() { showNotification('Profile viewer would open here', 'info'); }
function editProfile() { showNotification('Profile editor would open here', 'info'); }
function changePassword() { showNotification('Change password form would open here', 'info'); }
function openSettings() { showNotification('Settings panel would open here', 'info'); }
function getHelp() { showNotification('Help & Support center would open here', 'info'); }
function showForgotPassword() { showNotification('Forgot password form would open here', 'info'); }