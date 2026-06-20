// // ====================== i18n.js ======================
// // Central translation engine for all frontend pages.
// // Language preference is stored in localStorage under 'site_lang'.
// // Automatically adds a language selector to the header if not present.

// (function() {
//     // ---- TRANSLATIONS ----
//     const translations = {
//         en: {
//             // Global / Header
//             'brand': 'BELTS STORE',
//             'search-placeholder': 'Search Part Number...',
//             'view-cart': 'VIEW CART',
//             'admin-link': 'Admin',
//             // Hero (index)
//             'hero-title': 'Powering Industrial Excellence',
//             'hero-sub': 'High-precision power transmission solutions designed for the most demanding mechanical environments. Engineering reliability into every component.',
//             'browse-catalog': 'BROWSE CATALOG',
//             'view-specs': 'VIEW SPECIFICATIONS',
//             // Intro
//             'since': 'Since 1994 · ISO 9001:2015',
//             'intro-title': 'Your Trusted Industrial Power Transmission Partner',
//             'intro-text': 'Belts Store Trading delivers superior power transmission components to the regional industrial sector — governments, oil & gas, mining, manufacturing, and private enterprise. Importing from Germany, Japan, Spain, Taiwan, China, and India.',
//             'years-exp': 'Years Experience',
//             'source-countries': 'Source Countries',
//             'iso-cert': '9001:2015 Certified',
//             // Sidebar categories
//             'product-categories': 'PRODUCT CATEGORIES',
//             'tech-specs-side': 'Technical Specifications',
//             'cat-belts': 'Belts Power Transmission',
//             'cat-pulleys': 'Pulleys',
//             'cat-conveying': 'Conveying Accessories',
//             'cat-rubber': 'Rubber',
//             'cat-insulation': 'Industrial Insulation',
//             'cat-bearings': 'Bearings',
//             'cat-chains': 'Transmission Chains',
//             'cat-sprockets': 'Sprockets',
//             // Category grid
//             'browse-categories': 'BROWSE CATEGORIES',
//             'power-drive': 'Power Drive',
//             'cat-belts-title': 'Belt Power Transmission',
//             'cat-belts-desc': 'V Belts, Timing Belts & Special Belts',
//             'series-p400': 'Series P-400',
//             'cat-pulleys-title': 'Pulleys',
//             'cat-pulleys-desc': 'Precision Grooved Performance',
//             'material-flow': 'Material Flow',
//             'cat-conveying-title': 'Conveying Accessories',
//             'cat-conveying-desc': 'Modular Handling Systems',
//             'vulcanized': 'Vulcanized',
//             'cat-rubber-title': 'Rubber',
//             'cat-rubber-desc': 'High-Resilience Products',
//             'thermal-sealing': 'Thermal & Sealing',
//             'cat-insulation-title': 'Industrial Insulation',
//             'cat-insulation-desc': 'Gaskets, Felt & Packing Ropes',
//             'skf-fag-nsk': 'SKF · FAG · NSK',
//             'cat-bearings-title': 'Bearings',
//             'cat-bearings-desc': 'Ball, Roller & Thrust Bearings',
//             'din-ansi': 'DIN · ANSI',
//             'cat-chains-title': 'Transmission Chains & Sprockets',
//             'cat-chains-desc': 'Chains, Couplings & Sprockets',
//             // Technical advantage
//             'tech-advantage-title': 'The Technical Advantage',
//             'tech-advantage-desc': 'Engineered for durability, our transmission solutions undergo rigorous testing to ensure operational certainty.',
//             'precision-load': 'Precision Load Ratings',
//             'precision-load-desc': 'Accurate performance data for extreme torque and speed requirements.',
//             'custom-fab': 'Custom Fabrication',
//             'custom-fab-desc': 'Bespoke belt lengths and pulley dimensions engineered to your specs.',
//             'tech-support': 'Technical Support',
//             'tech-support-desc': 'Direct access to mechanical engineers for system optimization.',
//             // Featured products
//             'featured-products': 'Featured Bearings & Sprockets',
//             'featured-desc': 'Direct stock of high-demand industrial components.',
//             'full-catalog': 'FULL CATALOG',
//             'in-stock': 'In Stock',
//             'product1-name': 'Double-Row Roller Bearings',
//             'product1-desc': 'High radial load capacity for industrial gearboxes.',
//             'heavy-duty': 'Heavy Duty',
//             'product2-name': 'Hardened Drive Sprockets',
//             'product2-desc': 'Induction hardened teeth for maximum wear resistance.',
//             'view-specs-btn': 'VIEW SPECS',
//             'th-model': 'Model Number',
//             'th-category': 'Category',
//             'th-material': 'Material Grade',
//             'th-torque': 'Max Torque',
//             'th-action': 'Action',
//             // Our products
//             'our-products-title': 'Our Products',
//             'view-all': 'VIEW ALL',
//             'v-belts': 'V-Belts',
//             'optibelt-vb': 'Optibelt VB',
//             'optibelt-vb-desc': 'Classical V-belts designed for general industrial and agricultural machinery, offering high dependability and efficiency.',
//             'add-to-cart': 'ADD TO CART',
//             // You can extend with product names for other products...
//             // Clients & Partners (index)
//             'our-clients-title': 'Our Clients',
//             'our-partners-title': 'Our Partners',
//             // CTA
//             'ready-to-order': 'Ready to Order?',
//             'need-components': 'Need Industrial Components?',
//             'cta-text': 'Our technical team is ready to help you find the right power transmission solution. Contact us today for a quote.',
//             'contact-us': 'CONTACT US',
//             'browse-catalog-cta': 'BROWSE CATALOG',
//             // Footer
//             'footer-brand': 'BELTS STORE',
//             'footer-desc': 'Supplying global industries with premium power transmission components since 1994. Quality certified and engineering backed.',
//             'footer-nav': 'Navigation',
//             'about-us': 'About Us',
//             'products': 'Products',
//             'our-clients': 'Our Clients',
//             'our-partners': 'Our Partners',
//             'contact': 'Contact Us',
//             'footer-categories': 'Categories',
//             'footer-cat-belts': 'Belt Power Transmission',
//             'footer-cat-pulleys': 'Pulleys',
//             'footer-cat-bearings': 'Bearings',
//             'footer-cat-chains': 'Transmission Chains',
//             'footer-newsletter': 'Industrial Newsletter',
//             'newsletter-text': 'Receive technical updates and inventory arrivals.',
//             'email-placeholder': 'Email address',
//             'join-btn': 'JOIN',
//             'copyright': '© 2024 Belts Store. All Rights Reserved. Powering Industrial Excellence.',
//             'privacy': 'Privacy Policy',
//             'terms': 'Terms of Service',
//             'shipping': 'Shipping & Returns',
//             // About page
//             'about-title': 'About Us',
//             'about-mission': 'Our Mission',
//             // Clients page
//             'clients-title': 'Our Clients',
//             // Contact page
//             'contact-title': 'Contact Us',
//             // Partners page
//             'partners-title': 'Our Partners',
//             // Products page
//             'products-title': 'Product Catalog',
//             'filter-category': 'Filter by Category',
//             'clear-filters': 'Clear Filters',
//             // Product detail
//             'product-detail-title': 'Product Details',
//             'back-to-products': 'Back to Products',
//             // Admin panel (if sharing)
//             'dashboard': 'Dashboard',
//             'product-catalog': 'Product Catalog',
//             'orders-quotes': 'Orders & Quotes',
//             'tickets-inbox': 'Tickets inbox',
//             'system-configs': 'System configs',
//             'logout-btn': 'Terminate session',
//             // ... add any missing keys for other pages
//         },
//         ar: {
//             // Global / Header
//             'brand': 'متجر BELTS',
//             'search-placeholder': 'ابحث عن رقم القطعة...',
//             'view-cart': 'عرض السلة',
//             'admin-link': 'الإدارة',
//             // Hero
//             'hero-title': 'نقود التميز الصناعي',
//             'hero-sub': 'حلول نقل الحركة عالية الدقة مصممة لأكثر البيئات الميكانيكية تطلباً. هندسة الموثوقية في كل مكون.',
//             'browse-catalog': 'تصفح الكتالوج',
//             'view-specs': 'عرض المواصفات',
//             // Intro
//             'since': 'منذ 1994 · ISO 9001:2015',
//             'intro-title': 'شريكك الموثوق في نقل الحركة الصناعية',
//             'intro-text': 'تقدم شركة BELTS STORE مكونات نقل حركة فائقة الجودة للقطاع الصناعي في المنطقة - الحكومات، النفط والغاز، التعدين، التصنيع، والقطاع الخاص. نستورد من ألمانيا، اليابان، إسبانيا، تايوان، الصين، والهند.',
//             'years-exp': 'سنوات الخبرة',
//             'source-countries': 'دول المنشأ',
//             'iso-cert': 'معتمد ISO 9001:2015',
//             // Sidebar categories
//             'product-categories': 'فئات المنتجات',
//             'tech-specs-side': 'المواصفات التقنية',
//             'cat-belts': 'سيور نقل الحركة',
//             'cat-pulleys': 'البكرات',
//             'cat-conveying': 'ملحقات النقل',
//             'cat-rubber': 'المطاط',
//             'cat-insulation': 'العزل الصناعي',
//             'cat-bearings': 'المحامل',
//             'cat-chains': 'سلاسل النقل',
//             'cat-sprockets': 'التروس المسننة',
//             // Category grid
//             'browse-categories': 'تصفح الفئات',
//             'power-drive': 'نقل القدرة',
//             'cat-belts-title': 'سيور نقل الحركة',
//             'cat-belts-desc': 'سيور V، سيور التوقيت والسيور الخاصة',
//             'series-p400': 'سلسلة P-400',
//             'cat-pulleys-title': 'البكرات',
//             'cat-pulleys-desc': 'أداء محزوز دقيق',
//             'material-flow': 'تدفق المواد',
//             'cat-conveying-title': 'ملحقات النقل',
//             'cat-conveying-desc': 'أنظمة مناولة معيارية',
//             'vulcanized': 'مفلكن',
//             'cat-rubber-title': 'المطاط',
//             'cat-rubber-desc': 'منتجات عالية المرونة',
//             'thermal-sealing': 'حراري وختم',
//             'cat-insulation-title': 'العزل الصناعي',
//             'cat-insulation-desc': 'حشوات، لباد وحبال التعبئة',
//             'skf-fag-nsk': 'SKF · FAG · NSK',
//             'cat-bearings-title': 'المحامل',
//             'cat-bearings-desc': 'محامل كروية، أسطوانية ودحروجة',
//             'din-ansi': 'DIN · ANSI',
//             'cat-chains-title': 'سلاسل النقل والتروس المسننة',
//             'cat-chains-desc': 'سلاسل، وصلات وتروس مسننة',
//             // Technical advantage
//             'tech-advantage-title': 'الميزة التقنية',
//             'tech-advantage-desc': 'مصممة للمتانة، تخضع حلول النقل لدينا لاختبارات صارمة لضمان اليقين التشغيلي.',
//             'precision-load': 'تصنيفات الحمل الدقيقة',
//             'precision-load-desc': 'بيانات أداء دقيقة لمتطلبات عزم الدوران والسرعة القصوى.',
//             'custom-fab': 'التصنيع المخصص',
//             'custom-fab-desc': 'أطوال سيور وأبعاد بكرات مخصصة حسب مواصفاتك.',
//             'tech-support': 'الدعم الفني',
//             'tech-support-desc': 'وصول مباشر إلى مهندسين ميكانيكيين لتحسين النظام.',
//             // Featured products
//             'featured-products': 'محامل وتروس مسننة مميزة',
//             'featured-desc': 'مخزون مباشر من المكونات الصناعية عالية الطلب.',
//             'full-catalog': 'الكتالوج الكامل',
//             'in-stock': 'متوفر',
//             'product1-name': 'محامل أسطوانية مزدوجة الصف',
//             'product1-desc': 'سعة حمل شعاعية عالية للعلب الصناعية.',
//             'heavy-duty': 'خدمة شاقة',
//             'product2-name': 'تروس مسننة مقواة',
//             'product2-desc': 'أسنان مقواة بالحث لأقصى مقاومة للتآكل.',
//             'view-specs-btn': 'عرض المواصفات',
//             'th-model': 'رقم الموديل',
//             'th-category': 'الفئة',
//             'th-material': 'درجة المادة',
//             'th-torque': 'أقصى عزم',
//             'th-action': 'الإجراء',
//             // Our products
//             'our-products-title': 'منتجاتنا',
//             'view-all': 'عرض الكل',
//             'v-belts': 'سيور V',
//             'optibelt-vb': 'Optibelt VB',
//             'optibelt-vb-desc': 'سيور V كلاسيكية مصممة للآلات الصناعية والزراعية العامة، وتوفر اعتمادية وكفاءة عالية.',
//             'add-to-cart': 'أضف إلى السلة',
//             // Clients & Partners
//             'our-clients-title': 'عملاؤنا',
//             'our-partners-title': 'شركاؤنا',
//             // CTA
//             'ready-to-order': 'هل أنت مستعد للطلب؟',
//             'need-components': 'هل تحتاج إلى مكونات صناعية؟',
//             'cta-text': 'فريقنا الفني جاهز لمساعدتك في العثور على حل نقل الحركة المناسب. اتصل بنا اليوم للحصول على عرض سعر.',
//             'contact-us': 'اتصل بنا',
//             'browse-catalog-cta': 'تصفح الكتالوج',
//             // Footer
//             'footer-brand': 'متجر BELTS',
//             'footer-desc': 'توريد الصناعات العالمية بمكونات نقل حركة فائقة الجودة منذ 1994. معتمدة الجودة ومدعومة بالهندسة.',
//             'footer-nav': 'التنقل',
//             'about-us': 'من نحن',
//             'products': 'المنتجات',
//             'our-clients': 'عملاؤنا',
//             'our-partners': 'شركاؤنا',
//             'contact': 'اتصل بنا',
//             'footer-categories': 'الفئات',
//             'footer-cat-belts': 'سيور نقل الحركة',
//             'footer-cat-pulleys': 'البكرات',
//             'footer-cat-bearings': 'المحامل',
//             'footer-cat-chains': 'سلاسل النقل',
//             'footer-newsletter': 'النشرة الصناعية',
//             'newsletter-text': 'تلقي التحديثات الفنية ووصول المخزون.',
//             'email-placeholder': 'البريد الإلكتروني',
//             'join-btn': 'اشترك',
//             'copyright': '© 2024 متجر BELTS. جميع الحقوق محفوظة. نقود التميز الصناعي.',
//             'privacy': 'سياسة الخصوصية',
//             'terms': 'شروط الخدمة',
//             'shipping': 'الشحن والإرجاع',
//             // About page
//             'about-title': 'من نحن',
//             'about-mission': 'مهمتنا',
//             // Clients page
//             'clients-title': 'عملاؤنا',
//             // Contact page
//             'contact-title': 'اتصل بنا',
//             // Partners page
//             'partners-title': 'شركاؤنا',
//             // Products page
//             'products-title': 'كتالوج المنتجات',
//             'filter-category': 'تصفية حسب الفئة',
//             'clear-filters': 'إزالة الفلتر',
//             // Product detail
//             'product-detail-title': 'تفاصيل المنتج',
//             'back-to-products': 'العودة إلى المنتجات',
//             // Admin panel
//             'dashboard': 'لوحة التحكم',
//             'product-catalog': 'كتالوج المنتجات',
//             'orders-quotes': 'الطلبات والعروض',
//             'tickets-inbox': 'صندوق التذاكر',
//             'system-configs': 'إعدادات النظام',
//             'logout-btn': 'إنهاء الجلسة',
//         }
//     };

