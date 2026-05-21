// main.js
import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  doc, getDoc, collection, query, where,
  orderBy, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Admin credentials (kept as-is per your logic)
const ADMIN_CREDENTIALS = {
  email: 'admin@ctu.edu',
  password: 'admin123'
};

// ── SIGNUP PAGE ───────────────────────────────────────────
if (document.querySelector('.register-btn')) {
  const registerBtn = document.querySelector('.register-btn');
  registerBtn.addEventListener('click', async function (e) {
    e.preventDefault();

    const inputs = document.querySelectorAll('.signup-body input');
    const firstName = inputs[0].value.trim();
    const lastName = inputs[1].value.trim();
    const phone = inputs[2].value.trim();
    const studentId = inputs[3].value.trim();
    const email = inputs[4].value.trim();
    const password = inputs[5].value;
    const confirmPassword = inputs[6].value;

    if (!firstName || !lastName || !phone || !studentId || !email || !password || !confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js");
      const { setDoc } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        firstName, lastName, phone, studentId, email,
        createdAt: new Date().toISOString()
      });

      alert('Account created successfully! Please log in.');
      window.location.href = 'index.html';
    } catch (error) {
      alert('Signup failed: ' + error.message);
    }
  });
}

// ── LOGIN PAGE ────────────────────────────────────────────
if (document.getElementById('login-btn')) {
  const loginBtn = document.getElementById('login-btn');
  loginBtn.addEventListener('click', async function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Admin login (kept using localStorage session as before)
   if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
  await signInWithEmailAndPassword(auth, email, password);
  localStorage.setItem('siit_admin_logged_in', 'admin');
  window.location.href = 'admin.html';
  return;
}

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      alert('Invalid email or password.');
    }
  });
}

