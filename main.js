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
            alert('email already in use');
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
        
        // Report form logic
        const lostLink = reportDropdown.querySelector('a:nth-child(1)');
        const foundLink = reportDropdown.querySelector('a:nth-child(2)');
        
        if (lostLink) {
            lostLink.addEventListener('click', function(e) {
                e.preventDefault();
                showReportForm('lost');
            });
        }
        if (foundLink) {
            foundLink.addEventListener('click', function(e) {
                e.preventDefault();
                showReportForm('found');
            });
        }
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
    // Show only the logged-in user's reports in the dashboard
    const userReports = JSON.parse(localStorage.getItem(`reports_${loggedInEmail}`)) || [];
    // Example: update activity log table
    const activityTableBody = document.querySelector('.activity-table tbody');
    if (activityTableBody) {
        if (userReports.length === 0) {
            activityTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-inbox"></i><p>No activity yet. Start by reporting an item!</p></div></td></tr>`;
        } else {
            activityTableBody.innerHTML = userReports.map(report => `
                <tr>
                  <td class="item-cell">
                    <div class="item-thumb">
                      <i class="fas ${report.type === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i>
                    </div>
                    <div class="item-meta">
                      <span class="item-name">${report.itemName}</span>
                      <span class="item-date">Reported: ${new Date(report.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td><span class="badge-category">${report.category}</span></td>
                  <td><span class="badge-status ${report.claimed ? 'resolved' : 'pending'}">${report.claimed ? 'Claimed' : 'Pending'}</span></td>
                  <td><button class="btn-view">View Details</button></td>
                </tr>
            `).join('');
        }
    }
}

// Show report form
function showReportForm(type) {
    const modal = document.createElement('div');
    modal.id = 'report-form-modal';
    modal.style.cssText = 'display:flex;position:fixed;z-index:2000;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,0.5);align-items:center;justify-content:center;';
    
    modal.innerHTML = `
        <div style="background-color:white;padding:2rem;border-radius:12px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;">
            <span style="color:#aaa;float:right;font-size:2rem;font-weight:bold;cursor:pointer;" onclick="document.getElementById('report-form-modal').remove();">&times;</span>
            <h2 style="color:#1b5e20;margin-bottom:1.5rem;">Report ${type === 'lost' ? 'Lost' : 'Found'} Item</h2>
            
            <form id="report-form">
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.5rem;color:#333;">Item Name</label>
                    <input type="text" id="item-name" placeholder="Enter item name" style="width:100%;padding:0.7rem;border:1px solid #ddd;border-radius:8px;font-family:'Poppins',sans-serif;" required>
                </div>
                
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.5rem;color:#333;">Category</label>
                    <select id="item-category" style="width:100%;padding:0.7rem;border:1px solid #ddd;border-radius:8px;font-family:'Poppins',sans-serif;" required>
                        <option value="">Select category</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Documents">Documents</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.5rem;color:#333;">Location</label>
                    <input type="text" id="item-location" placeholder="Where was it ${type === 'lost' ? 'lost' : 'found'}?" style="width:100%;padding:0.7rem;border:1px solid #ddd;border-radius:8px;font-family:'Poppins',sans-serif;" required>
                </div>
                
                <div style="margin-bottom:1rem;">
                    <label style="display:block;font-weight:600;margin-bottom:0.5rem;color:#333;">Description</label>
                    <textarea id="item-description" placeholder="Provide details about the item" style="width:100%;padding:0.7rem;border:1px solid #ddd;border-radius:8px;font-family:'Poppins',sans-serif;resize:vertical;min-height:100px;" required></textarea>
                </div>
                
                <button type="submit" style="width:100%;padding:0.8rem;background:linear-gradient(135deg,#2e7d32,#43a047);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Submit Report</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('report-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const loggedInEmail = localStorage.getItem('siit_logged_in');
        if (!loggedInEmail) {
            alert('Please log in to submit a report.');
            return;
        }
        
        const report = {
            type: type,
            itemName: document.getElementById('item-name').value,
            category: document.getElementById('item-category').value,
            location: document.getElementById('item-location').value,
            description: document.getElementById('item-description').value,
            date: new Date().toISOString()
        };
        
        // Save to user's own reports
        const userReports = JSON.parse(localStorage.getItem(`reports_${loggedInEmail}`)) || [];
        userReports.push(report);
        localStorage.setItem(`reports_${loggedInEmail}`, JSON.stringify(userReports));
        // Save to global reports for browse page
        let allReports = JSON.parse(localStorage.getItem('siit_all_reports')) || [];
        const users = JSON.parse(localStorage.getItem('siit_users')) || [];
        const user = users.find(u => u.email === loggedInEmail);
        report.userName = user ? user.firstName + ' ' + user.lastName : '';
        report.userEmail = loggedInEmail;
        report.claimed = false;
        allReports.push(report);
        localStorage.setItem('siit_all_reports', JSON.stringify(allReports));
        alert('Report submitted successfully!');
        window.location.href = 'browse.html';
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}
