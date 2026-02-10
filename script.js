/**
 * JOSJIS FROZEN - MAIN JAVASCRIPT (FINAL FIX)
 * Perbaikan:
 * 1. Tombol WA di Hero Product sudah berfungsi (Link dinamis).
 * 2. Tombol di Modal Produk sekarang "Masuk Keranjang", bukan WA.
 */

document.addEventListener('DOMContentLoaded', function() {

    // =========================================
    // 1. GLOBAL VARIABLES & SETUP
    // =========================================
    let cart = []; 
    
    // UI Elements Keranjang
    const cartItemsContainer = document.getElementById("cartItemsContainer");
    const cartTotalElement = document.getElementById("cartTotal");
    const cartCountElement = document.getElementById("cartCount");


    // =========================================
    // 2. FITUR NAVIGASI (HAMBURGER MENU)
    // =========================================
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if(hamburger && navLinks){
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars'); icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times'); icon.classList.add('fa-bars');
            }
        });

        document.querySelectorAll('.nav-links a').forEach(item => {
            item.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    const icon = hamburger.querySelector('i');
                    icon.classList.remove('fa-times'); icon.classList.add('fa-bars');
                }
            });
        });
    }

    // Smooth Scroll (Hanya untuk link menu, bukan tombol fungsi)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Cek agar tidak mengganggu fungsi lain
            if(href !== "#" && !this.classList.contains('trigger-modal') && !this.classList.contains('btn-pesan-wa')){
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if(targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });


    // =========================================
    // 3. SISTEM KERANJANG (CART LOGIC)
    // =========================================

    function updateCartUI() {
        if(!cartItemsContainer) return;

        cartItemsContainer.innerHTML = "";
        let total = 0;
        let totalQty = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p class='empty-msg'>Keranjang masih kosong.</p>";
        } else {
            cart.forEach((item, index) => {
                total += item.price * item.qty;
                totalQty += item.qty;

                cartItemsContainer.innerHTML += `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <span class="cart-item-price">@ Rp ${item.price.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="cart-controls">
                            <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                            <span>${item.qty}</span>
                            <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                            <i class="fas fa-trash remove-btn" onclick="removeItem(${index})"></i>
                        </div>
                    </div>
                `;
            });
        }

        if(cartTotalElement) cartTotalElement.innerText = "Rp " + total.toLocaleString('id-ID');
        if(cartCountElement) cartCountElement.innerText = totalQty;
        
        // Update summary checkout jika sedang terbuka
        const checkoutModal = document.getElementById("checkoutModal");
        if(checkoutModal && checkoutModal.classList.contains("show")){
            updateCheckoutSummary();
        }
    }

    function addToCart(name, priceString) {
        const price = parseInt(priceString.replace(/[^0-9]/g, '')); 
        const existingItem = cart.find(item => item.name === name);

        if (existingItem) {
            existingItem.qty++;
        } else {
            cart.push({ name: name, price: price, qty: 1 });
        }
        
        updateCartUI();
        alert(`${name} berhasil masuk keranjang!`);
    }

    // GLOBAL EXPORT (Agar bisa dipanggil onclick HTML)
    window.addToCartGlobal = addToCart; // Opsional jika butuh akses global
    window.updateQty = function(index, change) {
        if (cart[index].qty + change > 0) cart[index].qty += change;
        updateCartUI();
    };

    window.removeItem = function(index) {
        cart.splice(index, 1);
        updateCartUI();
    };

    // Tombol "Keranjang" di Grid Produk
    document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            const card = this.closest(".product-card") || this.closest(".card-image-wrapper").parentElement;
            if(card) {
                const name = card.getAttribute("data-name");
                const price = card.getAttribute("data-price");
                addToCart(name, price);
            }
        });
    });

    // Buka Modal Keranjang
    const openCartBtn = document.getElementById("openCartBtn");
    if(openCartBtn) {
        openCartBtn.addEventListener("click", () => {
            document.getElementById("cartModal").classList.add("show");
            document.body.style.overflow = "hidden";
        });
    }


    // =========================================
    // 4. FITUR DISPLAY PRODUK (HERO SECTION - FIX WA)
    // =========================================
    let displayQty = 1;
    const displayQtyEl = document.getElementById("displayQty");
    const btnPesanWA = document.getElementById("btnPesanWA");

    // Fungsi Global agar bisa dipanggil onclick="updateDisplayQty(...)"
    window.updateDisplayQty = function(change) {
        if (displayQty + change > 0) {
            displayQty += change;
            if(displayQtyEl) displayQtyEl.innerText = displayQty;
            
            // FIX: Update Link WA secara Realtime
            if(btnPesanWA) {
                const productName = "Lele Marinasi Frozen";
                // Gunakan encodeURIComponent agar spasi dan karakter lain aman
                const message = `Halo Josjis, saya mau pesan ${displayQty} pack ${productName}. Mohon info total harganya.`;
                const finalLink = `https://wa.me/6285196107766?text=${encodeURIComponent(message)}`;
                btnPesanWA.setAttribute("href", finalLink);
            }
        }
    }
    
    // Jalankan sekali saat load agar link awal benar
    if(btnPesanWA) window.updateDisplayQty(0);


    // =========================================
    // 5. FITUR MODAL DETAIL PRODUK (FIX ADD TO CART)
    // =========================================
    
    // Trigger Tombol Preview & Link Detail
    document.querySelectorAll(".btn-preview, .trigger-modal, .trigger-modal-manual").forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            
            // Deteksi sumber data (Card atau Atribut Link Sendiri)
            let data = {};
            const card = this.closest(".product-card") || this.closest(".featured-card");

            if(card) {
                // Ambil dari Card
                data = {
                    image: card.querySelector("img") ? card.querySelector("img").src : card.getAttribute("data-image"),
                    name: card.getAttribute("data-name"),
                    price: card.getAttribute("data-price"),
                    desc: card.getAttribute("data-desc"),
                    comp: card.getAttribute("data-comp"),
                    nutrition: card.getAttribute("data-nutrition"),
                    halal: card.getAttribute("data-halal")
                };
            } else {
                // Ambil dari atribut diri sendiri (Link Manual)
                data = {
                    image: this.getAttribute("data-image"),
                    name: this.getAttribute("data-name"),
                    price: this.getAttribute("data-price"),
                    desc: this.getAttribute("data-desc"),
                    comp: this.getAttribute("data-comp"),
                    nutrition: this.getAttribute("data-nutrition"),
                    halal: this.getAttribute("data-halal")
                };
            }
            
            populateModal(data);
        });
    });

    function populateModal(data) {
        const productModal = document.getElementById("productModal");
        if(!productModal) return;

        // Isi Data
        if(document.getElementById("m-image")) document.getElementById("m-image").src = data.image;
        if(document.getElementById("m-name")) document.getElementById("m-name").textContent = data.name;
        if(document.getElementById("m-price")) document.getElementById("m-price").textContent = data.price;
        if(document.getElementById("m-desc")) document.getElementById("m-desc").textContent = data.desc;
        if(document.getElementById("m-comp")) document.getElementById("m-comp").textContent = data.comp;
        if(document.getElementById("m-nutrition")) document.getElementById("m-nutrition").textContent = data.nutrition;
        if(document.getElementById("m-halal")) document.getElementById("m-halal").textContent = data.halal;

        // --- FIX: TOMBOL MODAL JADI ADD TO CART ---
        const modalBtn = document.getElementById("m-link");
        if(modalBtn) {
            // Clone tombol untuk membersihkan event listener lama (penting!)
            const newBtn = modalBtn.cloneNode(true);
            modalBtn.parentNode.replaceChild(newBtn, modalBtn);
            
            // Ubah Tampilan Tombol
            newBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Masukkan Keranjang';
            newBtn.removeAttribute("href"); // Hapus link WA
            newBtn.style.cursor = "pointer";
            
            // Tambahkan Event Listener Add to Cart
            newBtn.addEventListener("click", function(e) {
                e.preventDefault();
                addToCart(data.name, data.price); // Panggil fungsi keranjang
                
                // Tutup Modal setelah masuk keranjang
                productModal.classList.remove("show");
                document.body.style.overflow = "auto";
            });
        }

        productModal.classList.add("show");
        document.body.style.overflow = "hidden";
    }


    // =========================================
    // 6. FITUR CHECKOUT (PEMBELIAN)
    // =========================================
    const checkoutForm = document.getElementById("checkoutForm");
    const toCheckoutBtn = document.getElementById("toCheckoutBtn");

    function updateCheckoutSummary() {
        let cartTotal = 0;
        cart.forEach(item => cartTotal += item.price * item.qty);
        
        const summarySubtotal = document.getElementById("summarySubtotal");
        const summaryTotal = document.getElementById("summaryTotal");

        if(summarySubtotal) summarySubtotal.innerText = "Rp " + cartTotal.toLocaleString('id-ID');
        if(summaryTotal) summaryTotal.innerText = "Rp " + cartTotal.toLocaleString('id-ID'); 
    }

    if(toCheckoutBtn){
        toCheckoutBtn.addEventListener("click", () => {
            if (cart.length === 0) {
                alert("Keranjang kosong!"); return;
            }
            document.getElementById("cartModal").classList.remove("show");
            document.getElementById("checkoutModal").classList.add("show");
            updateCheckoutSummary(); 
        });
    }

    if(checkoutForm){
        checkoutForm.addEventListener("submit", function(e) {
            e.preventDefault(); 
            // Ambil Data
            const name = document.getElementById("custName").value;
            const phone = document.getElementById("custPhone").value;
            const payment = document.getElementById("custPayment").value;
            const mapsLink = document.getElementById("custMaps") ? document.getElementById("custMaps").value : "-";
            const street = document.getElementById("addrStreet").value;
            
            // Susun Belanjaan
            let listItems = "";
            let grandTotal = 0;
            cart.forEach(item => {
                const subtotal = item.price * item.qty;
                grandTotal += subtotal;
                listItems += `- ${item.name} (${item.qty}x) : Rp ${subtotal.toLocaleString('id-ID')}%0a`;
            });

            // Kirim WA
            const waMessage = 
`Halo Josjis, saya mau pesan:%0a%0a*DAFTAR BELANJA:*%0a${listItems}%0a*Total: Rp ${grandTotal.toLocaleString('id-ID')}*%0a--------------------------------%0a*DATA PENGIRIMAN:*%0aNama: ${name}%0aHP: ${phone}%0aAlamat: ${street}%0aMaps: ${mapsLink}%0aPembayaran: ${payment}%0a--------------------------------%0aTerima kasih!`;

            const adminNumber = "6285196107766"; 
            window.open(`https://wa.me/${adminNumber}?text=${waMessage}`, "_blank");

            // Reset
            cart = [];
            updateCartUI();
            document.getElementById("checkoutModal").classList.remove("show");
            document.body.style.overflow = "auto";
            checkoutForm.reset();
        });
    }


    // =========================================
    // 7. FITUR RESELLER WIZARD (PDF GENERATOR)
    // =========================================
    const modalPartner = document.getElementById("partnershipModal");
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const step3 = document.getElementById("step3");
    const partnerForm = document.getElementById("partnerForm");
    const btnFinalSubmit = document.getElementById("btnFinalSubmit");
    const checkPakta = document.getElementById("agreePakta");

    // Inputs Reseller
    const inputNama = document.getElementById("p_nama");
    const inputNik = document.getElementById("p_nik");
    const inputPaket = document.getElementById("p_paket_pilihan");
    const inputSignature = document.getElementById("digital_signature");
    const inputWa = document.getElementById("p_wa");
    const inputAlamat = document.getElementById("p_alamat");

    // 1. Open Modal
    document.querySelectorAll(".btn-join-reseller").forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            const paket = this.getAttribute("data-paket");
            if(inputPaket) inputPaket.value = paket;
            
            // Reset Step
            if(step1) step1.classList.add("active");
            if(step2) step2.classList.remove("active");
            if(step3) step3.classList.remove("active");
            if(checkPakta) checkPakta.checked = false;
            
            const btnToStep2 = document.getElementById("btnToStep2");
            if(btnToStep2) { btnToStep2.disabled = true; btnToStep2.style.opacity = "0.5"; }

            if(modalPartner) {
                modalPartner.classList.add("show");
                document.body.style.overflow = "hidden";
            }
        });
    });

    // 2. Step 1 Logic
    if(checkPakta){
        checkPakta.addEventListener("change", function() {
            const btnToStep2 = document.getElementById("btnToStep2");
            if(this.checked) {
                btnToStep2.disabled = false; btnToStep2.style.opacity = "1";
            } else {
                btnToStep2.disabled = true; btnToStep2.style.opacity = "0.5";
            }
        });
        document.getElementById("btnToStep2").addEventListener("click", () => {
            step1.classList.remove("active"); step2.classList.add("active");
        });
    }

    // 3. Step 2 Logic
    if(document.getElementById("btnBackToStep1")){
        document.getElementById("btnBackToStep1").addEventListener("click", () => {
            step2.classList.remove("active"); step1.classList.add("active");
        });
    }

    if(partnerForm){
        partnerForm.addEventListener("submit", function(e) {
            e.preventDefault();
            // Pindah Data ke Step 3 Preview
            const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById("mou_date").innerText = today;
            document.getElementById("mou_nama_mitra").innerText = inputNama.value.toUpperCase();
            document.getElementById("mou_nik_mitra").innerText = inputNik.value;
            document.getElementById("mou_no").innerText = `JS/${Date.now().toString().slice(-4)}/${new Date().getFullYear()}`;
            step2.classList.remove("active"); step3.classList.add("active");
        });
    }

    // 4. Step 3 Logic & PDF
    if(document.getElementById("btnBackToStep2")){
        document.getElementById("btnBackToStep2").addEventListener("click", () => {
            step3.classList.remove("active"); step2.classList.add("active");
        });
    }

    if(btnFinalSubmit){
        btnFinalSubmit.addEventListener("click", async function() {
            if(inputSignature.value.trim().toUpperCase() !== inputNama.value.trim().toUpperCase()){
                alert("Tanda tangan (Ketik Nama) harus sama persis dengan Nama Lengkap!"); return;
            }
            if(!confirm("Apakah data sudah benar?")) return;

            btnFinalSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
            btnFinalSubmit.disabled = true;

            // Generate PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const nama = inputNama.value;
            const paket = inputPaket.value;
            
            // Halaman 1
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text("FORMULIR KEMITRAAN JOSJIS FROZEN", 105, 20, null, null, "center");
            doc.setFontSize(12); doc.setFont("helvetica", "normal");
            doc.text(`Paket: ${paket}`, 20, 35);
            doc.line(20, 40, 190, 40);
            doc.text(`Nama: ${nama}`, 20, 50);
            doc.text(`NIK: ${inputNik.value}`, 20, 60);
            doc.text(`WA: ${inputWa.value}`, 20, 70);
            doc.text(`Alamat: ${inputAlamat.value}`, 20, 80);
            
            // Halaman 2 MoU
            doc.addPage();
            doc.setFontSize(14); doc.setFont("helvetica", "bold");
            doc.text("MoU KEMITRAAN", 105, 20, null, null, "center");
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.text(`Disepakati kerjasama antara Josjis Frozen dan ${nama}.`, 20, 40);
            doc.text("Pihak Pertama: JOSJIS FROZEN", 20, 80);
            doc.text(`Pihak Kedua: ${nama.toUpperCase()}`, 120, 80);

            // Save PDF
            doc.save(`Kemitraan_Josjis_${nama.replace(/\s/g, '_')}.pdf`);

            // Send WA
            setTimeout(() => {
                const adminWA = "6285196107766"; 
                const msg = `Halo Admin, saya daftar ${paket}. Nama: ${nama}. PDF sudah saya download.`;
                window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(msg)}`, '_blank');
                
                modalPartner.classList.remove("show");
                document.body.style.overflow = "auto";
                partnerForm.reset();
                btnFinalSubmit.innerHTML = '<i class="fas fa-file-signature"></i> SAHKAN & KIRIM';
                btnFinalSubmit.disabled = false;
            }, 1500);
        });
    }


    // =========================================
    // 8. GLOBAL CLOSE BUTTON (FIX SEMUA MODAL)
    // =========================================
    const allCloseButtons = document.querySelectorAll(".close-modal, .close-checkout, .close-reseller, .close-cart, .close-partner");
    
    allCloseButtons.forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            const modalParent = this.closest('.modal');
            if(modalParent) {
                modalParent.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    });

    window.addEventListener("click", function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });

    window.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
            document.body.style.overflow = 'auto';
        }
    });

});