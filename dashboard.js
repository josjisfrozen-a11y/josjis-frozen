// dashboard-firebase.js

document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 1. SETUP & INISIALISASI
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    const loginPage = document.getElementById('loginPage');
    const dashboardArea = document.getElementById('dashboardArea');
    const userNameDisplay = document.getElementById('userNameDisplay');

    // Cek Status Login
    if(localStorage.getItem('josjis_login')) {
        initDashboard();
    }

    if(loginForm){
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            
            // Simpan sesi login
            localStorage.setItem('josjis_login', 'true');
            localStorage.setItem('josjis_user', email);
            
            // Simulasi Modal Awal
            if(!localStorage.getItem('josjis_partnership_type')) {
                localStorage.setItem('josjis_partnership_type', 'Reseller Bisnis');
                addTransaction('expense', 420000, 'Modal Awal Kemitraan', '2024-01-01');
            }

            initDashboard();
        });
    }

    function initDashboard() {
        if(loginPage) loginPage.style.display = 'none';
        if(dashboardArea) dashboardArea.style.display = 'flex';
        
        if(userNameDisplay) userNameDisplay.innerText = localStorage.getItem('josjis_user') || "Mitra";
        
        updateFinanceReport();
        renderChart(); 
        
        const dateInput = document.getElementById('expDate');
        if(dateInput) dateInput.valueAsDate = new Date();
    }

    // ==========================================
    // 2. LOGIC NAVIGASI (SHOW PAGE)
    // ==========================================
    window.showPage = function(pageId) {
        // Sembunyikan semua section
        document.querySelectorAll('.page-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Tampilkan section target
        const targetPage = document.getElementById('page-' + pageId);
        if(targetPage) {
            targetPage.style.display = 'block';
        }

        // Update Sidebar Active
        document.querySelectorAll('.sidebar-menu li').forEach(li => {
            li.classList.remove('active');
        });
        
        // Tambahkan logic active state manual jika perlu (opsional)
        // event.currentTarget.classList.add('active'); 
    };

    window.logout = function() {
        localStorage.removeItem('josjis_login');
        window.location.reload();
    };

// ==========================================
    // 3. LOGIC EDUKASI (PERBAIKAN: Gunakan window.)
    // ==========================================
    const courseModal = document.getElementById('courseModal');
    const courseFrame = document.getElementById('courseFrame');
    const cTitle = document.getElementById('cTitle');
    const cDesc = document.getElementById('cDesc');
    const cPdf = document.getElementById('cPdf');

    // PENTING: Pakai 'window.openCourse' agar bisa dipanggil dari HTML onclick
    window.openCourse = function(element) {
        console.log("Kartu diklik!"); // Cek di Console browser (F12) jika muncul

        if(!courseModal) {
            console.error("Modal tidak ditemukan! Cek ID 'courseModal' di HTML");
            return; 
        }

        // Ambil data dari atribut HTML
        const title = element.getAttribute('data-title');
        const videoUrl = element.getAttribute('data-video');
        const desc = element.getAttribute('data-desc');
        const pdfFile = element.getAttribute('data-pdf');

        // Masukkan data ke elemen Modal
        if(cTitle) cTitle.textContent = title;
        if(cDesc) cDesc.textContent = desc;
        if(courseFrame) courseFrame.src = videoUrl; 
        if(cPdf) cPdf.href = "assets/docs/" + pdfFile; 

        // Tampilkan Modal (Ubah CSS display dari none ke flex)
        courseModal.style.display = "flex";
    };

    // Fungsi Tutup Modal
    window.closeCourse = function() {
        if(courseModal) {
            courseModal.style.display = "none";
            if(courseFrame) courseFrame.src = ""; // Matikan video
        }
    };

    // Tutup jika klik background hitam
    window.onclick = function(event) {
        if (event.target == courseModal) {
            window.closeCourse();
        }
        // Tambahkan ini agar modal claim juga bisa ditutup dengan cara yang sama
        const claimModal = document.getElementById('claimModal');
        if (event.target == claimModal) {
            claimModal.style.display = 'none';
        }
    };
    
    // ==========================================
    // 4. LOGIC KASIR (POS)
    // ==========================================
    let kasirCart = [];

    window.addToKasir = function(name, price) {
        kasirCart.push({ name: name, price: price });
        renderKasirUI();
    };

    window.resetKasir = function() {
        kasirCart = [];
        renderKasirUI();
    };

    window.removeKasirItem = function(index) {
        kasirCart.splice(index, 1);
        renderKasirUI();
    };

    function renderKasirUI() {
        const list = document.getElementById('kasirList');
        const totalEl = document.getElementById('totalKasir');
        const badge = document.getElementById('kasirCountBadge');
        
        if(!list) return;

        list.innerHTML = "";
        let total = 0;

        kasirCart.forEach((item, index) => {
            total += item.price;
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%; padding:5px 0; border-bottom:1px dashed #eee;">
                    <span>${item.name}</span>
                    <span>
                        ${item.price.toLocaleString()} 
                        <i class="fas fa-times" style="color:red; cursor:pointer; margin-left:8px;" onclick="removeKasirItem(${index})"></i>
                    </span>
                </div>`;
            list.appendChild(li);
        });

        if(totalEl) totalEl.innerText = "Rp " + total.toLocaleString('id-ID');
        if(badge) badge.innerText = kasirCart.length > 0 ? kasirCart.length : "";
    }

    window.processTransaction = function() {
        if(kasirCart.length === 0) {
            alert("Keranjang kosong!");
            return;
        }
        let total = 0;
        kasirCart.forEach(i => total += i.price);
        
        addTransaction('income', total, `Penjualan Kasir (${kasirCart.length} Item)`, new Date().toISOString().split('T')[0]);
        
        alert("Transaksi Berhasil Disimpan!");
        resetKasir();
    };

    // ==========================================
    // 5. LOGIC KEUANGAN (CORE)
    // ==========================================
    function addTransaction(type, amount, desc, date) {
        let transactions = JSON.parse(localStorage.getItem('josjis_transactions')) || [];
        const newTrx = {
            id: Date.now(),
            date: date,
            type: type,
            amount: parseInt(amount),
            desc: desc
        };
        transactions.push(newTrx);
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem('josjis_transactions', JSON.stringify(transactions));
        updateFinanceReport(); 
    }

    function updateFinanceReport() {
        const transactions = JSON.parse(localStorage.getItem('josjis_transactions')) || [];
        const tbody = document.getElementById('transactionTableBody');
        
        let totalIncome = 0;
        let totalExpense = 0;
        let htmlRows = "";

        transactions.forEach(trx => {
            if(trx.type === 'income') {
                totalIncome += trx.amount;
                htmlRows += `<tr><td>${trx.date}</td><td>${trx.desc}</td><td><span style="color:green; font-weight:bold;">Masuk</span></td><td style="text-align:right; color:green;">+ ${trx.amount.toLocaleString()}</td></tr>`;
            } else {
                totalExpense += trx.amount;
                htmlRows += `<tr><td>${trx.date}</td><td>${trx.desc}</td><td><span style="color:red; font-weight:bold;">Keluar</span></td><td style="text-align:right; color:red;">- ${trx.amount.toLocaleString()}</td></tr>`;
            }
        });

        if(tbody) tbody.innerHTML = htmlRows || '<tr><td colspan="4" style="text-align:center; padding:20px;">Belum ada data.</td></tr>';

        const profit = totalIncome - totalExpense;
        
        // Update UI Text
        setText('reportIncome', "Rp " + totalIncome.toLocaleString('id-ID'));
        setText('reportExpense', "Rp " + totalExpense.toLocaleString('id-ID'));
        setText('reportProfit', "Rp " + profit.toLocaleString('id-ID'));
        setText('homeDisplayProfit', "Rp " + profit.toLocaleString('id-ID'));
        setText('homeOmzet', "Rp " + totalIncome.toLocaleString('id-ID'));
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    }

    // Event Listener Form Pengeluaran
    const expenseForm = document.getElementById('expenseForm');
    if(expenseForm){
        expenseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const desc = document.getElementById('expDesc').value;
            const amount = document.getElementById('expAmount').value;
            const date = document.getElementById('expDate').value;
            
            addTransaction('expense', amount, desc, date);
            alert("Pengeluaran berhasil dicatat!");
            expenseForm.reset();
        });
    }

    // ==========================================
    // 6. CHART JS (GRAFIK)
    // ==========================================
    function renderChart() {
        const ctx = document.getElementById('profitChart');
        if(!ctx) return;

        if(window.myChart) window.myChart.destroy();

        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
                datasets: [{
                    label: 'Profit Bersih',
                    data: [500000, 1200000, 800000, 2500000], // Dummy data
                    borderColor: '#4f46e5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)'
                }]
            },
            options: { responsive: true }
        });
    }
    
    // ==========================================
    // 7. PLACEHOLDER UNTUK TOMBOL LAIN
    // ==========================================
    window.savePaymentSettings = function() { alert("Data pembayaran disimpan (Simulasi)"); };
    window.saveProfileSettings = function() { alert("Profil berhasil diupdate (Simulasi)"); };
    window.downloadReport = function() { alert("Mendownload Excel... (Simulasi)"); };
    window.closeClaimModal = function() { document.getElementById('claimModal').style.display = 'none'; };

});