// dashboard-firebase.js
// VERSI FULL PACK: SEMUA FITUR ADA (Grafik + Download + Reward Stok + Kasir)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Elemen UI
const loginPage = document.getElementById('loginPage');
const dashboardArea = document.getElementById('dashboardArea');
const loginForm = document.getElementById('loginForm');
const userNameDisplay = document.getElementById('userNameDisplay');

// Variabel Global
let currentUserData = {}; 
let allTransactionsData = []; // Untuk fitur Download Laporan
let myChart = null; // Untuk Grafik

// ==========================================
// 1. AUTHENTICATION & NAVIGATION
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if(loginPage) loginPage.style.display = 'none';
        if(dashboardArea) dashboardArea.style.display = 'flex';
        
        loadUserProfile(user.uid);
        loadTransactions(user.uid);
        showPage('home');
    } else {
        if(loginPage) loginPage.style.display = 'flex';
        if(dashboardArea) dashboardArea.style.display = 'none';
    }
});

if(loginForm){
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button');
        btn.innerText = "Loading...";
        signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value)
            .then(() => btn.innerText = "Masuk Dashboard")
            .catch((e) => { btn.innerText="Masuk Dashboard"; alert(e.message); });
    });
}

window.logout = function() {
    if(confirm("Keluar dari aplikasi?")) signOut(auth).then(() => location.reload());
}

// --- PERBAIKAN NAVIGASI SIDEBAR ---
window.showPage = function(pageId) {
    // 1. Sembunyikan semua halaman
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 2. Tampilkan halaman yang dipilih
    const target = document.getElementById('page-' + pageId);
    if(target) target.style.display = 'block';
    
    // 3. LOGIKA BARU: Pindahkan kelas 'active' di Sidebar
    // Cari semua menu
    document.querySelectorAll('.sidebar-menu li').forEach(li => {
        li.classList.remove('active'); // Hapus aktif dari semua
        
        // Cek jika tombol ini mengarah ke pageId yang sedang dibuka
        // Kita cek atribut onclick-nya mengandung nama halaman atau tidak
        if(li.getAttribute('onclick') && li.getAttribute('onclick').includes(`'${pageId}'`)) {
            li.classList.add('active'); // Tambah aktif ke tombol ini
        }
    });

    // Khusus: Jika membuka laporan, resize grafik agar pas
    if(pageId === 'laporan') window.dispatchEvent(new Event('resize'));
}

// ==========================================
// 2. DATA USER & LOGIKA REWARD (BARU)
// ==========================================
async function loadUserProfile(uid) {
    onSnapshot(doc(db, "users", uid), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            currentUserData = data; 
            
            const name = data.shopName || data.name;
            if(userNameDisplay) userNameDisplay.innerText = name;
            if(document.getElementById('homeShopName')) document.getElementById('homeShopName').innerText = name;
            
            // Auto-fill Settings
            if(document.getElementById('editShopName')) document.getElementById('editShopName').value = name;
            if(document.getElementById('editShopPhone')) document.getElementById('editShopPhone').value = data.phone || "";
            if(document.getElementById('payMethodName')) document.getElementById('payMethodName').value = data.paymentMethod || "";
            if(document.getElementById('payDetails')) document.getElementById('payDetails').value = data.paymentDetails || "";

            // === LOGIKA REWARD STOK (50 PCS = 20K) ===
            const totalStock = data.totalStockPurchased || 0; 
            const stockClaimed = data.stockClaimed || 0;
            const activeStock = totalStock - stockClaimed;
            
            // Hitung Reward
            const rewardCount = Math.floor(activeStock / 50); 
            const rewardValue = rewardCount * 20000;

            if(document.getElementById('homeReward')) document.getElementById('homeReward').innerText = activeStock + " Pcs";
            
            const rewardValueEl = document.getElementById('homeRewardValue');
            if(rewardValueEl) {
                if(rewardValue > 0) {
                    // Tampilkan Tombol Klaim
                    rewardValueEl.innerHTML = `
                        <span style="color:#fff; font-weight:bold;">Saldo: Rp ${rewardValue.toLocaleString()}</span> 
                        <button onclick="openClaimModal(${rewardValue})" style="margin-left:5px; background:white; color:#1e3a8a; border:none; padding:4px 10px; border-radius:15px; cursor:pointer; font-weight:bold; font-size:0.75rem;">
                            Klaim
                        </button>`;
                } else {
                    rewardValueEl.innerText = `Kurang ${50 - (activeStock % 50)} pcs lagi untuk reward`;
                }
            }
        }
    });
}

