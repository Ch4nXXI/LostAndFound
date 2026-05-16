// Report page script
const reportForm = document.getElementById('reportForm');
const browseList = document.getElementById('browseList');
const browseEmpty = document.getElementById('browseEmpty');
const fileInput = document.getElementById('itemPhoto');
const fileName = document.getElementById('fileName');
const clearFormBtn = document.getElementById('clearFormBtn');
const focusReportBtn = document.getElementById('focusReportBtn');
const currentFilter = document.getElementById('currentFilter');
const filterButtons = document.querySelectorAll('.filter-btn');

const loggedInEmail = localStorage.getItem('siit_logged_in');
if (!loggedInEmail) {
  window.location.href = 'index.html';
}

const users = JSON.parse(localStorage.getItem('siit_users')) || [];
const currentUser = users.find(u => u.email === loggedInEmail);

const userNameElem = document.querySelector('.user-name');
const userAvatarElem = document.querySelector('.user-avatar');
const navUser = document.querySelector('.nav-user');
const logoutBtn = document.querySelector('.logout');

if (currentUser) {
  if (userNameElem) userNameElem.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  if (userAvatarElem) userAvatarElem.textContent = `${currentUser.firstName[0]}${currentUser.lastName[0] || ''}`.toUpperCase();
}

if (navUser) {
  navUser.addEventListener('click', () => {
    navUser.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!navUser.contains(e.target)) {
      navUser.classList.remove('open');
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('siit_logged_in');
    window.location.href = 'index.html';
  });
}

const getReports = () => JSON.parse(localStorage.getItem('siit_reports')) || [];

const saveReport = (report) => {
  const reports = getReports();
  reports.unshift(report);
  localStorage.setItem('siit_reports', JSON.stringify(reports));
};

const renderReports = (filter = 'all') => {
  const reports = getReports();
  const filtered = filter === 'all' ? reports : reports.filter(item => item.type === filter);

  browseList.innerHTML = '';
  if (!filtered.length) {
    browseEmpty.style.display = 'block';
    return;
  }

  browseEmpty.style.display = 'none';
  filtered.forEach(report => {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="card-main">
        <span class="card-badge ${report.type}">${report.type === 'lost' ? 'Lost' : 'Found'}</span>
        <h3 class="card-title">${report.itemName}</h3>
        <div class="card-meta"><span><i class="fas fa-tag"></i>${report.itemCategory}</span><span><i class="fas fa-map-marker-alt"></i>${report.itemLocation}</span><span><i class="fas fa-calendar-days"></i>${report.dateSubmitted}</span></div>
        <p>${report.itemDetails || 'No additional details provided.'}</p>
      </div>
      <div class="card-actions">
        <button type="button">View</button>
      </div>
    `;
    browseList.appendChild(card);
  });
};

const updateFilterLabel = (value) => {
  currentFilter.textContent = `Showing: ${value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}`;
};

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      fileName.textContent = `Selected file: ${e.target.files[0].name}`;
    } else {
      fileName.textContent = '';
    }
  });
}

if (reportForm) {
  reportForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const report = {
      id: Date.now(),
      type: document.getElementById('itemType').value,
      itemCategory: document.getElementById('itemCategory').value,
      itemName: document.getElementById('itemName').value.trim(),
      itemColor: document.getElementById('itemColor').value.trim(),
      itemLocation: document.getElementById('itemLocation').value.trim(),
      itemDetails: document.getElementById('itemDetails').value.trim(),
      dateSubmitted: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
      createdBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown'
    };

    saveReport(report);
    renderReports(document.querySelector('.filter-btn.active').dataset.filter || 'all');
    reportForm.reset();
    fileName.textContent = '';
    alert('Report submitted successfully.');
  });
}

if (clearFormBtn) {
  clearFormBtn.addEventListener('click', () => {
    reportForm.reset();
    fileName.textContent = '';
  });
}

if (focusReportBtn) {
  focusReportBtn.addEventListener('click', () => {
    document.getElementById('itemName').focus();
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    renderReports(button.dataset.filter);
    updateFilterLabel(button.dataset.filter);
  });
});

renderReports('all');
updateFilterLabel('all');
