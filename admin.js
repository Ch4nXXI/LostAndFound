const adminSession = localStorage.getItem('siit_admin_logged_in');

if (!adminSession) {
  window.location.href = 'index.html';
}

const totalReportsElem = document.getElementById('totalReports');
const pendingReportsElem = document.getElementById('pendingReports');
const totalUsersElem = document.getElementById('totalUsers');
const reportsTableBody = document.getElementById('reportsTableBody');
const refreshBtn = document.getElementById('refreshReports');
const logoutBtn = document.getElementById('admin-logout');
const reportsTypeCanvas = document.getElementById('reportsTypeChart');
const activityCanvas = document.getElementById('activityChart');
let reportsTypeChart = null;
let activityChart = null;

function getAllReports() {
  return JSON.parse(localStorage.getItem('siit_all_reports')) || [];
}

function getUsers() {
  return JSON.parse(localStorage.getItem('siit_users')) || [];
}

function renderStats() {
  const reports = getAllReports();
  const users = getUsers();
  const pending = reports.filter(report => report.claimStatus === 'requested').length;

  totalReportsElem.textContent = reports.length;
  pendingReportsElem.textContent = pending;
  totalUsersElem.textContent = users.length;
}

function getReportsByType() {
  const reports = getAllReports();
  return {
    lost: reports.filter(report => report.type === 'lost').length,
    found: reports.filter(report => report.type === 'found').length,
  };
}

function getLast7Days() {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const label = date.toLocaleDateString('en-US', { weekday: 'short' });
    result.push({ key: date.toISOString().slice(0, 10), label });
  }
  return result;
}

function getRecentActivityCounts() {
  const reports = getAllReports();
  const last7 = getLast7Days();
  return last7.map(day => {
    return reports.filter(report => {
      const reportDate = new Date(report.date).toISOString().slice(0, 10);
      return reportDate === day.key;
    }).length;
  });
}

function renderCharts() {
  const reportTypeData = getReportsByType();
  const last7Days = getLast7Days();
  const activityCounts = getRecentActivityCounts();

  if (reportsTypeChart) {
    reportsTypeChart.destroy();
  }
  reportsTypeChart = new Chart(reportsTypeCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Lost', 'Found'],
      datasets: [{
        data: [reportTypeData.lost, reportTypeData.found],
        backgroundColor: ['#f97316', '#22c55e'],
        hoverBackgroundColor: ['#fb923c', '#4ade80'],
        borderWidth: 0,
      }],
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#cbd5e1' },
        },
        tooltip: {
          callbacks: {
            label: context => `${context.label}: ${context.formattedValue}`,
          },
        },
      },
      maintainAspectRatio: false,
    },
  });

  if (activityChart) {
    activityChart.destroy();
  }
  activityChart = new Chart(activityCanvas, {
    type: 'bar',
    data: {
      labels: last7Days.map(day => day.label),
      datasets: [{
        label: 'Reports',
        data: activityCounts,
        backgroundColor: '#38bdf8',
        borderRadius: 12,
        maxBarThickness: 32,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${context.formattedValue}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#cbd5e1' },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#cbd5e1', precision: 0 },
          grid: { color: 'rgba(148, 163, 184, 0.12)' },
        },
      },
      maintainAspectRatio: false,
    },
  });
}

function renderReportsTable() {
  const reports = getAllReports();
  if (!reports.length) {
    reportsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No reports have been submitted yet.</td></tr>';
    return;
  }

  reportsTableBody.innerHTML = reports
    .map((report, index) => {
      const reporter = report.userName || report.userEmail || 'Unknown';
      const status = report.claimStatus || 'open';
      const statusLabels = {
        open: 'Open',
        requested: 'Pending Approval',
        approved: 'Claimed',
        rejected: 'Rejected'
      };
      const statusClasses = {
        open: 'status-open',
        requested: 'status-pending',
        approved: 'status-claimed',
        rejected: 'status-rejected'
      };
      const statusText = statusLabels[status] || 'Open';
      const statusClass = statusClasses[status] || 'status-open';
      let actionButtons = '';

      if (status === 'requested') {
        actionButtons = `
          <div class="admin-action-group">
            <button class="admin-action approve-btn" data-index="${index}" data-action="approve">Approve</button>
            <button class="admin-action reject-btn" data-index="${index}" data-action="reject">Reject</button>
          </div>
        `;
      } else if (status === 'approved') {
        actionButtons = `<button class="admin-action reject-btn" data-index="${index}" data-action="reject">Reject</button>`;
      } else if (status === 'rejected') {
        actionButtons = `<button class="admin-action approve-btn" data-index="${index}" data-action="approve">Approve</button>`;
      } else {
        actionButtons = `<button class="admin-action approve-btn" data-index="${index}" data-action="approve">Mark Claimed</button>`;
      }

      return `
        <tr>
          <td>
            <strong>${report.itemName || 'Unnamed item'}</strong><br />
            <span>${report.category || 'No category'}</span>
          </td>
          <td>${reporter}</td>
          <td>${report.type ? report.type.charAt(0).toUpperCase() + report.type.slice(1) : 'Unknown'}</td>
          <td><span class="status-tag ${statusClass}">${statusText}</span></td>
          <td>${actionButtons}</td>
        </tr>
      `;
    })
    .join('');

  const actionButtons = document.querySelectorAll('.admin-action');
  actionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const index = Number(this.dataset.index);
      const action = this.dataset.action;
      handleAdminAction(index, action);
    });
  });
}

function handleAdminAction(index, action) {
  const reports = getAllReports();
  const report = reports[index];
  if (!report) return;

  if (action === 'approve') {
    report.claimStatus = 'approved';
    report.claimed = true;
    report.claimResponse = 'Approved by admin';
  } else if (action === 'reject') {
    report.claimStatus = 'rejected';
    report.claimed = false;
    report.claimResponse = 'Rejected by admin';
  }

  localStorage.setItem('siit_all_reports', JSON.stringify(reports));

  const ownerEmail = report.userEmail;
  let userReports = JSON.parse(localStorage.getItem(`reports_${ownerEmail}`)) || [];
  const userIdx = userReports.findIndex(r => r.date === report.date && r.itemName === report.itemName);
  if (userIdx !== -1) {
    userReports[userIdx].claimStatus = report.claimStatus;
    userReports[userIdx].claimed = report.claimed;
    userReports[userIdx].claimResponse = report.claimResponse;
    localStorage.setItem(`reports_${ownerEmail}`, JSON.stringify(userReports));
  }

  renderStats();
  renderReportsTable();
  renderCharts();
}

function initAdminPage() {
  renderStats();
  renderReportsTable();
  renderCharts();
}

refreshBtn.addEventListener('click', () => {
  initAdminPage();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('siit_admin_logged_in');
  window.location.href = 'index.html';
});

initAdminPage();
