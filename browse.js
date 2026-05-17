// filepath: c:\Users\Christian\Documents\A. Lost and Found\browse.js

// Login check for browse.html
if (window.location.pathname.endsWith('browse.html')) {
    const loggedInEmail = localStorage.getItem('siit_logged_in');
    if (!loggedInEmail) {
        alert('You must log in first!');
        window.location.replace('index.html');
        throw new Error('Not logged in');
    }
    // Set user name and avatar
    const users = JSON.parse(localStorage.getItem('siit_users')) || [];
    const user = users.find(u => u.email === loggedInEmail);
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
}

// Get DOM elements
const itemTypeFilter = document.getElementById('item-type');
const dateRangeFilter = document.getElementById('date-range');
const resetBtn = document.getElementById('reset-filters');
const reportsGrid = document.getElementById('reports-grid');
const modal = document.getElementById('report-modal');
const closeModal = document.querySelector('.close-modal');
const modalBody = document.getElementById('modal-body');

// Store all reports
let allReports = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadReports();
    setupEventListeners();
    displayReports(allReports);
    displayClaimedItems();
});

// Load reports from localStorage
function loadReports() {
    allReports = JSON.parse(localStorage.getItem('siit_all_reports')) || [];
    // Sort by date (newest first)
    allReports.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Setup event listeners
function setupEventListeners() {
    itemTypeFilter.addEventListener('change', applyFilters);
    dateRangeFilter.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    closeModal.addEventListener('click', hideModal);
    window.addEventListener('click', function(e) {
        if (e.target === modal) hideModal();
    });
}

// Apply filters
function applyFilters() {
    let filtered = [...allReports];
    // Filter by item type
    const itemType = itemTypeFilter.value;
    if (itemType === 'lost') {
        filtered = filtered.filter(report => report.type === 'lost' && !report.claimed);
    } else if (itemType === 'found') {
        filtered = filtered.filter(report => report.type === 'found' && !report.claimed);
    } else if (itemType === 'claimed') {
        filtered = filtered.filter(report => report.claimed);
    }
    
    // Filter by date range
    const dateRange = dateRangeFilter.value;
    const now = new Date();
    
    if (dateRange !== 'all') {
        filtered = filtered.filter(report => {
            const reportDate = new Date(report.date);
            
            if (dateRange === 'day') {
                return reportDate.toDateString() === now.toDateString();
            } else if (dateRange === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return reportDate >= weekAgo;
            } else if (dateRange === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return reportDate >= monthAgo;
            }
        });
    }
    
    displayReports(filtered);
}

// Display reports
function displayReports(reports) {
    if (reports.length === 0) {
        reportsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No reports found matching your filters.</p>
            </div>
        `;
        return;
    }
    const loggedInEmail = localStorage.getItem('siit_logged_in');
    // Only show unclaimed reports in the main grid unless filter is 'claimed'
    let filteredReports = reports;
    if (window.currentBrowseFilter === 'claimed') {
        filteredReports = reports.filter(r => r.claimed);
    } else {
        filteredReports = reports.filter(r => !r.claimed);
    }
    if (filteredReports.length === 0) {
        reportsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No ${window.currentBrowseFilter === 'claimed' ? 'claimed' : 'unclaimed'} reports found matching your filters.</p>
            </div>
        `;
        return;
    }
    reportsGrid.innerHTML = filteredReports.map((report, idx) => `
        <div class="report-card">
            <div class="report-header">
                <div class="report-icon ${report.type}">
                    <i class="fas ${report.type === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i>
                </div>
                <div class="report-info">
                    <h3>${report.itemName}</h3>
                    <span class="report-type ${report.type}">${report.type}</span>
                </div>
            </div>
            <div class="report-details">
                <div class="detail-item">
                    <i class="fas fa-tag"></i>
                    <span>${report.category}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${report.location}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span>${report.userName}</span>
                </div>
            </div>
            <p class="report-date">Reported: ${new Date(report.date).toLocaleDateString()}</p>
            <button class="btn-view" onclick="showModal(${allReports.indexOf(report)})">View Details</button>
            ${report.userEmail === loggedInEmail && !report.claimed ? `<button class="btn-claim" onclick="markAsClaimed(${allReports.indexOf(report)})">Mark as Claimed</button>` : ''}
            ${report.userEmail !== loggedInEmail && !report.claimed ? `<button class="btn-claim" onclick="claimItem(${allReports.indexOf(report)})">Claim</button>` : ''}
            ${report.claimed ? `<div class="claimed-label">Claimed${report.claimerName ? ` by ${report.claimerName}` : ''}</div>` : ''}
        </div>
    `).join('');
}

// Claim item (for non-owners)
window.claimItem = function(index) {
    let allReports = JSON.parse(localStorage.getItem('siit_all_reports')) || [];
    const loggedInEmail = localStorage.getItem('siit_logged_in');
    const users = JSON.parse(localStorage.getItem('siit_users')) || [];
    const user = users.find(u => u.email === loggedInEmail);
    if (!user) return;
    allReports[index].claimed = true;
    allReports[index].claimerName = user.firstName + ' ' + user.lastName;
    allReports[index].claimerEmail = loggedInEmail;
    localStorage.setItem('siit_all_reports', JSON.stringify(allReports));
    // Also update owner's own reports
    const ownerEmail = allReports[index].userEmail;
    let userReports = JSON.parse(localStorage.getItem(`reports_${ownerEmail}`)) || [];
    const userIdx = userReports.findIndex(r => r.date === allReports[index].date && r.itemName === allReports[index].itemName);
    if (userIdx !== -1) {
        userReports[userIdx].claimed = true;
        userReports[userIdx].claimerName = user.firstName + ' ' + user.lastName;
        userReports[userIdx].claimerEmail = loggedInEmail;
        localStorage.setItem(`reports_${ownerEmail}`, JSON.stringify(userReports));
    }
    loadReports();
    applyFilters();
    displayClaimedItems();
}

// Show modal with details
function showModal(index) {
    const report = allReports[index];
    modalBody.innerHTML = `
        <h2>${report.itemName}</h2>
        <p style="color: #666; margin-bottom: 1.5rem;">
            <strong>Type:</strong> <span style="text-transform: uppercase; color: ${report.type === 'lost' ? '#e05252' : '#2e7d32'};">${report.type}</span>
        </p>
        ${report.photo ? `<img src="${report.photo}" style="max-width:100%;max-height:250px;border-radius:10px;margin-bottom:1rem;">` : ''}
        <div class="modal-details">
            <div class="modal-detail-item">
                <label>Category</label>
                <p>${report.category}</p>
            </div>
            <div class="modal-detail-item">
                <label>Location</label>
                <p>${report.location}</p>
            </div>
            <div class="modal-detail-item">
                <label>Date Reported</label>
                <p>${new Date(report.date).toLocaleString()}</p>
            </div>
            <div class="modal-detail-item">
                <label>Description</label>
                <p>${report.description}</p>
            </div>
            <div class="modal-detail-item">
                <label>Reported By</label>
                <p>${report.userName}</p>
            </div>
            <div class="modal-detail-item">
                <label>Contact Email</label>
                <p>${report.userEmail}</p>
            </div>
            ${report.claimed ? `<div class="modal-detail-item"><label>Claimed By</label><p>${report.claimerName || ''} (${report.claimerEmail || ''})</p></div>` : ''}
        </div>
    `;
    modal.classList.add('show');
}

// Hide modal
function hideModal() {
    modal.classList.remove('show');
}

// Reset filters
function resetFilters() {
    itemTypeFilter.value = 'all';
    dateRangeFilter.value = 'all';
    displayReports(allReports);
}

// Mark as claimed
window.markAsClaimed = function(index) {
    let allReports = JSON.parse(localStorage.getItem('siit_all_reports')) || [];
    allReports[index].claimed = true;
    localStorage.setItem('siit_all_reports', JSON.stringify(allReports));
    // Also update user's own reports
    const email = allReports[index].userEmail;
    let userReports = JSON.parse(localStorage.getItem(`reports_${email}`)) || [];
    const userIdx = userReports.findIndex(r => r.date === allReports[index].date && r.itemName === allReports[index].itemName);
    if (userIdx !== -1) {
        userReports[userIdx].claimed = true;
        localStorage.setItem(`reports_${email}`, JSON.stringify(userReports));
    }
    loadReports();
    applyFilters();
}

// Claimed Items Section
function displayClaimedItems() {
    const claimedSection = document.getElementById('claimed-items-section');
    if (!claimedSection) return;
    const claimed = allReports.filter(r => r.claimed);
    if (claimed.length === 0) {
        claimedSection.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No claimed items yet.</p></div>`;
        return;
    }
    claimedSection.innerHTML = claimed.map(report => `
        <div class="report-card">
            <div class="report-header">
                <div class="report-icon ${report.type}">
                    <i class="fas ${report.type === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i>
                </div>
                <div class="report-info">
                    <h3>${report.itemName}</h3>
                    <span class="report-type ${report.type}">${report.type}</span>
                </div>
            </div>
            <div class="report-details">
                <div class="detail-item">
                    <i class="fas fa-tag"></i>
                    <span>${report.category}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${report.location}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span>${report.userName}</span>
                </div>
            </div>
            <p class="report-date">Reported: ${new Date(report.date).toLocaleDateString()}</p>
            <div class="claimed-label">Claimed</div>
        </div>
    `).join('');
}

// Add filter for claimed items
window.setBrowseFilter = function(type) {
    window.currentBrowseFilter = type;
    applyFilters();
}
window.currentBrowseFilter = 'all';
