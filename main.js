// main.js

// Registration logic for SignUp.html
if (document.querySelector('.register-btn')) {
    const registerBtn = document.querySelector('.register-btn');
    registerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const inputs = document.querySelectorAll('.signup-body input');
        const firstName = inputs[0].value.trim();
        const lastName = inputs[1].value.trim();
        const phone = inputs[2].value.trim();
        const email = inputs[3].value.trim();
        const password = inputs[4].value;
        const confirmPassword = inputs[5].value;
        if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
            alert('Please fill in all fields.');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        // Get users array from localStorage
        let users = JSON.parse(localStorage.getItem('siit_users')) || [];
        if (users.some(u => u.email === email)) {
            alert('Email already in use');
            return;
        }
        users.push({firstName, lastName, phone, email, password});
        localStorage.setItem('siit_users', JSON.stringify(users));
        alert('Account created successfully! Please log in.');
        window.location.href = 'index.html';
    });
}

// Login logic for index.html
if (document.getElementById('login-btn')) {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const users = JSON.parse(localStorage.getItem('siit_users')) || [];
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            alert('Invalid email or password.');
            return;
        }
        localStorage.setItem('siit_logged_in', email);
        window.location.href = 'dashboard.html';
    });
}

// Dashboard logic for dashboard.html
if (window.location.pathname.endsWith('dashboard.html')) {
    // Redirect to login if not logged in
    const loggedInEmail = localStorage.getItem('siit_logged_in');
    if (!loggedInEmail) {
        window.location.href = 'index.html';
    }
    // Set user name in dashboard
    const users = JSON.parse(localStorage.getItem('siit_users')) || [];
    const user = users.find(u => u.email === loggedInEmail);
    if (user) {
        const userNameElem = document.querySelector('.user-name');
        const userAvatarElem = document.querySelector('.user-avatar');
        if (userNameElem) userNameElem.textContent = user.firstName + ' ' + user.lastName;
        if (userAvatarElem) userAvatarElem.textContent = (user.firstName[0] + (user.lastName[0] || '')).toUpperCase();
        // Also update welcome text if present
        const welcomeText = document.querySelector('.welcome-sub strong');
        if (welcomeText) welcomeText.textContent = user.firstName + ' ' + user.lastName;
    }
    // Toggle Report Dropdown
    const reportBtn = document.getElementById('reportBtn');
    const reportDropdown = document.getElementById('reportDropdown');
    if (reportBtn && reportDropdown) {
        reportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            reportDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => {
            reportDropdown.classList.remove('show');
        });
    }
    // User dropdown
    const navUser = document.querySelector('.nav-user');
    if (navUser) {
        navUser.addEventListener('click', () => {
            navUser.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!navUser.contains(e.target)) navUser.classList.remove('open');
        });
    }
    // Logout logic
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('siit_logged_in');
            window.location.href = 'index.html';
        });
    }
}
