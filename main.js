// main.js

// Admin credentials for separate admin dashboard access
const ADMIN_CREDENTIALS = {
    email: 'admin@ctu.edu',
    password: 'admin123'
};

// Declare loggedInEmail once for all page logic
const loggedInEmail = localStorage.getItem('siit_logged_in');
const adminLoggedIn = localStorage.getItem('siit_admin_logged_in');

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
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            localStorage.setItem('siit_admin_logged_in', 'admin');
            localStorage.removeItem('siit_logged_in');
            window.location.href = 'admin.html';
            return;
        }
        const users = JSON.parse(localStorage.getItem('siit_users')) || [];
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            alert('Invalid email or password.');
            return;
        }
        localStorage.setItem('siit_logged_in', email);
        localStorage.removeItem('siit_admin_logged_in');
        window.location.href = 'dashboard.html';
    });
}

// Dashboard logic for dashboard.html
if (window.location.href.includes('dashboard.html')) {
    // Redirect to login if not logged in or if admin is logged in
    if (!loggedInEmail || adminLoggedIn) {
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
    // Update stats
    const lostCount = userReports.filter(r => r.type === 'lost').length;
    const foundCount = userReports.filter(r => r.type === 'found').length;
    document.querySelector('.stat-card.lost .stat-number').textContent = lostCount;
    document.querySelector('.stat-card.found .stat-number').textContent = foundCount;
    // Total claimed (items this user has claimed)
    let allReports = JSON.parse(localStorage.getItem('siit_all_reports')) || [];
    const claimedCount = allReports.filter(r => r.claimerEmail === loggedInEmail).length;
    document.querySelector('.stat-card.claimed .stat-number').textContent = claimedCount;
    // Example: update activity log table
    const activityTableBody = document.querySelector('.activity-table tbody');
    // Combine user's own reports and reports they have claimed
    let claimedByUser = allReports.filter(r => r.claimerEmail === loggedInEmail);
    let combinedReports = [...userReports, ...claimedByUser.filter(r => !userReports.some(ur => ur.date === r.date && ur.itemName === r.itemName))];
    // Sort newest to oldest
    combinedReports = combinedReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (activityTableBody) {
        if (combinedReports.length === 0) {
            activityTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-inbox"></i><p>No activity yet. Start by reporting or claiming an item!</p></div></td></tr>`;
        } else {
            activityTableBody.innerHTML = combinedReports.map((report, idx) => `
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
                  <td><button class="btn-view" onclick="showDashboardReportDetails(${idx})">View Details</button></td>
                </tr>
            `).join('');
        }
    }
    // View details modal for activity log
    window.showDashboardReportDetails = function(idx) {
        const report = combinedReports[idx];
        let modal = document.getElementById('dashboard-report-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dashboard-report-modal';
            modal.style.cssText = 'position:fixed;z-index:2000;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div style="background:#fff;padding:2rem;border-radius:12px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;position:relative;">
                <span style="position:absolute;top:10px;right:18px;font-size:2rem;cursor:pointer;color:#aaa;font-weight:bold;" onclick="document.getElementById('dashboard-report-modal').remove()">&times;</span>
                <h2>${report.itemName}</h2>
                <p style="color: #666; margin-bottom: 1.5rem;">
                    <strong>Type:</strong> <span style="text-transform: uppercase; color: ${report.type === 'lost' ? '#e05252' : '#2e7d32'};">${report.type}</span>
                </p>
                ${report.photo ? `<img src="${report.photo}" style="max-width:100%;max-height:250px;border-radius:10px;margin-bottom:1rem;">` : ''}
                <div style="margin-bottom:1rem;"><strong>Category:</strong> ${report.category}</div>
                <div style="margin-bottom:1rem;"><strong>Location:</strong> ${report.location}</div>
                <div style="margin-bottom:1rem;"><strong>Date Reported:</strong> ${new Date(report.date).toLocaleString()}</div>
                <div style="margin-bottom:1rem;"><strong>Description:</strong> ${report.description}</div>
                <div style="margin-bottom:1rem;"><strong>Status:</strong> ${report.claimed ? 'Claimed' : 'Pending'}</div>
                ${report.claimed && report.claimerName ? `<div style='margin-bottom:1rem;'><strong>Claimed By:</strong> ${report.claimerName} (${report.claimerEmail})</div>` : ''}
            </div>
        `;
    }
    // Show claim requests in dashboard
    const claimRequests = JSON.parse(localStorage.getItem(`claims_${loggedInEmail}`)) || [];
    const claimTableBody = document.querySelector('.claims-panel tbody');
    if (claimTableBody) {
        if (claimRequests.length === 0) {
            claimTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-inbox"></i><p>No claim requests yet.</p></div></td></tr>`;
        } else {
            claimTableBody.innerHTML = claimRequests.map((req, idx) => `
                <tr>
                  <td class="item-cell">
                    <div class="item-thumb">
                      <i class="fas ${req.type === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i>
                    </div>
                    <div class="item-meta">
                      <span class="item-name">${req.itemName}</span>
                      <span class="item-date">Reported: ${new Date(req.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td><span class="badge-category">${req.category}</span></td>
                  <td><span class="badge-status ${req.claimStatus === 'approved' ? 'resolved' : req.claimStatus === 'rejected' ? 'rejected' : 'pending'}">
                    ${req.claimStatus === 'approved' ? 'Claimed' : req.claimStatus === 'rejected' ? 'Rejected' : 'Pending for approval'}
                  </span></td>
                  <td>${req.claimResponse ? req.claimResponse : ''}</td>
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

// Report page logic for report.html
if (window.location.pathname.endsWith('report.html')) {
    // Block access if not logged in
    if (!loggedInEmail) {
        alert('You must log in first!');
        window.location.replace('index.html');
        throw new Error('Not logged in');
    }
    // Set user name and avatar
    const users = JSON.parse(localStorage.getItem('siit_users')) || [];
    const user = users.find(u => u.email === loggedInEmail);
    window.addEventListener('DOMContentLoaded', function() {
        if (user) {
            const userNameElem = document.querySelector('.user-name');
            const userAvatarElem = document.querySelector('.user-avatar');
            if (userNameElem) userNameElem.textContent = user.firstName + ' ' + user.lastName;
            if (userAvatarElem) userAvatarElem.textContent = (user.firstName[0] + (user.lastName[0] || '')).toUpperCase();
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
        // Report form submission
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            reportForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const itemType = document.getElementById('itemType').value;
                const itemCategory = document.getElementById('itemCategory').value;
                const itemName = document.getElementById('itemName').value.trim();
                const itemColor = document.getElementById('itemColor').value.trim();
                const itemLocation = document.getElementById('itemLocation').value.trim();
                const itemDetails = document.getElementById('itemDetails').value.trim();
                const itemPhoto = document.getElementById('itemPhoto').files[0];
                
                if (!itemName || !itemColor || !itemLocation) {
                    alert('Please fill in all required fields.');
                    return;
                }
                
                let photoData = null;
                if (itemPhoto) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        photoData = e.target.result;
                        saveReport(itemType, itemCategory, itemName, itemColor, itemLocation, itemDetails, photoData);
                    };
                    reader.readAsDataURL(itemPhoto);
                } else {
                    saveReport(itemType, itemCategory, itemName, itemColor, itemLocation, itemDetails, null);
                }
            });
        }
        function saveReport(type, category, itemName, itemColor, location, details, photo) {
            const report = {
                type: type,
                category: category,
                itemName: itemName,
                description: itemColor + (details ? ' - ' + details : ''),
                location: location,
                photo: photo,
                date: new Date().toISOString(),
                claimed: false,
                claimStatus: 'open',
                claimRequestedAt: null,
                claimResponse: null
            };
            
            // Save to user's own reports
            const userReports = JSON.parse(localStorage.getItem(`reports_${loggedInEmail}`)) || [];
            userReports.push(report);
            localStorage.setItem(`reports_${loggedInEmail}`, JSON.stringify(userReports));
            
            // Save to global reports for browse page
            let allReports = JSON.parse(localStorage.getItem('siit_all_reports')) || [];
            report.userName = user ? user.firstName + ' ' + user.lastName : '';
            report.userEmail = loggedInEmail;
            allReports.push(report);
            localStorage.setItem('siit_all_reports', JSON.stringify(allReports));
            
            alert('Report submitted successfully!');
            document.getElementById('reportForm').reset();
            document.getElementById('fileName').textContent = '';
            displayUserReports();
        }
        // Display user's own reports in the right box (Available Reports) with filter buttons
        let currentFilter = 'all';
        function displayUserReports() {
            const userReports = JSON.parse(localStorage.getItem(`reports_${loggedInEmail}`)) || [];
            const browseList = document.getElementById('browseList');
            const browseEmpty = document.getElementById('browseEmpty');
            let filtered = userReports;
            if (currentFilter === 'lost') filtered = userReports.filter(r => r.type === 'lost');
            if (currentFilter === 'found') filtered = userReports.filter(r => r.type === 'found');
            filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (!filtered.length) {
                browseList.innerHTML = '';
                browseEmpty.style.display = '';
                return;
            }
            browseEmpty.style.display = 'none';
            browseList.innerHTML = filtered.map((report, idx) => `
                <div class="report-card">
                    <button onclick="deleteReport(${idx})" style="background:#e05252;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;font-weight:600;cursor:pointer;float:left;margin-right:1rem;">Delete</button>
                    ${report.photo ? `<img src="${report.photo}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;">` : ''}
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:1.1rem;">${report.itemName}</div>
                        <div style="color:#4a6352;font-size:0.95rem;">${report.category} | ${report.type} | ${new Date(report.date).toLocaleDateString()}</div>
                        <div style="color:#888;font-size:0.9rem;">${report.description}</div>
                    </div>
                </div>
            `).join('');
        }
        // Add filter button listeners
        window.setReportFilter = function(type) {
            currentFilter = type;
            displayUserReports();
        }
        displayUserReports();
        window.deleteReport = function(idx) {
            const userReports = JSON.parse(localStorage.getItem(`reports_${loggedInEmail}`)) || [];
            if (!confirm('Are you sure you want to delete this report?')) return;
            // Remove from user's own reports
            const deleted = userReports.splice(idx, 1)[0];
            localStorage.setItem(`reports_${loggedInEmail}`, JSON.stringify(userReports));
            // Remove from global reports (browse)
            let allReports = JSON.parse(localStorage.getItem('siit_all_reports')) || [];
            allReports = allReports.filter(r => !(r.userEmail === loggedInEmail && r.date === deleted.date && r.itemName === deleted.itemName));
            localStorage.setItem('siit_all_reports', JSON.stringify(allReports));
            displayUserReports();
        }
        // File upload handler
        const itemPhoto = document.getElementById('itemPhoto');
        if (itemPhoto) {
            itemPhoto.addEventListener('change', function() {
                const fileName = document.getElementById('fileName');
                if (this.files.length > 0) {
                    fileName.textContent = this.files[0].name;
                } else {
                    fileName.textContent = '';
                }
            });
        }
        // Clear form button
        const clearFormBtn = document.getElementById('clearFormBtn');
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', function() {
                document.getElementById('reportForm').reset();
                document.getElementById('fileName').textContent = '';
            });
        }
    });
}
