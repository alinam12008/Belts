// Shared Shopping Cart & Quotation System for BELTS STORE Redesign
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Cart state from LocalStorage
    let cart = JSON.parse(localStorage.getItem('belts_store_cart')) || [];
    
    // 2. Helper function to get translated text
    const t = (key, fallback = '') => {
        if (!window.i18n || !window.i18n.t) {
            return fallback;
        }
        return window.i18n.t(key) || fallback;
    };

    // 3. Helper function to check RTL status
    const isRTL = () => {
        return document.dir === 'rtl' || document.documentElement.lang === 'ar' || 
               (window.i18n && window.i18n.currentLang && window.i18n.currentLang() === 'ar');
    };

    // 4. DOM Elements Creation
    createCartElements();
    updateCartUI();

    // 5. Setup global listeners
    setupCartListeners();

    function createCartElements() {
        const rtl = isRTL();
        
        // Create Floating Cart Badge Button
        if (!document.getElementById('floating-cart-btn')) {
            const btn = document.createElement('button');
            btn.id = 'floating-cart-btn';
            const positionClass = rtl ? 'left-6' : 'right-6';
            btn.className = `fixed bottom-6 ${positionClass} z-[9998] bg-primary text-on-primary border-2 border-secondary-container shadow-2xl w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group`;
            btn.setAttribute('aria-label', 'Shopping Cart');
            btn.innerHTML = `
                <span class="material-symbols-outlined text-3xl">shopping_cart</span>
                <span id="cart-badge-count" class="absolute -top-1 ${rtl ? '-left-1' : '-right-1'} bg-error text-on-error text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center opacity-0 scale-50 transition-all duration-300">0</span>
            `;
            document.body.appendChild(btn);
        }

        // Create Side Cart Drawer
        if (!document.getElementById('cart-drawer')) {
            const drawer = document.createElement('div');
            drawer.id = 'cart-drawer';
            const drawerSide = rtl ? 'left-0' : 'right-0';
            const borderClass = rtl ? 'border-r' : 'border-l';
            const translateClass = rtl ? '-translate-x-full' : 'translate-x-full';
            drawer.className = `fixed top-0 ${drawerSide} h-full w-full sm:w-[450px] bg-surface-container-lowest dark:bg-surface-container ${borderClass} border-outline-variant shadow-2xl z-[9999] transform ${translateClass} transition-transform duration-300 flex flex-col`;
            
            const cartTitle = t('cart_title', 'Your Inquiry Cart');
            const cartEmpty = t('cart_empty', 'Your inquiry cart is empty');
            const cartEmptySuggest = t('cart_empty_suggestion', 'Browse products and add them to get started.');
            const totalItems = t('cart_total_items', 'Total Items:');
            const whatsappBtn = t('cart_whatsapp_btn', 'WhatsApp Inquiry');
            const quoteBtn = t('cart_quote_btn', 'Request Quote');
            
            drawer.innerHTML = `
                <!-- Header -->
                <div class="h-20 border-b border-outline-variant px-6 flex ${rtl ? 'flex-row-reverse' : ''} justify-between items-center bg-surface-container-low">
                    <div class="flex ${rtl ? 'flex-row-reverse' : ''} items-center gap-3">
                        <span class="material-symbols-outlined text-primary text-2xl">shopping_cart</span>
                        <h3 class="font-headline-lg text-lg uppercase text-primary font-bold">${cartTitle}</h3>
                    </div>
                    <button id="close-cart-btn" class="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-2">
                        <span class="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                <!-- Items Container -->
                <div id="cart-items-list" class="flex-1 overflow-y-auto p-6 space-y-4">
                    <!-- Dynamic Items Go Here -->
                </div>

                <!-- Footer Summary & Actions -->
                <div class="border-t border-outline-variant p-6 bg-surface-container-low space-y-4">
                    <div class="flex ${rtl ? 'flex-row-reverse' : ''} justify-between items-center text-sm font-technical-label">
                        <span class="text-on-surface-variant uppercase">${totalItems}</span>
                        <span id="cart-total-qty" class="font-bold text-primary">0 Items</span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <button id="cart-whatsapp-btn" class="bg-[#25D366] text-white font-bold py-3 uppercase text-xs flex items-center ${rtl ? 'flex-row-reverse' : ''} justify-center gap-2 hover:bg-[#1ebd58] transition-all">
                            <span class="material-symbols-outlined text-base">chat</span> <span>${whatsappBtn}</span>
                        </button>
                        <button id="cart-quote-btn" class="bg-primary text-on-primary font-bold py-3 uppercase text-xs flex items-center ${rtl ? 'flex-row-reverse' : ''} justify-center gap-2 hover:bg-primary-container transition-all">
                            <span class="material-symbols-outlined text-base">assignment</span> <span>${quoteBtn}</span>
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(drawer);
        }

        // Create Request Quote Form Modal
        if (!document.getElementById('quote-modal')) {
            const modal = document.createElement('div');
            modal.id = 'quote-modal';
            modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] hidden items-center justify-center p-4 transition-opacity duration-300 opacity-0';
            
            const quoteTitle = t('quote_form_title', 'Request Technical Quotation');
            const quoteSubtitle = t('quote_form_subtitle', 'Enter your details below. We will send you a formal quote for the items in your inquiry cart.');
            const fullName = t('form_full_name_required', 'Full Name *');
            const company = t('form_company_required', 'Company Name *');
            const email = t('form_email_required', 'Email Address *');
            const phone = t('form_phone_required', 'Phone Number *');
            const phonePlaceholder = t('form_phone_placeholder_text', '+966...');
            const additionalNotes = t('form_additional_notes', 'Additional Requirements / Notes');
            const notesPlaceholder = t('form_additional_notes_placeholder', 'Spec details, custom sizes, urgency...');
            const submitBtn = t('quote_submit_btn', 'Submit Quote Request');
            
            modal.innerHTML = `
                <div class="bg-surface-container-lowest dark:bg-surface-container max-w-lg w-full border border-outline-variant p-8 shadow-2xl relative rounded transform scale-95 transition-transform duration-300 flex flex-col max-h-[90vh]" ${rtl ? 'dir="rtl"' : ''}>
                    <button id="close-quote-modal-btn" class="absolute top-4 ${rtl ? 'left-4' : 'right-4'} text-on-surface-variant hover:text-primary transition-colors p-2">
                        <span class="material-symbols-outlined text-2xl">close</span>
                    </button>
                    
                    <h4 class="font-headline-lg text-xl uppercase text-primary font-bold mb-2">${quoteTitle}</h4>
                    <p class="text-xs text-on-surface-variant mb-6">${quoteSubtitle}</p>
                    
                    <form id="quote-request-form" class="space-y-4 overflow-y-auto flex-1 ${rtl ? 'pl-1' : 'pr-1'}">
                        <div>
                            <label class="block text-xs uppercase font-technical-label text-on-surface-variant mb-1">${fullName}</label>
                            <input type="text" name="name" required class="w-full p-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-container-low text-sm"/>
                        </div>
                        <div>
                            <label class="block text-xs uppercase font-technical-label text-on-surface-variant mb-1">${company}</label>
                            <input type="text" name="company" required class="w-full p-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-container-low text-sm"/>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs uppercase font-technical-label text-on-surface-variant mb-1">${email}</label>
                                <input type="email" name="email" required class="w-full p-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-container-low text-sm"/>
                            </div>
                            <div>
                                <label class="block text-xs uppercase font-technical-label text-on-surface-variant mb-1">${phone}</label>
                                <input type="tel" name="phone" required class="w-full p-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-container-low text-sm" placeholder="${phonePlaceholder}"/>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs uppercase font-technical-label text-on-surface-variant mb-1">${additionalNotes}</label>
                            <textarea name="message" rows="3" class="w-full p-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-container-low text-sm resize-none" placeholder="${notesPlaceholder}"></textarea>
                        </div>
                        
                        <div class="pt-4">
                            <button type="submit" class="w-full bg-primary text-on-primary font-bold py-3 uppercase text-xs hover:bg-primary-container transition-all flex items-center ${rtl ? 'flex-row-reverse' : ''} justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">send</span> ${submitBtn}
                            </button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Create Global Toast Container
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            const positionClass = rtl ? 'left-6' : 'right-6';
            container.className = `fixed bottom-6 ${positionClass} z-[10001] flex flex-col gap-3 max-w-sm w-full px-4 md:px-0 pointer-events-none`;
            document.body.appendChild(container);
        }
    }

    function setupCartListeners() {
        const cartBtn = document.getElementById('floating-cart-btn');
        const drawer = document.getElementById('cart-drawer');
        const closeBtn = document.getElementById('close-cart-btn');
        const whatsappBtn = document.getElementById('cart-whatsapp-btn');
        const quoteBtn = document.getElementById('cart-quote-btn');
        const quoteModal = document.getElementById('quote-modal');
        const closeQuoteBtn = document.getElementById('close-quote-modal-btn');
        const quoteForm = document.getElementById('quote-request-form');
        const rtl = isRTL();
        const translateClass = rtl ? '-translate-x-full' : 'translate-x-full';
        const translateRemoveClass = rtl ? '-translate-x-full' : 'translate-x-full';

        // Toggle Cart Drawer
        cartBtn.addEventListener('click', () => {
            drawer.classList.remove(translateRemoveClass);
        });

        closeBtn.addEventListener('click', () => {
            drawer.classList.add(translateRemoveClass);
        });

        // Close drawer clicking outside (semi-overlay)
        document.addEventListener('click', (e) => {
            const isCartTrigger = cartBtn.contains(e.target) || e.target.closest('button[onclick*="floating-cart-btn"]');
            if (!drawer.contains(e.target) && !isCartTrigger && !drawer.classList.contains(translateRemoveClass) && !quoteModal.contains(e.target)) {
                drawer.classList.add(translateRemoveClass);
            }
        });

        // WhatsApp Inquiry Click
        whatsappBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                const emptyMsg = t('toast_cart_empty_error', 'Your inquiry cart is empty!');
                showToast(emptyMsg, "error");
                return;
            }
            sendWhatsAppInquiry();
        });

        // Request Quote Click
        quoteBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                const emptyMsg = t('toast_cart_empty_error', 'Your inquiry cart is empty!');
                showToast(emptyMsg, "error");
                return;
            }
            openQuoteModal();
        });

        closeQuoteBtn.addEventListener('click', closeQuoteModal);

        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitQuoteRequest(new FormData(quoteForm));
        });

        // Global Add to Cart interceptor (for dynamic content or static cards)
        document.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-to-cart-btn');
            if (addBtn) {
                const id = addBtn.getAttribute('data-product-id');
                const name = addBtn.getAttribute('data-product-name');
                const image = addBtn.getAttribute('data-product-image') || '';
                const ref = addBtn.getAttribute('data-product-ref') || id;
                const qtyInput = document.getElementById('product-quantity');
                const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                
                addToCart(id, name, image, ref, qty);
            }
        });
    }

    function addToCart(id, name, image, ref, quantity = 1) {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: id,
                name: name,
                image: image,
                ref: ref,
                quantity: quantity
            });
        }
        saveCart();
        updateCartUI();
        
        const addedMsg = t('cart_item_added_toast', 'Added to inquiry cart!');
        showToast(`Added x${quantity} ${name} - ${addedMsg}`, "success");
        
        // Auto open cart drawer
        const drawer = document.getElementById('cart-drawer');
        const rtl = isRTL();
        const translateRemoveClass = rtl ? '-translate-x-full' : 'translate-x-full';
        drawer.classList.remove(translateRemoveClass);
    }

    window.addToCartManual = function(id, name, image, ref, quantity) {
        addToCart(id, name, image, ref, quantity);
    };

    function updateCartUI() {
        const listContainer = document.getElementById('cart-items-list');
        const badge = document.getElementById('cart-badge-count');
        const totalQtyText = document.getElementById('cart-total-qty');
        const rtl = isRTL();
        const refLabel = t('cart_item_ref', 'Ref:');
        const itemsLabel = t('cart_items_label', 'Items');
        
        // Count total unique items and total quantities
        const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
        
        // Badge animation & count
        if (totalQty > 0) {
            badge.innerText = totalQty;
            badge.classList.remove('opacity-0', 'scale-50');
            badge.classList.add('opacity-100', 'scale-100');
        } else {
            badge.classList.add('opacity-0', 'scale-50');
            badge.classList.remove('opacity-100', 'scale-100');
        }

        totalQtyText.innerText = `${totalQty} ${itemsLabel}`;

        // Render list items
        if (cart.length === 0) {
            const emptyMsg = t('cart_empty', 'Your inquiry cart is empty');
            const suggestMsg = t('cart_empty_suggestion', 'Browse products and add them to get started.');
            listContainer.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-center text-on-surface-variant opacity-60 py-12">
                    <span class="material-symbols-outlined text-5xl mb-3">production_quantity_limits</span>
                    <p class="text-sm font-technical-label uppercase">${emptyMsg}</p>
                    <p class="text-xs mt-1">${suggestMsg}</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = cart.map(item => `
            <div class="flex ${rtl ? 'flex-row-reverse' : ''} items-center gap-4 bg-surface-container-low border border-outline-variant p-4 rounded relative group transition-all hover:border-primary">
                <!-- Delete Button -->
                <button class="absolute ${rtl ? 'left-2' : 'top-2'} ${rtl ? 'top-2' : 'right-2'} text-on-surface-variant hover:text-error transition-colors remove-item-btn p-1" data-id="${item.id}">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>

                <!-- Thumbnail -->
                <div class="w-16 h-16 bg-surface-container-lowest border border-outline-variant p-2 flex items-center justify-center rounded flex-shrink-0">
                    <img class="max-w-full max-h-full object-contain" src="${item.image || 'https://belts-store.com/wp-content/uploads/2025/09/BELTS-STORE_en-1.svg'}" alt="${item.name}"/>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0 ${rtl ? 'pl-6' : 'pr-6'}">
                    <h5 class="font-bold text-xs uppercase text-primary truncate">${item.name}</h5>
                    <p class="text-[10px] text-on-surface-variant font-technical-label truncate mt-0.5">${refLabel} ${item.ref}</p>
                    
                    <!-- Qty Controls -->
                    <div class="flex items-center gap-2 mt-2 ${rtl ? 'flex-row-reverse' : ''}">
                        <button class="w-6 h-6 border border-outline-variant rounded flex items-center justify-center text-xs font-bold hover:bg-surface-container-high active:bg-surface-container-highest transition-colors qty-minus flex-shrink-0" data-id="${item.id}">-</button>
                        <span class="font-technical-label text-xs w-6 text-center font-bold text-on-surface">${item.quantity}</span>
                        <button class="w-6 h-6 border border-outline-variant rounded flex items-center justify-center text-xs font-bold hover:bg-surface-container-high active:bg-surface-container-highest transition-colors qty-plus flex-shrink-0" data-id="${item.id}">+</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Wire up individual item listeners
        listContainer.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                removeItem(id);
            });
        });

        listContainer.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                changeQuantity(id, -1);
            });
        });

        listContainer.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                changeQuantity(id, 1);
            });
        });
    }

    function removeItem(id) {
        cart = cart.filter(item => item.id !== id);
        saveCart();
        updateCartUI();
        const removedMsg = t('cart_item_removed_toast', 'Item removed from inquiry cart.');
        showToast(removedMsg, "info");
    }

    function changeQuantity(id, change) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeItem(id);
            } else {
                saveCart();
                updateCartUI();
            }
        }
    }

    function saveCart() {
        localStorage.setItem('belts_store_cart', JSON.stringify(cart));
    }

    function showToast(message, type = "success") {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const rtl = isRTL();
        toast.className = `bg-primary text-on-primary border border-secondary-container p-4 shadow-2xl rounded flex items-center justify-between pointer-events-auto transition-all duration-300 transform translate-y-10 opacity-0 ${rtl ? 'flex-row-reverse' : ''}`;
        
        let icon = "check_circle";
        if (type === "error") icon = "cancel";
        if (type === "info") icon = "info";

        toast.innerHTML = `
            <div class="flex ${rtl ? 'flex-row-reverse' : ''} items-center gap-3">
                <span class="material-symbols-outlined text-secondary-container flex-shrink-0" style="font-variation-settings: 'FILL' 1;">${icon}</span>
                <p class="text-xs font-bold uppercase tracking-wide leading-tight">${message}</p>
            </div>
            <button class="text-on-primary/60 hover:text-on-primary ${rtl ? 'mr-4' : 'ml-4'} transition-colors p-1 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;

        container.appendChild(toast);

        // Animate entrance
        setTimeout(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        }, 10);

        // Close click
        toast.querySelector('button').addEventListener('click', () => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        });

        // Auto hide after 3.5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('translate-y-10', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }
        }, 3500);
    }

    // WhatsApp Inquiry Prefilled Message Generation
    function sendWhatsAppInquiry() {
        const phone = "+966538339982"; // Sales whatsapp from belts-store.com
        const isAr = window.i18n && window.i18n.currentLang && window.i18n.currentLang() === 'ar';
        
        let text = "";
        if (isAr) {
            text = "مرحباً مبيعات معرض السيور، أود الاستفسار عن المكونات التالية:\n\n";
            cart.forEach((item, idx) => {
                text += `${idx + 1}. ${item.name} (المرجع: ${item.ref}) - الكمية: ${item.quantity}\n`;
            });
            text += "\nيرجى تقديم عرض سعر وتوضيح مدى التوفر. شكراً لك!";
        } else {
            text = "Hi Belts Store Sales, I would like to inquire about the following components:\n\n";
            cart.forEach((item, idx) => {
                text += `${idx + 1}. ${item.name} (Ref: ${item.ref}) - Qty: ${item.quantity}\n`;
            });
            text += "\nPlease provide a price and availability quote. Thank you!";
        }
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    // Dynamic WhatsApp Inquiry for single product
    window.sendWhatsAppSingleInquiry = function(name, ref, qty) {
        const phone = "+966538339982";
        const isAr = window.i18n && window.i18n.currentLang && window.i18n.currentLang() === 'ar';
        
        let text = "";
        if (isAr) {
            text = `مرحباً مبيعات معرض السيور، أود الاستفسار عن هذا المكون:\n\nالمنتج: ${name}\nالمرجع: ${ref}\nالكمية: ${qty}\n\nيرجى تقديم عرض سعر وتوضيح مدى التوفر. شكراً لك!`;
        } else {
            text = `Hi Belts Store Sales, I would like to inquire about this component:\n\nProduct: ${name}\nRef: ${ref}\nQuantity: ${qty}\n\nPlease provide a price and availability quote. Thank you!`;
        }
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    function openQuoteModal() {
        const modal = document.getElementById('quote-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        }, 10);
    }

    function closeQuoteModal() {
        const modal = document.getElementById('quote-modal');
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }, 300);
    }

    function submitQuoteRequest(formData) {
        // Collect form and cart data
        const clientDetails = {
            name: formData.get('name'),
            company: formData.get('company'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            message: formData.get('message')
        };

        const inquiryData = {
            client: clientDetails,
            items: cart
        };

        console.log("Submitting technical quote request:", inquiryData);

        // Show premium processing -> success toast
        closeQuoteModal();
        const sendingMsg = t('toast_quote_sending', 'Sending quote request to engineers...');
        showToast(sendingMsg, "info");

        fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inquiryData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to submit quote request');
            }
            return response.json();
        })
        .then(data => {
            const successMsg = t('toast_quote_success', 'Quote request submitted successfully! We will contact you soon.');
            showToast(successMsg, "success");
            // Clear cart
            cart = [];
            saveCart();
            updateCartUI();
            // Close drawer
            const drawer = document.getElementById('cart-drawer');
            const rtl = isRTL();
            const translateRemoveClass = rtl ? '-translate-x-full' : 'translate-x-full';
            drawer.classList.add(translateRemoveClass);
            // Reset form
            document.getElementById('quote-request-form').reset();
        })
        .catch(err => {
            console.error('Error placing order:', err);
            const errorMsg = t('toast_quote_error', 'Failed to send quote request. Please try again later.');
            showToast(errorMsg, "error");
        });
    }
});
