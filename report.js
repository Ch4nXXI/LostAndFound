import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  getDocs,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";


// ── DOM REFERENCES ───────────────────────────────────────
const reportForm = document.getElementById('reportForm');
const browseList = document.getElementById('browseList');
const browseEmpty = document.getElementById('browseEmpty');
const fileInput = document.getElementById('itemPhoto');
const fileName = document.getElementById('fileName');
const clearFormBtn = document.getElementById('clearFormBtn');
const focusReportBtn = document.getElementById('focusReportBtn');
const currentFilter = document.getElementById('currentFilter');
const filterButtons = document.querySelectorAll('.filter-btn');
const userNameElem = document.querySelector('.user-name');
const userAvatarElem = document.querySelector('.user-avatar');
const navUser = document.querySelector('.nav-user');
const logoutBtn = document.querySelector('.logout');

let currentUser = null;
let activeFilter = 'all';

// ── AUTH STATE ───────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // Get user profile from Firestore
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js");
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const fullName = `${userData.firstName} ${userData.lastName}`;
      if (userNameElem) userNameElem.textContent = fullName;
      if (userAvatarElem) userAvatarElem.textContent = `${userData.firstName[0]}${userData.lastName[0] || ''}`.toUpperCase();
    }

    renderReports(activeFilter);
  } else {
    window.location.href = 'index.html';
  }
});

// ── NAV USER DROPDOWN ────────────────────────────────────
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

// ── LOGOUT ───────────────────────────────────────────────
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
      window.location.href = 'index.html';
    });
  });
}

// ── RENDER REPORTS FROM FIRESTORE ────────────────────────
const renderReports = async (filter = 'all') => {
  browseList.innerHTML = '<p>Loading reports...</p>';

  let q;
  if (filter === 'all') {
    q = query(collection(db, "items"), orderBy("createdAt", "desc"));
  } else {
    q = query(
      collection(db, "items"),
      where("status", "==", filter),
      orderBy("createdAt", "desc")
    );
  }

  const snapshot = await getDocs(q);

  browseList.innerHTML = '';
  if (snapshot.empty) {
    if (browseEmpty) browseEmpty.style.display = 'block';
    return;
  }

  if (browseEmpty) browseEmpty.style.display = 'none';

  snapshot.forEach((docSnap) => {
    const report = docSnap.data();
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="card-main">
        <span class="card-badge ${report.status}">${report.status === 'lost' ? 'Lost' : 'Found'}</span>
        <h3 class="card-title">${report.itemName}</h3>
        <div class="card-meta">
          <span><i class="fas fa-tag"></i>${report.category}</span>
          <span><i class="fas fa-map-marker-alt"></i>${report.location}</span>
          <span><i class="fas fa-calendar-days"></i>${report.createdAt ? new Date(report.createdAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'N/A'}</span>
        </div>
        <p>${report.description || 'No additional details provided.'}</p>
        ${report.imageUrl ? `<img src="${report.imageUrl}" alt="${report.itemName}" style="max-width:100%;border-radius:8px;margin-top:8px;">` : ''}
      </div>
      <div class="card-actions">
        <button type="button">View</button>
      </div>
    `;
    browseList.appendChild(card);
  });
};

// ── UPDATE FILTER LABEL ──────────────────────────────────
const updateFilterLabel = (value) => {
  if (currentFilter) {
    currentFilter.textContent = `Showing: ${value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}`;
  }
};

// ── FILE INPUT DISPLAY ───────────────────────────────────
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      if (fileName) fileName.textContent = `Selected file: ${e.target.files[0].name}`;
    } else {
      if (fileName) fileName.textContent = '';
    }
  });
}

// ── REPORT FORM SUBMIT ───────────────────────────────────
if (reportForm) {
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('You must be logged in to submit a report.');
      return;
    }

    const submitBtn = reportForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    let imageUrl = '';

    // ── Convert image to Base64 ──
    if (fileInput && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 700 * 1024) {
        alert('Image is too large. Please upload an image under 700KB.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Report';
        }
        return;
      }
      imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image.'));
        reader.readAsDataURL(file);
      });
    }

    try {
      await addDoc(collection(db, 'items'), {
        status: document.getElementById('itemType').value,
        category: document.getElementById('itemCategory').value,
        itemName: document.getElementById('itemName').value.trim(),
        itemColor: document.getElementById('itemColor').value.trim(),
        location: document.getElementById('itemLocation').value.trim(),
        description: document.getElementById('itemDetails').value.trim(),
        imageUrl,
        uid: currentUser.uid,
        createdAt: serverTimestamp()
      });

      alert('Report submitted successfully.');
      reportForm.reset();
      if (fileName) fileName.textContent = '';
      renderReports(activeFilter);
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit report.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
      }
    }
  });
}

// ── CLEAR FORM ───────────────────────────────────────────
if (clearFormBtn) {
  clearFormBtn.addEventListener('click', () => {
    reportForm.reset();
    if (fileName) fileName.textContent = '';
  });
}

// ── FOCUS REPORT ─────────────────────────────────────────
if (focusReportBtn) {
  focusReportBtn.addEventListener('click', () => {
    document.getElementById('itemName').focus();
  });
}

// ── FILTER BUTTONS ───────────────────────────────────────
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    renderReports(activeFilter);
    updateFilterLabel(activeFilter);
  });
});

// ── INITIAL RENDER ───────────────────────────────────────
updateFilterLabel('all');