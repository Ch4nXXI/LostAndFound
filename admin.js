// admin.js
import { auth, db } from './firebase.js';
import {
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  collection, getDocs, doc, updateDoc,
  deleteDoc, query, orderBy, where, getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// ── ADMIN SESSION CHECK ───────────────────────────────────
const adminSession = localStorage.getItem('siit_admin_logged_in');
if (!adminSession) {
  window.location.href = 'index.html';
}

// ── DOM REFERENCES ────────────────────────────────────────
const totalReportsElem = document.getElementById('totalReports');
const pendingReportsElem = document.getElementById('pendingReports');
const totalUsersElem = document.getElementById('totalUsers');
const reportsTableBody = document.getElementById('reportsTableBody');
const lostTableBody = document.getElementById('lostTableBody');
const foundTableBody = document.getElementById('foundTableBody');
const usersTableBody = document.getElementById('usersTableBody');
const refreshBtn = document.getElementById('refreshReports');
const logoutBtn = document.getElementById('admin-logout');
const reportsTypeCanvas = document.getElementById('reportsTypeChart');
const claimedCanvas = document.getElementById('claimedChart');
const activityCanvas = document.getElementById('activityChart');

let reportsTypeChart = null;
let claimedChart = null;
let activityChart = null;

// ── FETCH ALL REPORTS FROM FIRESTORE ──────────────────────
async function getAllReports() {
  const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── FETCH ALL USERS FROM FIRESTORE ────────────────────────
async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── FETCH ALL CLAIMS FROM FIRESTORE ──────────────────────
async function getAllClaims() {
  const snap = await getDocs(collection(db, "claims"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── RENDER STATS ──────────────────────────────────────────
async function renderStats() {
  const reports = await getAllReports();
  const users = await getAllUsers();
  const pending = reports.filter(r => r.claimStatus === 'pending' || r.claimStatus === 'requested').length;

  totalReportsElem.textContent = reports.length;
  pendingReportsElem.textContent = pending;
  totalUsersElem.textContent = users.length;
}

// ── CHART HELPERS ─────────────────────────────────────────
function getLastNDays(n) {
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const label = n <= 7
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    result.push({ key: date.toISOString().slice(0, 10), label });
  }
  return result;
}

// ── RENDER CHARTS ─────────────────────────────────────────
async function renderCharts(activityDays = 7) {
  const reports = await getAllReports();
  const lostCount = reports.filter(r => r.status === 'lost').length;
  const foundCount = reports.filter(r => r.status === 'found').length;
  const claimedCount = reports.filter(r => r.claimStatus === 'approved').length;

  const days = getLastNDays(activityDays);
  const activityCounts = days.map(day =>
    reports.filter(r => {
      if (!r.createdAt) return false;
      return r.createdAt.toDate().toISOString().slice(0, 10) === day.key;
    }).length
  );

  // Update subtitle text
  const subtitle = document.getElementById('activitySubtitle');
  if (subtitle) {
    const labels = { 7: 'past 7 days', 14: 'past 2 weeks', 30: 'past month' };
    subtitle.textContent = `Reports submitted in the ${labels[activityDays] || 'past 7 days'}`;
  }

  if (reportsTypeChart) reportsTypeChart.destroy();
  reportsTypeChart = new Chart(reportsTypeCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Lost', 'Found'],
      datasets: [{
        data: [lostCount, foundCount],
        backgroundColor: ['#f97316', '#22c55e'],
        hoverBackgroundColor: ['#fb923c', '#4ade80'],
        borderWidth: 0,
      }],
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { color: '#4a3a2a', font: { size: 12 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.formattedValue}` } },
      },
      maintainAspectRatio: false,
    },
  });

  if (claimedChart) claimedChart.destroy();
  claimedChart = new Chart(claimedCanvas, {
    type: 'bar',
    data: {
      labels: ['Lost Items', 'Found Items', 'Claimed Items'],
      datasets: [{
        label: 'Count',
        data: [lostCount, foundCount, claimedCount],
        backgroundColor: ['#f97316', '#22c55e', '#3b82f6'],
        borderRadius: 12,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.formattedValue}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#4a3a2a', font: { size: 11 } } },
        y: { beginAtZero: true, ticks: { color: '#4a3a2a', precision: 0, font: { size: 11 } }, grid: { color: 'rgba(139,26,26,0.08)' } },
      },
      maintainAspectRatio: false,
    },
  });

  if (activityChart) activityChart.destroy();
  activityChart = new Chart(activityCanvas, {
    type: 'bar',
    data: {
      labels: days.map(d => d.label),
      datasets: [{
        label: 'Reports',
        data: activityCounts,
        backgroundColor: '#8B1A1A',
        hoverBackgroundColor: '#C0392B',
        borderRadius: 8,
        maxBarThickness: 32,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue}` } },
      },
      scales: {
        x: { ticks: { color: '#4a3a2a', font: { size: activityDays > 14 ? 9 : 11 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#4a3a2a', precision: 0, font: { size: 11 } }, grid: { color: 'rgba(139,26,26,0.08)' } },
      },
      maintainAspectRatio: false,
    },
  });
}

// ── STATUS HELPERS ────────────────────────────────────────
const statusLabels = { open: 'Open', pending: 'Pending Approval', requested: 'Pending Approval', approved: 'Claimed', rejected: 'Rejected' };
const statusClasses = { open: 'status-open', pending: 'status-pending', requested: 'status-pending', approved: 'status-claimed', rejected: 'status-rejected' };

// ── RENDER ALL REPORTS TABLE ──────────────────────────────
async function renderReportsTable() {
  const reports = await getAllReports();
  if (!reports.length) {
    reportsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No reports have been submitted yet.</td></tr>';
    return;
  }
  reportsTableBody.innerHTML = reports.map((report) => {
    const reporter = report.userName || report.userEmail || 'Unknown';
    const status = report.claimStatus || (report.claimed ? 'approved' : 'open');
    const statusText = statusLabels[status] || 'Open';
    const statusClass = statusClasses[status] || 'status-open';
    const type = report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1) : 'Unknown';
    let actionButtons = '';
    if (status === 'pending' || status === 'requested') {
      actionButtons = `
        <div class="admin-action-group">
          <button class="admin-action approve-btn" data-id="${report.id}" data-action="approve">Approve</button>
          <button class="admin-action reject-btn" data-id="${report.id}" data-action="reject">Reject</button>
          <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>
        </div>`;
    } else if (status === 'approved') {
      actionButtons = `<button class="admin-action reject-btn" data-id="${report.id}" data-action="reject">Reject</button> <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>`;
    } else if (status === 'rejected') {
      actionButtons = `<button class="admin-action approve-btn" data-id="${report.id}" data-action="approve">Approve</button> <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>`;
    } else {
      actionButtons = `<button class="admin-action approve-btn" data-id="${report.id}" data-action="approve">Mark Claimed</button> <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>`;
    }
    return `
      <tr>
        <td><strong>${report.itemName || 'Unnamed item'}</strong><br/><span>${report.category || 'No category'}</span></td>
        <td>${reporter}</td>
        <td>${type}</td>
        <td><span class="status-tag ${statusClass}">${statusText}</span></td>
        <td>${actionButtons}</td>
      </tr>`;
  }).join('');
  attachReportActions(reportsTableBody);
}

// ── RENDER LOST / FOUND SUB-TABLES ────────────────────────
async function renderSubReportTable(type, tableBody, emptyMessage) {
  const reports = (await getAllReports()).filter(r => r.status === type);
  if (!reports.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">${emptyMessage}</td></tr>`;
    return;
  }
  tableBody.innerHTML = reports.map((report) => {
    const reporter = report.userName || report.userEmail || 'Unknown';
    const status = report.claimStatus || (report.claimed ? 'approved' : 'open');
    const statusText = statusLabels[status] || 'Open';
    const statusClass = statusClasses[status] || 'status-open';
    const claimedText = report.claimed ? 'Yes' : 'No';
    let actionButtons = '';
    if (status === 'pending' || status === 'requested') {
      actionButtons = `
        <div class="admin-action-group">
          <button class="admin-action approve-btn" data-id="${report.id}" data-action="approve">Approve</button>
          <button class="admin-action reject-btn" data-id="${report.id}" data-action="reject">Reject</button>
          <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>
        </div>`;
    } else if (status === 'approved') {
      actionButtons = `<button class="admin-action reject-btn" data-id="${report.id}" data-action="reject">Reject</button> <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>`;
    } else if (status === 'rejected') {
      actionButtons = `<button class="admin-action approve-btn" data-id="${report.id}" data-action="approve">Approve</button> <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>`;
    } else {
      actionButtons = `<button class="admin-action approve-btn" data-id="${report.id}" data-action="approve">Mark Claimed</button> <button class="admin-action delete-btn" data-id="${report.id}" data-action="delete">Delete</button>`;
    }
    return `
      <tr>
        <td><strong>${report.itemName || 'Unnamed item'}</strong><br/><span>${report.category || 'No category'}</span></td>
        <td>${reporter}</td>
        <td><span class="status-tag ${statusClass}">${statusText}</span></td>
        <td>${claimedText}</td>
        <td>${actionButtons}</td>
      </tr>`;
  }).join('');
  attachReportActions(tableBody);
}

// ── RENDER USERS TABLE ────────────────────────────────────
async function renderUsersTable() {
  const users = await getAllUsers();
  const reports = await getAllReports();
  if (!users.length) {
    usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No registered users available.</td></tr>';
    return;
  }
  usersTableBody.innerHTML = users.map(user => {
    const reportCount = reports.filter(r => r.uid === user.id).length;
    return `
      <tr>
        <td>${user.firstName} ${user.lastName}</td>
        <td>${user.email}</td>
        <td>${user.phone || 'Not provided'}</td>
        <td>${reportCount}</td>
        <td><button class="admin-action delete-user-btn" data-uid="${user.id}" data-action="delete">Delete</button></td>
      </tr>`;
  }).join('');

  usersTableBody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const uid = this.dataset.uid;
      if (!uid) return;
      if (confirm('Delete this user and all their reports?')) {
        await deleteUser(uid);
      }
    });
  });
}