// ── DASHBOARD PAGE ────────────────────────────────────────
if (window.location.href.includes('dashboard.html')) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Load user profile from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    const initials = ((userData.firstName?.[0] || '') + (userData.lastName?.[0] || '')).toUpperCase();

    const userNameElem = document.querySelector('.user-name');
    const userAvatarElem = document.querySelector('.user-avatar');
    const welcomeText = document.querySelector('.welcome-sub strong');
    if (userNameElem) userNameElem.textContent = fullName;
    if (userAvatarElem) userAvatarElem.textContent = initials;
    if (welcomeText) welcomeText.textContent = fullName;

    // Nav user dropdown
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
        sessionStorage.setItem('intentional_logout', '1');
        await signOut(auth);
        window.location.href = 'index.html';
      });
    }

    // Load user's reports from Firestore
    const itemsQuery = query(
      collection(db, "items"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const itemsSnap = await getDocs(itemsQuery);
    const userReports = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Stats
    const lostCount = userReports.filter(r => r.status === 'lost').length;
    const foundCount = userReports.filter(r => r.status === 'found').length;
    document.querySelector('.stat-card.lost .stat-number').textContent = lostCount;
    document.querySelector('.stat-card.found .stat-number').textContent = foundCount;

    // Claims count
    const claimsQuery = query(
      collection(db, "claims"),
      where("claimedBy", "==", user.uid)
    );
    const claimsSnap = await getDocs(claimsQuery);
    document.querySelector('.stat-card.claimed .stat-number').textContent = claimsSnap.size;

    // Activity log — user's own reports + items they claimed
    const activityTableBody = document.querySelector('.activity-table tbody');
    if (activityTableBody) {
      // Build claim rows with item details
      const claimRows = await Promise.all(claimsSnap.docs.map(async (claimDoc) => {
        const claim = { id: claimDoc.id, ...claimDoc.data() };
        const itemDoc = await getDoc(doc(db, "items", claim.itemId));
        const item = itemDoc.exists() ? { id: claim.itemId, ...itemDoc.data() } : null;
        if (!item) return null;
        return { ...item, _isClaim: true, _claimStatus: claim.status, _claimDate: claim.createdAt };
      }));
      const validClaimRows = claimRows.filter(Boolean);

      // Merge: own reports + claim entries, sort by date descending
      const allActivity = [
        ...userReports.map(r => ({ ...r, _isClaim: false })),
        ...validClaimRows
      ].sort((a, b) => {
        const aTime = (a._isClaim ? a._claimDate : a.createdAt)?.toDate?.() ?? new Date(0);
        const bTime = (b._isClaim ? b._claimDate : b.createdAt)?.toDate?.() ?? new Date(0);
        return bTime - aTime;
      });

      if (allActivity.length === 0) {
        activityTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-inbox"></i><p>No activity yet. Start by reporting or claiming an item!</p></div></td></tr>`;
      } else {
        activityTableBody.innerHTML = allActivity.map((entry, idx) => {
          const isClaim = entry._isClaim;
          const dateVal = isClaim ? entry._claimDate : entry.createdAt;
          const dateStr = dateVal ? new Date(dateVal.toDate()).toLocaleDateString() : 'N/A';
          const statusLabel = isClaim
            ? (entry._claimStatus === 'approved' ? 'Claim Approved' : entry._claimStatus === 'rejected' ? 'Claim Rejected' : 'Claim Pending')
            : (entry.claimStatus === 'approved' ? 'Claimed' : 'Pending');
          const statusClass = (isClaim ? entry._claimStatus : entry.claimStatus) === 'approved' ? 'resolved' : 'pending';
          const icon = isClaim ? 'fa-file-invoice' : (entry.status === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart');
          const typeLabel = isClaim ? 'Claim' : (entry.status === 'lost' ? 'Lost' : 'Found');
          return `
            <tr>
              <td class="item-cell">
                <div class="item-thumb">
                  <i class="fas ${icon}"></i>
                </div>
                <div class="item-meta">
                  <span class="item-name">${entry.itemName || 'Unknown item'}</span>
                  <span class="item-date">${isClaim ? 'Claimed' : 'Reported'}: ${dateStr}</span>
                </div>
              </td>
              <td><span class="badge-category">${entry.category || typeLabel}</span></td>
              <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
              <td><button class="btn-view" onclick="showDashboardReportDetails(${idx})">View Details</button></td>
            </tr>
          `;
        }).join('');

        // View details modal covers both report and claim entries
        window.showDashboardReportDetails = function (idx) {
          const entry = allActivity[idx];
          const isClaim = entry._isClaim;
          let modal = document.getElementById('dashboard-report-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dashboard-report-modal';
            modal.style.cssText = 'position:fixed;z-index:2000;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
            document.body.appendChild(modal);
          }
          const statusLabel = isClaim
            ? (entry._claimStatus === 'approved' ? 'Claim Approved' : entry._claimStatus === 'rejected' ? 'Claim Rejected' : 'Pending Admin Approval')
            : (entry.claimStatus === 'approved' ? 'Claimed' : 'Pending');
          modal.innerHTML = `
            <div style="background:#fff;padding:2rem;border-radius:12px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;position:relative;">
              <span style="position:absolute;top:10px;right:18px;font-size:2rem;cursor:pointer;color:#aaa;font-weight:bold;" onclick="document.getElementById('dashboard-report-modal').remove()">&times;</span>
              <h2>${entry.itemName}</h2>
              <p style="color:#666;margin-bottom:1.5rem;"><strong>${isClaim ? 'Type: Claim Request' : 'Type:'}</strong> ${isClaim ? '' : `<span style="text-transform:uppercase;color:${entry.status === 'lost' ? '#e05252' : '#2e7d32'};">${entry.status}</span>`}</p>
              ${entry.imageUrl ? `<img src="${entry.imageUrl}" style="max-width:100%;max-height:250px;border-radius:10px;margin-bottom:1rem;">` : ''}
              <div style="margin-bottom:1rem;"><strong>Category:</strong> ${entry.category}</div>
              <div style="margin-bottom:1rem;"><strong>Location:</strong> ${entry.location}</div>
              <div style="margin-bottom:1rem;"><strong>Description:</strong> ${entry.description || 'N/A'}</div>
              <div style="margin-bottom:1rem;"><strong>Status:</strong> ${statusLabel}</div>
            </div>
          `;
        };
      }
    }

    // Claim requests section
    const claimTableBody = document.querySelector('.claims-panel tbody');
    if (claimTableBody) {
      const claimDocs = claimsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (claimDocs.length === 0) {
        claimTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fas fa-inbox"></i><p>No claim requests yet.</p></div></td></tr>`;
      } else {
        // Fetch item details for each claim
        const claimRows = await Promise.all(claimDocs.map(async (claim) => {
          const itemDoc = await getDoc(doc(db, "items", claim.itemId));
          const item = itemDoc.exists() ? itemDoc.data() : {};
          return `
            <tr>
              <td class="item-cell">
                <div class="item-thumb"><i class="fas ${item.status === 'lost' ? 'fa-magnifying-glass' : 'fa-hand-holding-heart'}"></i></div>
                <div class="item-meta">
                  <span class="item-name">${item.itemName || 'Unknown item'}</span>
                  <span class="item-date">Submitted: ${claim.createdAt ? new Date(claim.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
                </div>
              </td>
              <td><span class="badge-category">${item.category || ''}</span></td>
              <td><span class="badge-status ${claim.status === 'approved' ? 'resolved' : claim.status === 'rejected' ? 'rejected' : 'pending'}">
                ${claim.status === 'approved' ? 'Claimed' : claim.status === 'rejected' ? 'Rejected' : 'Pending for approval'}
              </span></td>
              <td>${claim.claimResponse || ''}</td>
            </tr>
          `;
        }));
        claimTableBody.innerHTML = claimRows.join('');
      }
    }

    // Badge count
    const badgeCount = document.querySelector('.badge-count');
    if (badgeCount) badgeCount.textContent = `${claimsSnap.size} Total`;
  });
}