//     // ---- HELPERS ----
//     function getLang() {
//         return localStorage.getItem('site_lang') || 'en';
//     }

//     function translate(key, lang) {
//         const t = translations[lang] || translations['en'];
//         return t[key] || key;
//     }

//     function applyTranslations(lang) {
//         document.querySelectorAll('[data-i18n]').forEach(el => {
//             const key = el.getAttribute('data-i18n');
//             el.innerText = translate(key, lang);
//         });
//         document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
//             const key = el.getAttribute('data-i18n-placeholder');
//             el.placeholder = translate(key, lang);
//         });
//         // Also update title attribute if needed
//         document.querySelectorAll('[data-i18n-title]').forEach(el => {
//             const key = el.getAttribute('data-i18n-title');
//             el.title = translate(key, lang);
//         });
//         // Update page direction and language
//         document.documentElement.lang = lang;
//         // document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
//         // Update currency symbol if used (optional)
//         const symbol = lang === 'ar' ? 'ر.س' : '$';
//         document.documentElement.style.setProperty('--currency-symbol', symbol);
//     }

//     function setLang(lang) {
//         localStorage.setItem('site_lang', lang);
//         applyTranslations(lang);
//         // Update language selector if exists
//         const sel = document.getElementById('lang-select-site');
//         if (sel) sel.value = lang;
//         // If we have a global event, we could trigger a custom event for other scripts
//         document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
//     }