// ── RENDER CLAIM REQUESTS TABLE ───────────────────────────
async function renderClaimRequestsTable() {
  const claims = await getAllClaims();
  const tbody = document.getElementById('claimRequestsTableBody');
  if (!claims.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No claim requests yet.</td></tr>';
    return;
  }

  // Fetch item details for each claim
  const rows = await Promise.all(claims.map(async (claim) => {
    const itemDoc = await getDoc(doc(db, "items", claim.itemId));
    const item = itemDoc.exists() ? itemDoc.data() : {};
    const status = claim.status || 'pending';
    let actionBtns = '';
    if (status === 'pending') {
      actionBtns = `
        <button class="admin-action approve-btn" data-claim-id="${claim.id}" data-item-id="${claim.itemId}" data-action="approve">Approve</button>
        <button class="admin-action reject-btn" data-claim-id="${claim.id}" data-item-id="${claim.itemId}" data-action="reject">Reject</button>`;
    }
    return `
      <tr>
        <td><strong>${item.itemName || 'Unknown'}</strong><br><span>${item.category || ''}</span></td>
        <td>${claim.claimerName || claim.claimerEmail || ''}</td>
        <td><span class="status-tag status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
        <td>${actionBtns}</td>
      </tr>`;
  }));

  tbody.innerHTML = rows.join('');

  tbody.querySelectorAll('.admin-action').forEach(btn => {
    btn.addEventListener('click', async function () {
      const claimId = this.dataset.claimId;
      const itemId = this.dataset.itemId;
      const action = this.dataset.action;
      await handleClaimAction(claimId, itemId, action);
    });
  });
}

