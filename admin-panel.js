import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, updateDoc, doc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// GUNAKAN CONFIG YANG SAMA
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
const db = getFirestore(app);
const auth = getAuth(app);

// 1. LOAD SEMUA MITRA
const partnersTable = document.getElementById('partnersTable');

function loadPartners() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        partnersTable.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const uid = docSnap.id;
            const totalStock = user.totalStockPurchased || 0;
            const claimed = user.stockClaimed || 0;
            const available = totalStock - claimed;

            const row = `
                <tr>
                    <td>
                        <b>${user.shopName || user.name}</b><br>
                        <small>${user.email}</small>
                    </td>
                    <td>${totalStock} pcs</td>
                    <td>${claimed} pcs</td>
                    <td style="color: ${available >= 50 ? 'green' : 'grey'}; font-weight:bold;">${available} pcs</td>
                    <td>
                        <input type="number" id="stockInput_${uid}" placeholder="Qty">
                        <button class="btn btn-green" style="padding:5px 10px; font-size:0.8rem;" onclick="addStock('${uid}', ${totalStock})">+ Update</button>
                    </td>
                </tr>
            `;
            partnersTable.innerHTML += row;
        });
    });
}

// Global Function untuk Update Stok
window.addStock = async function(uid, currentTotal) {
    const input = document.getElementById(`stockInput_${uid}`);
    const qty = Number(input.value);
    
    if(qty <= 0) return alert("Masukkan jumlah stok yang valid");
    if(!confirm(`Konfirmasi pembelian stok ${qty} pcs untuk mitra ini?`)) return;

    try {
        await updateDoc(doc(db, "users", uid), {
            totalStockPurchased: currentTotal + qty
        });
        alert("Stok berhasil ditambahkan! Poin mitra otomatis bertambah.");
        input.value = "";
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// 2. LOAD PERMINTAAN KLAIM
const claimsList = document.getElementById('claimsList');

function loadClaims() {
    // Tampilkan klaim yang statusnya 'pending' dulu
    const q = query(collection(db, "withdrawals"), orderBy("requestDate", "desc"));
    
    onSnapshot(q, (snapshot) => {
        claimsList.innerHTML = "";
        if(snapshot.empty) {
            claimsList.innerHTML = "<p>Tidak ada permintaan klaim.</p>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const claim = docSnap.data();
            const claimId = docSnap.id;
            
            // Warna Status
            const statusClass = claim.status === 'pending' ? 'status-pending' : 'status-success';
            const actionButtons = claim.status === 'pending' ? `
                <div style="margin-top:10px; border-top:1px dashed #eee; padding-top:10px;">
                    <input type="text" id="proof_${claimId}" placeholder="Link Bukti Transfer / Ref No" style="width:100%; margin-bottom:5px; padding:5px;">
                    <button class="btn btn-blue" style="width:100%" onclick="approveClaim('${claimId}')">Validasi & Transfer</button>
                </div>
            ` : `<small style="color:green;">Disetujui & Ditransfer. <br>Bukti: ${claim.transferProof || '-'}</small>`;

            const item = `
                <div style="border:1px solid #eee; padding:15px; border-radius:8px; margin-bottom:10px; background: #fff;">
                    <div style="display:flex; justify-content:space-between;">
                        <b>${claim.shopName}</b>
                        <span class="${statusClass}">${claim.status.toUpperCase()}</span>
                    </div>
                    <h3 style="margin:5px 0; color:#1e3a8a;">Rp ${claim.amount.toLocaleString()}</h3>
                    <p style="font-size:0.8rem; color:#666; margin:0;">Rek: ${claim.paymentInfo}</p>
                    ${actionButtons}
                </div>
            `;
            claimsList.innerHTML += item;
        });
    });
}

// Global Function Approve Claim
window.approveClaim = async function(claimId) {
    const proof = document.getElementById(`proof_${claimId}`).value;
    if(!proof) return alert("Mohon masukkan nomor referensi transfer atau link bukti transfer.");

    if(!confirm("Validasi klaim ini? Status akan berubah menjadi 'success' dan email notifikasi akan dikirim.")) return;

    try {
        await updateDoc(doc(db, "withdrawals", claimId), {
            status: 'success',
            transferProof: proof,
            processedDate: new Date().toISOString()
        });

        // Simulasi Kirim Email Balasan ke Mitra
        window.open(`mailto:?subject=Bukti Transfer Reward Josjis&body=Halo, reward Anda telah kami transfer. Bukti/Ref: ${proof}`);
        
        alert("Klaim berhasil divalidasi!");
    } catch (e) {
        alert("Error: " + e.message);
    }
}

window.logoutAdmin = function() {
    signOut(auth).then(() => window.location.href = "dashboard.html"); // Balik ke login biasa
}

// Init
loadPartners();
loadClaims();