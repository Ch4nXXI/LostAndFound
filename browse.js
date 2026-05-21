// browse.js
import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  collection, query, orderBy, getDocs, doc,
  getDoc, updateDoc, addDoc, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// ── DOM REFERENCES ────────────────────────────────────────
const itemTypeFilter = document.getElementById('item-type');
const dateRangeFilter = document.getElementById('date-range');
const resetBtn = document.getElementById('reset-filters');
const reportsGrid = document.getElementById('reports-grid');
const modal = document.getElementById('report-modal');
const closeModal = document.querySelector('.close-modal');
const modalBody = document.getElementById('modal-body');

let allReports = [];
let currentUser = null;
let currentUserData = {};

// ── AUTH STATE ────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert('You must log in first!');
    window.location.replace('index.html');
    return;
  }

  currentUser = user;

  // Load user profile from Firestore
  const userDoc = await getDoc(doc(db, "users", user.uid));
  currentUserData = userDoc.exists() ? userDoc.data() : {};
  const fullName = `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim();
  const initials = ((currentUserData.firstName?.[0] || '') + (currentUserData.lastName?.[0] || '')).toUpperCase();

  const userNameElem = document.querySelector('.user-name');
  const userAvatarElem = document.querySelector('.user-avatar');
  if (userNameElem) userNameElem.textContent = fullName;
  if (userAvatarElem) userAvatarElem.textContent = initials;

  // Nav dropdown
  const navUser = document.querySelector('.nav-user');
  if (navUser) {
    navUser.addEventListener('click', () => navUser.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!navUser.contains(e.target)) navUser.classList.remove('open');
    });
  }

  // Logout
  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = 'index.html';
    });
  }

  await loadReports();
  setupEventListeners();
  displayReports(allReports);
  displayClaimedItems();
  displayPendingRequests();
});

// ── LOAD REPORTS FROM FIRESTORE ───────────────────────────
async function loadReports() {
  const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── SETUP EVENT LISTENERS ─────────────────────────────────
function setupEventListeners() {
  if (itemTypeFilter) itemTypeFilter.addEventListener('change', applyFilters);
  if (dateRangeFilter) dateRangeFilter.addEventListener('change', applyFilters);
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);
  if (closeModal) closeModal.addEventListener('click', hideModal);
  window.addEventListener('click', function (e) {
    if (e.target === modal) hideModal();
  });
}

// ── APPLY FILTERS ─────────────────────────────────────────
function applyFilters() {
  let filtered = [...allReports];
  const itemType = itemTypeFilter.value;

  if (itemType === 'lost') {
    filtered = filtered.filter(r => r.status === 'lost');
  } else if (itemType === 'found') {
    filtered = filtered.filter(r => r.status === 'found');
  } else if (itemType === 'claimed') {
    filtered = filtered.filter(r => r.claimStatus === 'approved');
  }

  const dateRange = dateRangeFilter.value;
  const now = new Date();
  if (dateRange !== 'all') {
    filtered = filtered.filter(r => {
      const reportDate = r.createdAt ? r.createdAt.toDate() : null;
      if (!reportDate) return false;
      if (dateRange === 'day') return reportDate.toDateString() === now.toDateString();
      if (dateRange === 'week') return reportDate >= new Date(now - 7 * 24 * 60 * 60 * 1000);
      if (dateRange === 'month') return reportDate >= new Date(now - 30 * 24 * 60 * 60 * 1000);
    });
  }

  displayReports(filtered);
  displayClaimedItems();
  displayPendingRequests();
}

// ── DISPLAY REPORTS ───────────────────────────────────────
function displayReports(reports) {
  // Exclude claimed items from main grid
  const nonClaimed = reports.filter(r => r.claimStatus !== 'approved');

  if (nonClaimed.length === 0) {
    reportsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No reports found matching your filters.</p>
      </div>`;
    return;
  }

  reportsGrid.innerHTML = nonClaimed.map((report) => {
    const isOwner = report.uid === currentUser.uid;
    const isRequested = report.claimStatus === 'requested' || report.claimStatus === 'pending';
    const isRejected = report.claimStatus === 'rejected';
    const isApproved = report.claimStatus === 'approved';
    const hasUserClaimed = report.claimerUid === currentUser.uid;
    const requestLabel = hasUserClaimed && isRequested
      ? 'Pending admin approval'
      : hasUserClaimed && isRejected
      ? 'Claim rejected'
      : '';
    const dateStr = report.createdAt ? new Date(report.createdAt.toDate()).toLocaleDateString() : 'N/A';

    return `
      <div class="report-card">
        <div class="report-header">
          <div class="report-icon ${report.status}">
            <i class="fas ${report.status === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i>
          </div>
          <div class="report-info">
            <h3>${report.itemName}</h3>
            <span class="report-type ${report.status}">${report.status}</span>
          </div>
        </div>
        <div class="report-details">
          <div class="detail-item"><i class="fas fa-tag"></i><span>${report.category}</span></div>
          <div class="detail-item"><i class="fas fa-map-marker-alt"></i><span>${report.location}</span></div>
          <div class="detail-item"><i class="fas fa-user"></i><span>${report.userName || 'Unknown'}</span></div>
        </div>
        <p class="report-date">Reported: ${dateStr}</p>
        <button class="btn-view" onclick="showModal('${report.id}')">View Details</button>
        ${isOwner && !isApproved ? `<button class="btn-claim" onclick="markAsClaimed('${report.id}')">Mark as Claimed</button>` : ''}
        ${!isOwner && !isApproved && !isRequested && !hasUserClaimed ? `<button class="btn-claim" onclick="claimItem('${report.id}')">Claim</button>` : ''}
        ${requestLabel ? `<div class="pending-label">${requestLabel}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ── CLAIM ITEM ────────────────────────────────────────────
window.claimItem = async function (itemId) {
  const report = allReports.find(r => r.id === itemId);
  if (!report) return;

  const fullName = `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim();

  // Update item with claim info
  await updateDoc(doc(db, "items", itemId), {
    claimStatus: 'pending',
    claimerUid: currentUser.uid,
    claimerName: fullName,
    claimerEmail: currentUserData.email || currentUser.email,
    claimed: false
  });

  // Add to claims collection
  await addDoc(collection(db, "claims"), {
    itemId,
    claimedBy: currentUser.uid,
    claimerName: fullName,
    claimerEmail: currentUserData.email || currentUser.email,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  alert('Claim request submitted! Waiting for admin approval.');
  await loadReports();
  applyFilters();
  displayClaimedItems();
  displayPendingRequests();
};

// ── MARK AS CLAIMED (owner) ───────────────────────────────
window.markAsClaimed = async function (itemId) {
  await updateDoc(doc(db, "items", itemId), {
    claimed: true,
    claimStatus: 'approved'
  });
  await loadReports();
  applyFilters();
  displayClaimedItems();
};

// ── SHOW MODAL ────────────────────────────────────────────
window.showModal = async function (itemId) {
  const report = allReports.find(r => r.id === itemId);
  if (!report) return;

  const statusText = report.claimStatus === 'approved'
    ? 'Claimed'
    : report.claimStatus === 'requested' || report.claimStatus === 'pending'
    ? 'Pending admin approval'
    : report.claimStatus === 'rejected'
    ? 'Claim rejected'
    : 'Open';

  const dateStr = report.createdAt ? new Date(report.createdAt.toDate()).toLocaleString() : 'N/A';

  // Fetch claimant's full profile from Firestore if item is approved
  let claimantPhone = '';
  if (report.claimStatus === 'approved' && report.claimerUid) {
    try {
      const claimantDoc = await getDoc(doc(db, "users", report.claimerUid));
      if (claimantDoc.exists()) {
        claimantPhone = claimantDoc.data().phone || '';
      }
    } catch (e) {
      // silently ignore
    }
  }

  modalBody.innerHTML = `
    <h2>${report.itemName}</h2>
    <p style="color:#666;margin-bottom:1.5rem;">
      <strong>Type:</strong>
      <span style="text-transform:uppercase;color:${report.status === 'lost' ? '#e05252' : '#2e7d32'};">${report.status}</span>
    </p>
    ${report.imageUrl ? `<img src="${report.imageUrl}" style="max-width:100%;max-height:250px;border-radius:10px;margin-bottom:1rem;">` : ''}
    <div class="modal-details">
      <div class="modal-detail-item"><label>Category</label><p>${report.category}</p></div>
      <div class="modal-detail-item"><label>Location</label><p>${report.location}</p></div>
      <div class="modal-detail-item"><label>Date Reported</label><p>${dateStr}</p></div>
      <div class="modal-detail-item"><label>Description</label><p>${report.description || 'N/A'}</p></div>
      <div class="modal-detail-item"><label>Reported By</label><p>${report.userName || 'Unknown'}</p></div>
      <div class="modal-detail-item"><label>Contact Email</label><p>${report.userEmail || 'N/A'}</p></div>
      <div class="modal-detail-item"><label>Status</label><p>${statusText}</p></div>
      ${report.claimStatus === 'approved'
        ? `<div class="modal-detail-item" style="margin-top:1rem;padding-top:1rem;border-top:1px solid #eee;">
             <label style="color:#2e7d32;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;">Claimant Information</label>
             <p><strong>Name:</strong> ${report.claimerName || 'N/A'}</p>
             <p style="margin-top:0.4rem;"><strong>Email:</strong> ${report.claimerEmail || 'N/A'}</p>
             <p style="margin-top:0.4rem;"><strong>Contact No.:</strong> ${claimantPhone || 'N/A'}</p>
           </div>`
        : ''}
      ${['pending', 'requested'].includes(report.claimStatus)
        ? `<div class="modal-detail-item"><label>Claimed By</label><p>${report.claimerName || ''} (${report.claimerEmail || ''})</p></div>`
        : ''}
      ${report.claimStatus === 'rejected'
        ? `<div class="modal-detail-item"><label>Admin Response</label><p>${report.claimResponse || 'No response provided.'}</p></div>`
        : ''}
    </div>
  `;
  modal.classList.add('show');
};

// ── HIDE MODAL ────────────────────────────────────────────
function hideModal() {
  modal.classList.remove('show');
}

// ── RESET FILTERS ─────────────────────────────────────────
function resetFilters() {
  if (itemTypeFilter) itemTypeFilter.value = 'all';
  if (dateRangeFilter) dateRangeFilter.value = 'all';
  displayReports(allReports);
  displayClaimedItems();
  displayPendingRequests();
}

// ── DISPLAY CLAIMED ITEMS ─────────────────────────────────
function displayClaimedItems() {
  const claimedSection = document.getElementById('claimed-items-section');
  if (!claimedSection) return;
  const claimed = allReports.filter(r => r.claimStatus === 'approved');
  if (claimed.length === 0) {
    claimedSection.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No claimed items yet.</p></div>`;
    return;
  }
  claimedSection.innerHTML = claimed.map(report => {
    const dateStr = report.createdAt ? new Date(report.createdAt.toDate()).toLocaleDateString() : 'N/A';
    return `
      <div class="report-card">
        <div class="report-header">
          <div class="report-icon ${report.status}">
            <i class="fas ${report.status === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i>
          </div>
          <div class="report-info">
            <h3>${report.itemName}</h3>
            <span class="report-type ${report.status}">${report.status}</span>
          </div>
        </div>
        <div class="report-details">
          <div class="detail-item"><i class="fas fa-tag"></i><span>${report.category}</span></div>
          <div class="detail-item"><i class="fas fa-map-marker-alt"></i><span>${report.location}</span></div>
          <div class="detail-item"><i class="fas fa-user"></i><span>${report.userName || 'Unknown'}</span></div>
        </div>
        <p class="report-date">Reported: ${dateStr}</p>
        <div class="claimed-label">Claimed</div>
        <button class="btn-view" onclick="showModal('${report.id}')" style="margin-top:0.6rem;">View Details</button>
      </div>
    `;
  }).join('');
}

// ── DISPLAY PENDING REQUESTS (for current user) ───────────
function displayPendingRequests() {
  const pendingSection = document.getElementById('pending-requests-section');
  if (!pendingSection) return;
  const pendingRequests = allReports.filter(r =>
    ['requested', 'pending', 'rejected'].includes(r.claimStatus) &&
    r.claimerUid === currentUser.uid
  );
  if (pendingRequests.length === 0) {
    pendingSection.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No claim requests yet.</p></div>`;
    return;
  }
  pendingSection.innerHTML = pendingRequests.map(report => {
    const dateStr = report.createdAt ? new Date(report.createdAt.toDate()).toLocaleDateString() : 'N/A';
    return `
      <div class="report-card">
        <div class="report-header">
          <div class="report-icon ${report.status}">
            <i class="fas ${report.status === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i>
          </div>
          <div class="report-info">
            <h3>${report.itemName}</h3>
            <span class="report-type ${report.status}">${report.status}</span>
          </div>
        </div>
        <div class="report-details">
          <div class="detail-item"><i class="fas fa-tag"></i><span>${report.category}</span></div>
          <div class="detail-item"><i class="fas fa-map-marker-alt"></i><span>${report.location}</span></div>
          <div class="detail-item"><i class="fas fa-user"></i><span>${report.userName || 'Unknown'}</span></div>
        </div>
        <p class="report-date">Reported: ${dateStr}</p>
        <div class="pending-label">${report.claimStatus === 'rejected' ? 'Claim rejected' : 'Pending admin approval'}</div>
      </div>
    `;
  }).join('');
}

// ── BROWSE FILTER (called from HTML buttons if any) ───────
window.setBrowseFilter = function (type) {
  if (itemTypeFilter) itemTypeFilter.value = type;
  applyFilters();
};