// ── HANDLE CLAIM APPROVE / REJECT ─────────────────────────
async function handleClaimAction(claimId, itemId, action) {
  if (action === 'approve') {
    await updateDoc(doc(db, "claims", claimId), {
      status: 'approved',
      claimResponse: 'Approved by admin'
    });
    await updateDoc(doc(db, "items", itemId), {
      claimStatus: 'approved',
      claimed: true,
      claimResponse: 'Approved by admin'
    });
  } else if (action === 'reject') {
    await updateDoc(doc(db, "claims", claimId), {
      status: 'rejected',
      claimResponse: 'Rejected by admin'
    });
    await updateDoc(doc(db, "items", itemId), {
      claimStatus: 'rejected',
      claimed: false,
      claimResponse: 'Rejected by admin'
    });
  }
  await refreshDashboard();
}

// ── ATTACH REPORT ACTION BUTTONS ─────────────────────────
function attachReportActions(tableBody) {
  tableBody.querySelectorAll('.admin-action').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id = this.dataset.id;
      const action = this.dataset.action;
      if (id) await handleAdminAction(id, action);
    });
  });
}

// ── HANDLE REPORT APPROVE / REJECT / DELETE ───────────────
async function handleAdminAction(itemId, action) {
  if (action === 'approve') {
    await updateDoc(doc(db, "items", itemId), {
      claimStatus: 'approved',
      claimed: true,
      claimResponse: 'Approved by admin'
    });
    // Also update related claim doc
    const claimsSnap = await getDocs(query(collection(db, "claims"), where("itemId", "==", itemId)));
    for (const claimDoc of claimsSnap.docs) {
      await updateDoc(claimDoc.ref, { status: 'approved', claimResponse: 'Approved by admin' });
    }
  } else if (action === 'reject') {
    await updateDoc(doc(db, "items", itemId), {
      claimStatus: 'rejected',
      claimed: false,
      claimResponse: 'Rejected by admin'
    });
    const claimsSnap = await getDocs(query(collection(db, "claims"), where("itemId", "==", itemId)));
    for (const claimDoc of claimsSnap.docs) {
      await updateDoc(claimDoc.ref, { status: 'rejected', claimResponse: 'Rejected by admin' });
    }
  } else if (action === 'delete') {
    if (!confirm('Delete this report permanently?')) return;
    await deleteDoc(doc(db, "items", itemId));
    // Also delete related claims
    const claimsSnap = await getDocs(query(collection(db, "claims"), where("itemId", "==", itemId)));
    for (const claimDoc of claimsSnap.docs) {
      await deleteDoc(claimDoc.ref);
    }
  }
  await refreshDashboard();
}