//     // ---- AUTO-INJECT LANGUAGE SELECTOR ----
//     function injectLanguageSelector() {
//         // Check if a selector already exists
//         if (document.getElementById('lang-select-site')) return;

//         // Find a suitable container: usually in the header's right side
//         const header = document.querySelector('header .flex.items-center.gap-6');
//         if (!header) {
//             // If no standard header, try to find any header or just append to body
//             // We'll create a floating selector as fallback.
//             const container = document.createElement('div');
//             container.className = 'fixed top-4 right-4 z-50';
//             container.innerHTML = `
//                 <select id="lang-select-site" class="p-2 border border-outline-variant bg-surface-container-low text-sm rounded shadow">
//                     <option value="en">English</option>
//                     <option value="ar">العربية</option>
//                 </select>
//             `;
//             document.body.appendChild(container);
//             const sel = document.getElementById('lang-select-site');
//             sel.addEventListener('change', (e) => setLang(e.target.value));
//             return;
//         }

//         // Insert the selector
//         const selWrapper = document.createElement('div');
//         selWrapper.className = 'flex items-center';
//         selWrapper.innerHTML = `
//             <select id="lang-select-site" class="p-2 border border-outline-variant bg-surface-container-low text-sm rounded">
//                 <option value="en">English</option>
//                 <option value="ar">العربية</option>
//             </select>
//         `;
//         // Insert before the last child (usually the cart button)
//         header.appendChild(selWrapper);
//         const sel = document.getElementById('lang-select-site');
//         sel.addEventListener('change', (e) => setLang(e.target.value));
//     }

//     // ---- INIT ----
//     document.addEventListener('DOMContentLoaded', function() {
//         // Inject language selector into header
//         injectLanguageSelector();

//         // Get current language
//         const lang = getLang();
//         // Set selector value if present
//         const sel = document.getElementById('lang-select-site');
//         if (sel) sel.value = lang;
//         // Apply translations
//         applyTranslations(lang);
//     });

//     // Expose functions globally
//     window.i18n = {
//         getLang,
//         setLang,
//         translate,
//         applyTranslations,
//     };

// })();