// ── REPORT PAGE ───────────────────────────────────────────
if (window.location.pathname.endsWith('report.html')) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (!sessionStorage.getItem('intentional_logout')) {
        alert('You must log in first!');
      }
      sessionStorage.removeItem('intentional_logout');
      window.location.replace('index.html');
      return;
    }

    // Load user profile
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    const initials = ((userData.firstName?.[0] || '') + (userData.lastName?.[0] || '')).toUpperCase();

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
        sessionStorage.setItem('intentional_logout', '1');
        await signOut(auth);
        window.location.href = 'index.html';
      });
    }

    // Load and display user's own reports
    async function displayUserReports(filter = 'all') {
      let q;
      if (filter === 'all') {
        q = query(collection(db, "items"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
      } else {
        q = query(collection(db, "items"), where("uid", "==", user.uid), where("status", "==", filter), orderBy("createdAt", "desc"));
      }
      const snap = await getDocs(q);
      const browseList = document.getElementById('browseList');
      const browseEmpty = document.getElementById('browseEmpty');

      if (snap.empty) {
        browseList.innerHTML = '';
        if (browseEmpty) browseEmpty.style.display = '';
        return;
      }
      if (browseEmpty) browseEmpty.style.display = 'none';
      browseList.innerHTML = snap.docs.map(d => {
        const report = d.data();
        const docId = d.id;
        return `
          <div class="report-card">
            <button onclick="deleteReport('${docId}')" style="background:#e05252;color:#fff;border:none;border-radius:8px;padding:0.5rem 1rem;font-weight:600;cursor:pointer;float:left;margin-right:1rem;">Delete</button>
            ${report.imageUrl ? `<img src="${report.imageUrl}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;">` : ''}
            <div style="flex:1;">
              <div style="font-weight:700;font-size:1.1rem;">${report.itemName}</div>
              <div style="color:#4a6352;font-size:0.95rem;">${report.category} | ${report.status} | ${report.createdAt ? new Date(report.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
              <div style="color:#888;font-size:0.9rem;">${report.description || ''}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    window.setReportFilter = function (type) {
      // Update active button state
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${type}'`));
      });
      displayUserReports(type);
    };

    window.deleteReport = async function (docId) {
      if (!confirm('Are you sure you want to delete this report?')) return;
      await deleteDoc(doc(db, "items", docId));
      displayUserReports();
    };

    displayUserReports();

    // Report form submission
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const itemType = document.getElementById('itemType').value;
        const itemCategory = document.getElementById('itemCategory').value;
        const itemName = document.getElementById('itemName').value.trim();
        const itemColor = document.getElementById('itemColor').value.trim();
        const itemLocation = document.getElementById('itemLocation').value.trim();
        const itemDetails = document.getElementById('itemDetails').value.trim();
        const itemPhotoFile = document.getElementById('itemPhoto').files[0];

        if (!itemName || !itemColor || !itemLocation) {
          alert('Please fill in all required fields.');
          return;
        }

        let imageUrl = '';
        if (itemPhotoFile) {
          if (itemPhotoFile.size > 700 * 1024) {
            alert('Image is too large. Please upload an image under 700KB.');
            return;
          }
          imageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read image.'));
            reader.readAsDataURL(itemPhotoFile);
          });
        }

        try {
          await addDoc(collection(db, "items"), {
            status: itemType,
            category: itemCategory,
            itemName,
            description: itemColor + (itemDetails ? ' - ' + itemDetails : ''),
            location: itemLocation,
            imageUrl,
            uid: user.uid,
            userName: fullName,
            userEmail: userData.email || user.email,
            claimStatus: 'open',
            claimed: false,
            createdAt: serverTimestamp()
          });

          alert('Report submitted successfully!');
          reportForm.reset();
          document.getElementById('fileName').textContent = '';
          displayUserReports();
        } catch (err) {
          console.error('Error submitting report:', err);
          alert('Failed to submit report.');
        }
      });
    }

    // File upload display
    const itemPhoto = document.getElementById('itemPhoto');
    if (itemPhoto) {
      itemPhoto.addEventListener('change', function () {
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
      clearFormBtn.addEventListener('click', function () {
        reportForm.reset();
        document.getElementById('fileName').textContent = '';
      });
    }

    // Focus report button
    const focusReportBtn = document.getElementById('focusReportBtn');
    if (focusReportBtn) {
      focusReportBtn.addEventListener('click', () => {
        document.getElementById('itemName').focus();
      });
    }
  });
}