// ── DELETE USER ───────────────────────────────────────────
async function deleteUser(uid) {
  // Delete user doc from Firestore
  await deleteDoc(doc(db, "users", uid));
  // Delete all their reports
  const itemsSnap = await getDocs(query(collection(db, "items"), where("uid", "==", uid)));
  for (const itemDoc of itemsSnap.docs) {
    // Delete related claims first
    const claimsSnap = await getDocs(query(collection(db, "claims"), where("itemId", "==", itemDoc.id)));
    for (const claimDoc of claimsSnap.docs) await deleteDoc(claimDoc.ref);
    await deleteDoc(itemDoc.ref);
  }
  // Delete their claims
  const userClaimsSnap = await getDocs(query(collection(db, "claims"), where("claimedBy", "==", uid)));
  for (const claimDoc of userClaimsSnap.docs) await deleteDoc(claimDoc.ref);

  await refreshDashboard();
}

// ── REFRESH DASHBOARD ─────────────────────────────────────
async function refreshDashboard() {
  const rangeSelect = document.getElementById('activityRange');
  const days = rangeSelect ? parseInt(rangeSelect.value) : 7;
  await renderStats();
  await renderReportsTable();
  await renderSubReportTable('lost', lostTableBody, 'No lost item reports yet.');
  await renderSubReportTable('found', foundTableBody, 'No found item reports yet.');
  await renderUsersTable();
  await renderCharts(days);
  await renderClaimRequestsTable();
}

// ── TAB SWITCHING ─────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(tab =>
    tab.classList.toggle('active', tab.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(panel =>
    panel.classList.toggle('hidden', panel.dataset.tab !== tabName));
}

document.querySelectorAll('.admin-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── ACTIVITY RANGE FILTER ─────────────────────────────────
const activityRangeSelect = document.getElementById('activityRange');
if (activityRangeSelect) {
  activityRangeSelect.addEventListener('change', async () => {
    await renderCharts(parseInt(activityRangeSelect.value));
  });
}

// ── LOGOUT ────────────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('siit_admin_logged_in');
  window.location.href = 'index.html';
});

// ── REFRESH BUTTON ────────────────────────────────────────
refreshBtn.addEventListener('click', refreshDashboard);

// ── INIT ──────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  refreshDashboard();
});