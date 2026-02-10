import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, setDoc, onSnapshot, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONFIG FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCVL0wn9Qa7m1kC3mwYi_kornE1xvXLqgU",
    authDomain: "josjis-frozen-partner.firebaseapp.com",
    projectId: "josjis-frozen-partner",
    storageBucket: "josjis-frozen-partner.appspot.com",
    messagingSenderId: "90587500661",
    appId: "1:90587500661:web:c01c1c94e5d6bc3aafe83c",
    measurementId: "G-8EK19GN9YH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// EMAIL ADMIN YANG DIIZINKAN
const ALLOWED_ADMIN_EMAIL = "bismillah@josjis.co";

// UI Elements
const loginPage = document.getElementById('loginPage');
const dashboardArea = document.getElementById('dashboardArea');

// ==========================================
// 1. AUTHENTICATION & SECURITY CHECK
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- PROTEKSI KEAMANAN ---
        if (user.email !== ALLOWED_ADMIN_EMAIL) {
            alert("AKSES DITOLAK!\nAnda bukan Admin Pusat.");
            signOut(auth).then(() => {
                window.location.reload(); // Refresh halaman untuk menendang user
            });
            return;
        }

        // Jika benar admin, tampilkan dashboard
        loginPage.style.display = 'none';
        dashboardArea.style.display = 'flex';
        initDashboard();
    } else {
        // Jika belum login
        loginPage.style.display = 'flex';
        dashboardArea.style.display = 'none';
    }
});

// Login Form
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    // Validasi awal di frontend (Opsional, tapi bagus untuk UX)
    if(email !== ALLOWED_ADMIN_EMAIL) {
        alert("Email ini tidak terdaftar sebagai Admin Pusat.");
        return;
    }

    signInWithEmailAndPassword(auth, email, pass)
        .catch(err => alert("Login Gagal: " + err.message));
});

window.logout = () => signOut(auth);

// ==========================================
// 2. NAVIGASI HALAMAN
// ==========================================
window.showPage = (pageId) => {
    document.querySelectorAll('.page-section').forEach(sec => sec.style.display = 'none');
    document.getElementById('page-' + pageId).style.display = 'block';
    
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
}

function initDashboard() {
    loadPartners();
    loadClaims();
    loadFinance();
    loadCourses();
}

// ==========================================
// 3. FITUR: KELOLA MITRA & STOK
// ==========================================
function loadPartners() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        const tbody = document.getElementById('partnersTable');
        tbody.innerHTML = "";
        
        snapshot.forEach(docSnap => {
            const u = docSnap.data();
            const total = u.totalStockPurchased || 0;
            const claimed = u.stockClaimed || 0;
            const left = total - claimed;

            tbody.innerHTML += `
                <tr>
                    <td><b>${u.shopName || u.name}</b><br><small>${u.email}</small></td>
                    <td>${u.phone || '-'}</td>
                    <td>${total} Pcs</td>
                    <td>${claimed} Pcs</td>
                    <td style="color:${left >= 50 ? 'green':'#666'}; font-weight:bold;">${left} Poin</td>
                    <td>
                        <button class="btn-primary" onclick="openStockModal('${docSnap.id}', ${total})">+ Stok</button>
                    </td>
                </tr>
            `;
        });
    });
}

// Tambah Mitra Baru (Create Account)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const pack = document.getElementById('regPackage').value;

    if(!confirm("Anda akan membuat akun mitra baru. Sistem akan otomatis login ke akun baru tersebut untuk setup awal. Mohon login kembali sebagai Admin setelah selesai.")) return;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
            name: name,
            email: email,
            phone: phone,
            package: pack,
            shopName: "Toko " + name,
            totalStockPurchased: 0,
            stockClaimed: 0,
            createdAt: new Date().toISOString()
        });

        alert("Akun Mitra Berhasil Dibuat! Silakan Logout dan Login kembali sebagai Admin.");
        closeModal('registerModal');
    } catch (err) {
        alert("Gagal: " + err.message);
    }
});

// Update Stok Logic
window.openStockModal = (uid, current) => {
    document.getElementById('stockUserId').value = uid;
    document.getElementById('stockCurrentTotal').value = current;
    document.getElementById('stockModal').style.display = 'flex';
}

document.getElementById('stockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('stockUserId').value;
    const current = Number(document.getElementById('stockCurrentTotal').value);
    const qty = Number(document.getElementById('stockQty').value);

    try {
        await updateDoc(doc(db, "users", uid), {
            totalStockPurchased: current + qty
        });
        alert("Stok berhasil ditambahkan!");
        closeModal('stockModal');
        document.getElementById('stockQty').value = "";
    } catch (err) {
        alert("Error: " + err.message);
    }
});

