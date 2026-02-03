// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAETIdOgfbsFbsre2k4dg7_Q20RvJ86A1s",
    authDomain: "mengukur-tmat.firebaseapp.com",
    databaseURL: "https://mengukur-tmat-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mengukur-tmat",
    storageBucket: "mengukur-tmat.firebasestorage.app",
    messagingSenderId: "859838803588",
    appId: "1:859838803588:web:860b68685d73c0f71a9cd1",
    measurementId: "G-Z2310XEL1G"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 3. VARIABLES & DATA STORAGE ---
let allData = []; // Store all fetched data for filtering
let currentData = []; // Data currently displayed
// Global Config Variables
let configSettings = {
    banjir: 0,
    aman_min: 50,
    aman_max: 200,
    kering: 200
};
const tableBody = document.getElementById('table-body');
const valTmat = document.getElementById('val-tmat');
const badgeMain = document.getElementById('badge-status-main');
const statusCard = document.getElementById('status-card');

const navLogin = document.getElementById('nav-login');
const navLogout = document.getElementById('nav-logout');
const btnShowInput = document.getElementById('btn-show-input');
const adminTools = document.getElementById('admin-tools');
const checkAllBox = document.getElementById('check-all');
const checkCols = document.querySelectorAll('.check-col');


// Views
const viewDashboard = document.getElementById('view-dashboard');
const viewSettings = document.getElementById('view-settings');
// cardInput removed
const menuDashboard = document.getElementById('menu-dashboard');
const menuSettings = document.getElementById('menu-settings');

// Check Session
checkSession();

// --- 4. FETCH AND LISTEN ---
const historyRef = db.ref('/tmat/history');
const configRef = db.ref('/tmat/config');

// Load Config
configRef.on('value', (snapshot) => {
    const cfg = snapshot.val();
    if (cfg) {
        // Update DOM
        document.getElementById('cfg-offset').value = cfg.offset || 0;
        document.getElementById('cfg-max-sensor').value = cfg.max_sensor || 400; // Default 400
        document.getElementById('cfg-banjir').value = cfg.banjir || 0;
        document.getElementById('cfg-aman-min').value = cfg.aman_min || 0;
        document.getElementById('cfg-aman-max').value = cfg.aman_max || 0;
        document.getElementById('cfg-kering').value = cfg.kering || 0;

        // Update Global Variables
        configSettings.banjir = parseFloat(cfg.banjir || 0);
        configSettings.aman_min = parseFloat(cfg.aman_min || 0);
        configSettings.aman_max = parseFloat(cfg.aman_max || 0);
        configSettings.kering = parseFloat(cfg.kering || 0);
    }
});



historyRef.limitToLast(100).on('value', (snapshot) => { // Increased limit
    const data = snapshot.val();
    if (!data) {
        allData = [];
        renderTable([]);
        valTmat.innerText = "-- cm";
        return;
    }

    // Convert Object to Array
    allData = Object.keys(data).map(key => ({ 
        id: key, 
        ...data[key] 
    })); 
 
    // Sort Descending 
    allData.sort((a, b) => b.timestamp - a.timestamp);

    // Initial Render (No Filter)
    currentData = [...allData];
    updateDashboardDefault(allData[0]);
    renderTable(currentData);
});

// --- 4. RENDER FUNCTIONS ---
function updateDashboardDefault(latest) {
    if (!latest) return;
    valTmat.innerText = latest.tmat.toFixed(1) + " cm";

    // Status Logic & Color
    let s = latest.status || "Unknown";
    let color = "#eee";
    let textColor = "#333";
    let borderColor = "var(--primary)";

    if (s === "Kering") {
        color = "#ffe082"; textColor = "#795548"; borderColor = "#ffca28";
    } else if (s === "Aman") {
        color = "#c8e6c9"; textColor = "#2e7d32"; borderColor = "#66bb6a";
    } else if (s === "Tinggi") {
        color = "#ffecb3"; textColor = "#ff8f00"; borderColor = "#ffca28"; // Orange-ish
    } else if (s === "Banjir") {
        color = "#ffcdd2"; textColor = "#c62828"; borderColor = "#ef5350";
    }

    badgeMain.innerText = s;
    badgeMain.style.background = color;
    badgeMain.style.color = textColor;
    statusCard.style.borderLeftColor = borderColor;
}