// ==========================================
// 3. TRANSAKSI, GRAFIK, & DOWNLOAD (DIKEMBALIKAN)
// ==========================================
function loadTransactions(uid) {
    const q = query(collection(db, "users", uid, "transactions"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('transactionTableBody');
        let income = 0;
        let expense = 0;
        let htmlRows = "";
        
        allTransactionsData = []; // Reset data download

        if (snapshot.empty) {
            updateSummary(0, 0); renderChart(0, 0);
            if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Belum ada data</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const trx = doc.data();
            const amount = Number(trx.amount);
            
            // Simpan data untuk download CSV
            allTransactionsData.push({
                date: trx.date, desc: trx.desc, type: trx.type, amount: amount
            });

            if(trx.type === 'income') {
                income += amount;
                htmlRows += `<tr><td>${trx.date}</td><td>${trx.desc}</td><td class="text-success">Masuk</td><td>+ ${amount.toLocaleString()}</td></tr>`;
            } else {
                expense += amount;
                htmlRows += `<tr><td>${trx.date}</td><td>${trx.desc}</td><td class="text-danger">Keluar</td><td>- ${amount.toLocaleString()}</td></tr>`;
            }
        });

        if(tbody) tbody.innerHTML = htmlRows;
        
        // Update UI, Grafik, dan Widget
        updateSummary(income, expense);
        renderChart(income, expense);
    });
}

function updateSummary(income, expense) {
    const profit = income - expense;
    const fmtInc = "Rp " + income.toLocaleString('id-ID');
    const fmtExp = "Rp " + expense.toLocaleString('id-ID');
    const fmtProf = "Rp " + profit.toLocaleString('id-ID');

    // Laporan Page
    if(document.getElementById('reportIncome')) document.getElementById('reportIncome').innerText = fmtInc;
    if(document.getElementById('reportExpense')) document.getElementById('reportExpense').innerText = fmtExp;
    if(document.getElementById('reportProfit')) document.getElementById('reportProfit').innerText = fmtProf;

    // Home Page
    if(document.getElementById('homeOmzet')) document.getElementById('homeOmzet').innerText = fmtInc;
    if(document.getElementById('homeDisplayProfit')) document.getElementById('homeDisplayProfit').innerText = fmtProf;
}

// --- FITUR GRAFIK (CHART.JS) ---
function renderChart(income, expense) {
    const ctx = document.getElementById('profitChart');
    if(!ctx) return; 
    
    if(myChart) myChart.destroy(); // Hancurkan chart lama agar tidak tumpang tindih

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });
}