// ==========================================
// 4. FITUR: VALIDASI KLAIM REWARD
// ==========================================
function loadClaims() {
    const q = query(collection(db, "withdrawals"), orderBy("requestDate", "desc"));
    onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('claimsTable');
        tbody.innerHTML = "";
        
        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const date = new Date(c.requestDate).toLocaleDateString('id-ID');
            let statusBadge = c.status === 'pending' 
                ? '<span style="background:#fff7ed; color:#c2410c; padding:4px 8px; border-radius:10px; font-size:0.8rem;">PENDING</span>'
                : '<span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:10px; font-size:0.8rem;">SUKSES</span>';

            let actionBtn = c.status === 'pending'
                ? `<input type="text" class="proof-input" id="proof_${docSnap.id}" placeholder="Link Bukti/Ref">
                   <button onclick="approveClaim('${docSnap.id}')" style="background:#22c55e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Kirim</button>`
                : `<a href="${c.transferProof}" target="_blank" style="color:#2563eb; font-size:0.8rem;">Lihat Bukti</a>`;

            tbody.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td><b>${c.shopName}</b><br><small>${c.userName}</small></td>
                    <td style="color:#1e3a8a; font-weight:bold;">Rp ${c.amount.toLocaleString()}</td>
                    <td><small>${c.paymentInfo}</small></td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    });
}

window.approveClaim = async (id) => {
    const proof = document.getElementById('proof_' + id).value;
    if(!proof) return alert("Masukkan bukti transfer/nomor referensi!");
    
    if(confirm("Validasi transfer ini?")) {
        await updateDoc(doc(db, "withdrawals", id), {
            status: 'success',
            transferProof: proof,
            processedDate: new Date().toISOString()
        });
        alert("Klaim Berhasil Divalidasi!");
    }
}

// ==========================================
// 5. FITUR: LAPORAN KEUANGAN PUSAT
// ==========================================
function loadFinance() {
    // Listener Users
    onSnapshot(collection(db, "users"), (userSnap) => {
        let totalStock = 0;
        userSnap.forEach(doc => {
            totalStock += (doc.data().totalStockPurchased || 0);
        });
        
        const revenue = totalStock * 15000; 
        
        document.getElementById('totalStockSold').innerText = totalStock + " Pcs";
        document.getElementById('totalRevenue').innerText = "Rp " + revenue.toLocaleString();
        
        updateChart(totalStock, revenue);
    });

    const qSuccess = query(collection(db, "withdrawals"));
    onSnapshot(qSuccess, (wSnap) => {
        let totalReward = 0;
        wSnap.forEach(doc => {
            if(doc.data().status === 'success') {
                totalReward += doc.data().amount;
            }
        });
        document.getElementById('totalRewardPaid').innerText = "Rp " + totalReward.toLocaleString();
    });
}

let adminChart = null;
function updateChart(stock, revenue) {
    const ctx = document.getElementById('adminChart');
    if(!ctx) return;
    if(adminChart) adminChart.destroy();

    adminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Stok Terjual (Pcs)', 'Estimasi Pendapatan (x1000)'],
            datasets: [{
                label: 'Performa Kemitraan',
                data: [stock, revenue/1000],
                backgroundColor: ['#1e3a8a', '#22c55e']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================
// 6. FITUR: KELOLA KURSUS
// ==========================================
function loadCourses() {
    onSnapshot(collection(db, "courses"), (snapshot) => {
        const grid = document.getElementById('courseList');
        grid.innerHTML = "";
        
        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            grid.innerHTML += `
                <div class="course-card">
                    <img src="${c.image}" alt="Course">
                    <h4>${c.title}</h4>
                    <p style="font-size:0.8rem; color:#666;">${c.desc}</p>
                    <a href="${c.link}" target="_blank" style="color:#2563eb; font-size:0.8rem;">Lihat Materi</a>
                    <button onclick="deleteCourse('${docSnap.id}')" style="float:right; color:red; background:none; border:none; cursor:pointer;">Hapus</button>
                </div>
            `;
        });
    });
}

document.getElementById('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "courses"), {
            title: document.getElementById('courseTitle').value,
            desc: document.getElementById('courseDesc').value,
            image: document.getElementById('courseImg').value,
            link: document.getElementById('courseLink').value,
            createdAt: new Date().toISOString()
        });
        alert("Kursus Ditambahkan!");
        closeModal('courseModal');
        document.getElementById('courseForm').reset();
    } catch(e) { alert(e.message); }
});

window.deleteCourse = async (id) => {
    if(confirm("Hapus materi ini?")) {
        await deleteDoc(doc(db, "courses", id));
    }
}

// ==========================================
// UTILS
// ==========================================
window.openRegisterModal = () => document.getElementById('registerModal').style.display = 'flex';
window.openCourseModal = () => document.getElementById('courseModal').style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.onclick = (e) => { if(e.target.className === 'modal') e.target.style.display = "none"; }