function renderTable(list) {
    tableBody.innerHTML = "";
    currentData = list;

    // Check role for columns logic
    const role = localStorage.getItem('role');
    const iskepala_distrik = (role === 'kepala distrik');

    // Show/Hide Checkbox Header
    // Show/Hide Checkbox & Action Headers
    const thCheck = document.getElementById('th-check');
    const thAction = document.getElementById('th-action');

    if (iskepala_distrik) {
        if (thCheck) thCheck.style.display = 'table-cell';
        if (thAction) thAction.style.display = 'table-cell';
    } else {
        if (thCheck) thCheck.style.display = 'none';
        if (thAction) thAction.style.display = 'none';
        checkAllBox.checked = false;
    }

    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${iskepala_distrik ? 5 : 4}" style="text-align:center;">Tidak ada data.</td></tr>`;
        return;
    }

    list.forEach((item, index) => {
        // 1. Format Time
        const dateObj = new Date(item.timestamp);
        const dateStr = dateObj.toLocaleDateString('id-ID');
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        // 2. Logic Perubahan
        let changeHtml = '<span class="change-flat">-</span>';
        // Compare with next item (older) or find logic
        // Since we filtered, index+1 might not be the direct predecessor in time, but okay for table view
        if (index < list.length - 1) {
            const prevItem = list[index + 1];
            const diff = item.tmat - prevItem.tmat;

            if (diff > 0) changeHtml = `<span class="change-up">▲ +${diff.toFixed(1)} cm</span>`;
            else if (diff < 0) changeHtml = `<span class="change-down">▼ ${diff.toFixed(1)} cm</span>`;
        }

        // 3. Badge
        let badgeClass = "";
        if (item.status === "Kering") badgeClass = "badge-kering";
        else if (item.status === "Aman") badgeClass = "badge-aman";
        else if (item.status === "Tinggi") badgeClass = "badge-tinggi";
        else if (item.status === "Banjir") badgeClass = "badge-banjir";

        // 4. Checkbox Cell & Action Cell
        let checkCell = "";
        let actionCell = ""; // For per-row delete

        if (iskepala_distrik) {
            checkCell = `<td style="text-align:center;"><input type="checkbox" class="data-check" value="${item.id}"></td>`;
            actionCell = `<td style="text-align:center;">
                <button onclick="deleteSingle('${item.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>`;
        }

        const row = `
            <tr>
                ${checkCell}
                <td>
                    <div style="font-weight:600;">${timeStr} WIB</div>
                    <div style="font-size:0.8em; color:#888;">${dateStr}</div>
                </td>
                <td style="font-size:1.1em; font-weight:bold;">${item.tmat.toFixed(1)} cm</td>
                <td>${changeHtml}</td>
                <td><span class="badge ${badgeClass}">${item.status}</span></td>
                ${iskepala_distrik ? actionCell : ''} 
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// --- 5. FILTER & EXPORT ---
function filterData() {
    const startVal = document.getElementById('start-date').value;
    const endVal = document.getElementById('end-date').value;

    if (!startVal && !endVal) {
        renderTable(allData);
        return;
    }

    const startDate = startVal ? new Date(startVal).setHours(0, 0, 0, 0) : 0;
    const endDate = endVal ? new Date(endVal).setHours(23, 59, 59, 999) : new Date().getTime();

    const filtered = allData.filter(item => {
        return item.timestamp >= startDate && item.timestamp <= endDate;
    });

    renderTable(filtered);
}

function exportExcel() {
    if (currentData.length === 0) {
        alert("Tidak ada data untuk diexport!");
        return;
    }

    // Format Data for Excel
    const dataForSheet = currentData.map(item => {
        const d = new Date(item.timestamp);
        return {
            "Tanggal": d.toLocaleDateString('id-ID'),
            "Jam": d.toLocaleTimeString('id-ID'),
            "Tinggi Air (cm)": item.tmat,
            "Status": item.status
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat TMAT");
    XLSX.writeFile(workbook, "Laporan_TMAT.xlsx");
}

// --- 6. DELETE & CHECKBOX ---
function toggleSelectAll() {
    const checks = document.querySelectorAll('.data-check');
    checks.forEach(c => c.checked = checkAllBox.checked);
}

function deleteSelected() {
    const checks = document.querySelectorAll('.data-check:checked');
    if (checks.length === 0) {
        alert("Pilih data yang ingin dihapus!");
        return;
    }

    if (!confirm(`Yakin ingin menghapus ${checks.length} data terpilih?`)) return;

    let promises = [];
    checks.forEach(c => {
        const id = c.value;
        promises.push(db.ref('/tmat/history/' + id).remove());
    });

    Promise.all(promises).then(() => {
        alert("Data berhasil dihapus.");
        checkAllBox.checked = false;
    }).catch(err => {
        alert("Gagal menghapus: " + err.message);
    });
}

function deleteSingle(id) {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    db.ref('/tmat/history/' + id).remove()
        .then(() => alert("Data dihapus."))
        .catch(err => alert("Gagal: " + err.message));
}

// --- 5. UI UTILS ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Close sidebar when clicking outside (Mobile)
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    // If sidebar is open, and click is NOT on sidebar, and NOT on the toggle button
    if (sidebar.classList.contains('active') &&
        !sidebar.contains(event.target) &&
        !menuToggle.contains(event.target)) {
        sidebar.classList.remove('active');
    }
});

function showView(viewName) {
    if (viewName === 'dashboard') {
        viewDashboard.style.display = 'block';
        viewSettings.style.display = 'none';
        menuDashboard.classList.add('active');
        menuSettings.classList.remove('active');
    } else if (viewName === 'settings') {
        const isLogged = localStorage.getItem('isLoggedIn') === 'true';
        const role = localStorage.getItem('role');

        if (!isLogged || role !== 'kepala distrik') {
            alert("Hanya Kepala Distrik yang dapat mengakses pengaturan!");
            return;
        }

        viewDashboard.style.display = 'none';
        viewSettings.style.display = 'block';
        menuDashboard.classList.remove('active');
        menuSettings.classList.add('active');
    }
}

// --- 7. AUTH LOGIC --- 
const modalLogin = document.getElementById('modal-login');
const modalInput = document.getElementById('modal-input');

// Functions
function openLoginModal() { modalLogin.style.display = 'block'; }
function closeLoginModal() { modalLogin.style.display = 'none'; }

function openInputModal() { modalInput.style.display = 'block'; }
function closeInputModal() { modalInput.style.display = 'none'; }

window.onclick = function (event) {
    if (event.target == modalLogin) closeLoginModal();
    if (event.target == modalInput) closeInputModal();
}

function doLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    if (pass === 'admin') {
        if (user === 'petugas1') {
            onLoginSuccess('petugas');
        } else if (user === 'kepala distrik') {
            onLoginSuccess('kepala distrik');
        } else {
            alert('Username tidak terdaftar!');
        }
    } else {
        alert('Password salah!');
    }
}

function onLoginSuccess(role) {
    alert(`Login Berhasil sebagai ${role}!`);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('role', role);
    checkSession();
    closeLoginModal();
    // Refresh table to show checkboxes if mandor
    renderTable(currentData);
}

function doLogout() {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('role');
        checkSession();
        // Refresh table to hide checkboxes
        renderTable(currentData);
    }
}

function checkSession() {
    const isLogged = localStorage.getItem('isLoggedIn') === 'true';
    const role = localStorage.getItem('role');

    if (isLogged) {
        if (navLogin) navLogin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'flex';

        // Input Button visible
        if (btnShowInput) btnShowInput.style.display = 'inline-block';

        // Kepala Distrik tools
        if (role === 'kepala distrik' && adminTools) {
            adminTools.style.display = 'block';
        } else if (adminTools) {
            adminTools.style.display = 'none';
        }
    } else {
        if (navLogin) navLogin.style.display = 'flex';
        if (navLogout) navLogout.style.display = 'none';
        if (btnShowInput) btnShowInput.style.display = 'none';
        if (adminTools) adminTools.style.display = 'none';

        // Force view to dashboard if logged out while on settings
        if (viewSettings.style.display === 'block') {
            showView('dashboard');
        }
    }
}

function submitManualData() {
    const tmatInput = document.getElementById('input-tmat');
    const dateInput = document.getElementById('input-datetime');

    const tmatVal = parseFloat(tmatInput.value);
    const dateVal = dateInput.value;

    if (isNaN(tmatVal)) { alert('Isi nilai TMAT!'); return; }

    // Logic Status (Auto Calculation)
    let statusVal = "Banjir"; // Default
    if (tmatVal > configSettings.kering) {
        statusVal = "Kering";
    } else if (tmatVal >= configSettings.aman_min && tmatVal <= configSettings.aman_max) {
        statusVal = "Aman";
    } else if (tmatVal >= configSettings.banjir && tmatVal < configSettings.aman_min) {
        statusVal = "Tinggi";
    } else {
        statusVal = "Banjir";
    }

    // Logic Timestamp: User Input vs Realtime
    let ts = firebase.database.ServerValue.TIMESTAMP;
    if (dateVal) {
        ts = new Date(dateVal).getTime();
    }

    db.ref('/tmat/history').push({
        tmat: tmatVal,
        status: statusVal,
        timestamp: ts
    }).then(() => {
        alert('Disimpan! Status: ' + statusVal);
        closeInputModal();
        tmatInput.value = '';
        dateInput.value = '';
    });
}

// --- 8. SETTINGS LOGIC ---
function saveSettings() {
    const offset = parseFloat(document.getElementById('cfg-offset').value);
    const maxSensor = parseFloat(document.getElementById('cfg-max-sensor').value);
    const banjir = parseFloat(document.getElementById('cfg-banjir').value);
    const amanMin = parseFloat(document.getElementById('cfg-aman-min').value);
    const amanMax = parseFloat(document.getElementById('cfg-aman-max').value);
    const kering = parseFloat(document.getElementById('cfg-kering').value);

    // 1. Basic Validation (Numbers)
    if (isNaN(offset) || isNaN(maxSensor) || isNaN(banjir) || isNaN(amanMin) || isNaN(amanMax) || isNaN(kering)) {
        alert("Harap isi semua kolom dengan angka yang valid!");
        return;
    }

    // 2. Safety System Validation (Logic)
    // Rule: Banjir < Aman Min
    if (banjir >= amanMin) {
        alert("ERROR: Batas Banjir harus lebih kecil dari Batas Aman Min!");
        return;
    }

    // Rule: Aman Min < Aman Max
    if (amanMin >= amanMax) {
        alert("ERROR: Batas Aman Min harus lebih kecil dari Batas Aman Max!");
        return;
    }

    // Rule: Aman Max < Kering
    if (amanMax >= kering) {
        alert("ERROR: Batas Aman Max harus lebih kecil dari Batas Kering!");
        return;
    }

    // Rule: Values cannot exceed Max Sensor
    if (kering > maxSensor) {
        alert("WARNING: Batas Kering melebihi Max Sensor Reading!");
        return;
    }

    db.ref('/tmat/config').set({
        offset: offset,
        max_sensor: maxSensor,
        banjir: banjir,
        aman_min: amanMin,
        aman_max: amanMax,
        kering: kering
    }).then(() => {
        alert("System Safety Check Passed.\nPengaturan berhasil disimpan!");
        showView('dashboard'); // Return to dashboard
    }).catch(err => alert("Gagal menyimpan: " + err.message));
}