// --- FITUR DOWNLOAD CSV ---
window.downloadReport = function() {
    if(allTransactionsData.length === 0) return alert("Belum ada data.");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "KOP JOSJIS FROZEN\n\n";
    csvContent += "Nama Toko:," + (currentUserData.shopName || "-") + "\n";
    csvContent += "Jenis Kemitraan:," + (currentUserData.package || "Reseller") + "\n\n";
    csvContent += "Tanggal,Keterangan,Tipe,Nominal\n";

    allTransactionsData.forEach(row => {
        csvContent += `${row.date},"${row.desc}",${row.type},${row.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Laporan_Josjis.csv");
    document.body.appendChild(link);
    link.click();
}

// ==========================================
// 4. KASIR & KLAIM REWARD
// ==========================================

// --- PERBAIKAN POPUP MODAL (Agar pas di tengah) ---
window.openClaimModal = function(amount) {
    const modal = document.getElementById('claimModal');
    if(!amount || amount <= 0) return alert("Belum ada reward yang bisa diklaim!");
    
    // Isi Form Otomatis
    document.getElementById('claimName').value = currentUserData.name || "";
    document.getElementById('claimShop').value = currentUserData.shopName || "";
    document.getElementById('claimAmount').value = "Rp " + amount.toLocaleString();
    document.getElementById('claimPayment').value = (currentUserData.paymentMethod || "-") + " : " + (currentUserData.paymentDetails || "-");
    
    document.getElementById('claimForm').setAttribute('data-amount', amount);
    
    // GUNAKAN FLEX AGAR DI TENGAH (Bukan Block)
    modal.style.display = 'flex'; 
}

window.closeClaimModal = function() {
    document.getElementById('claimModal').style.display = 'none';
}

window.closeClaimModal = function() {
    document.getElementById('claimModal').style.display = 'none';
}

document.getElementById('claimForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if(!user) return;

    const amount = Number(document.getElementById('claimForm').getAttribute('data-amount'));
    const stockToDeduct = (amount / 20000) * 50; 

    if(!confirm("Proses pencairan reward?")) return;

    try {
        // Simpan request ke Admin
        await addDoc(collection(db, "withdrawals"), {
            userId: user.uid,
            userName: document.getElementById('claimName').value,
            shopName: currentUserData.shopName,
            amount: amount,
            paymentInfo: document.getElementById('claimPayment').value,
            status: 'pending',
            requestDate: new Date().toISOString(),
            itemsCovered: stockToDeduct
        });

        // Update Stok User (Reset Reward)
        await updateDoc(doc(db, "users", user.uid), {
            stockClaimed: (currentUserData.stockClaimed || 0) + stockToDeduct
        });

        // Email Link
        const subject = `Klaim Reward Mitra - ${currentUserData.shopName}`;
        const body = `Halo Admin Josjis,\nSaya klaim reward Rp ${amount.toLocaleString()}.\nMohon validasi.`;
        window.open(`mailto:pusat@josjis.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);

        alert("Permintaan terkirim! Status: Pending.");
        closeClaimModal();
    } catch (error) { alert("Gagal: " + error.message); }
});

// --- LOGIKA KASIR ---
let kasirCart = [];
window.addToKasir = function(n, p) { 
    const ex = kasirCart.find(i=>i.name===n);
    if(ex) ex.qty++; else kasirCart.push({name:n, price:p, qty:1});
    renderKasirUI(); 
};
window.resetKasir = function() { kasirCart=[]; renderKasirUI(); };
function renderKasirUI() {
    const l = document.getElementById('kasirList');
    if(!l) return; l.innerHTML=""; let t=0;
    kasirCart.forEach(i => {
        t += i.price * i.qty;
        l.innerHTML += `<li>${i.name} x${i.qty} - ${(i.price*i.qty).toLocaleString()}</li>`;
    });
    document.getElementById('totalKasir').innerText = "Rp " + t.toLocaleString();
}
window.processTransaction = async function() {
    const u = auth.currentUser;
    if(!u || kasirCart.length===0) return alert("Kosong!");
    let t=0; let desc=[];
    kasirCart.forEach(i=>{ t+=i.price*i.qty; desc.push(`${i.name} (${i.qty})`)});
    await addDoc(collection(db,"users",u.uid,"transactions"),{
        date: new Date().toISOString().split('T')[0],
        desc: "Jual: "+desc.join(", "), amount: t, type:'income', createdAt: new Date().toISOString()
    });
    alert("Disimpan!"); resetKasir();
};

// --- SETTINGS ---
const expForm = document.getElementById('expenseForm');
if(expForm){
    expForm.addEventListener('submit', async(e)=>{
        e.preventDefault();
        const user=auth.currentUser;
        if(!user)return;
        try{
            await addDoc(collection(db,"users",user.uid,"transactions"),{
                date: document.getElementById('expDate').value,
                desc: document.getElementById('expDesc').value,
                amount: Number(document.getElementById('expAmount').value),
                type:'expense', createdAt: new Date().toISOString()
            });
            alert("Disimpan"); expForm.reset();
        }catch(x){alert(x.message);}
    });
}

window.saveProfileSettings = async function() {
    const user=auth.currentUser; if(!user)return;
    await setDoc(doc(db,"users",user.uid),{
        shopName: document.getElementById('editShopName').value,
        phone: document.getElementById('editShopPhone').value
    },{merge:true});
    alert("Profil Saved");
}
window.savePaymentSettings = async function() {
    const user=auth.currentUser; if(!user)return;
    await setDoc(doc(db,"users",user.uid),{
        paymentMethod: document.getElementById('payMethodName').value,
        paymentDetails: document.getElementById('payDetails').value
    },{merge:true});
    alert("Payment Saved");
}