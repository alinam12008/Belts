// nav-component.js — v6.0 (i18n-aware, key-based translation)
console.log('✅ nav-component.js v6.0 loaded');

(function () {
    'use strict';

    // ── Translation helper (falls back to English label if i18n not ready) ──
    function tr(key, fallback) {
        if (window.i18n && typeof window.i18n.t === 'function') {
            var val = window.i18n.t(key);
            if (val && val !== key) return val;
        }
        return fallback;
    }

    // ── Page definitions ─────────────────────────────────────────────────────
    function getPages() {
        return [
            { id: 'about',    labelKey: 'nav_about',    label: 'About Us',    href: 'about.html' },
            { id: 'products', labelKey: 'nav_products', label: 'Products',    href: 'products.html', hasDropdown: true },
            { id: 'clients',  labelKey: 'nav_clients',  label: 'Our Clients', href: 'clients.html' },
            { id: 'partners', labelKey: 'nav_partners', label: 'Our Partners',href: 'partners.html' },
            { id: 'contact',  labelKey: 'nav_contact',  label: 'Contact Us',  href: 'contact.html' },
        ];
    }

    // ── Category definitions (labels resolved from i18n) ─────────────────────
    function getCategories() {
        return [
            {
                labelKey: 'nav_cat_belts',
                label:    'BELT POWER TRANSMISSION',
                href:     'products.html?cat=BELTS+POWER+TRANSMISSION',
                subs: [
                    { labelKey: 'nav_sub_vbelts',     label: 'V Belts',                       href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=V+Belts' },
                    { labelKey: 'nav_sub_roundbelts',  label: 'Round Belts',                   href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Round+Belts' },
                    { labelKey: 'nav_sub_measurement', label: 'Measurement and Testing Tools', href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Measurement+and+Testing+Tools' },
                    { labelKey: 'nav_sub_ribbed',      label: 'Ribbed Belts',                  href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Ribbed+Belts' },
                    { labelKey: 'nav_sub_emergency',   label: 'Emergency and Transport Belts', href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Emergency+and+Transport+Belts' },
                    { labelKey: 'nav_sub_timing',      label: 'Timing Belts',                  href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Timing+Belts' },
                    { labelKey: 'nav_sub_special',     label: 'Special Belts',                 href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Special+Belts' },
                ]
            },
            {
                labelKey: 'nav_cat_pulleys',
                label:    'PULLEYS',
                href:     'products.html?cat=PULLEYS',
                subs: []
            },
            {
                labelKey: 'nav_cat_conveying',
                label:    'CONVEYING ACCESSORIES',
                href:     'products.html?cat=CONVEYING+ACCESSORIES',
                subs: []
            },
            {
                labelKey: 'nav_cat_rubber',
                label:    'RUBBER',
                href:     'products.html?cat=RUBBER',
                subs: []
            },
            {
                labelKey: 'nav_cat_insulation',
                label:    'INDUSTRIAL INSULATION',
                href:     'products.html?cat=INDUSTRIAL+INSULATION',
                subs: []
            },
            {
                labelKey: 'nav_cat_bearings',
                label:    'BEARINGS',
                href:     'products.html?cat=BEARINGS',
                subs: [
                    { labelKey: 'nav_sub_radialball',    label: 'Radial Ball Bearings',          href: 'products.html?cat=BEARINGS&sub=Radial+Ball+Bearings' },
                    { labelKey: 'nav_sub_radialroller',  label: 'Radial Roller Bearings',        href: 'products.html?cat=BEARINGS&sub=Radial+Roller+Bearings' },
                    { labelKey: 'nav_sub_thrust',        label: 'Thrust Ball Bearings',          href: 'products.html?cat=BEARINGS&sub=Thrust+Ball+Bearings' },
                    { labelKey: 'nav_sub_bearing_units', label: 'Bearing Units & Plummer Block', href: 'products.html?cat=BEARINGS&sub=Bearing+Units+and+Plummer+Block+Housing' },
                ]
            },
            {
                labelKey: 'nav_cat_chains',
                label:    'TRANSMISSION CHAINS & SPROCKETS',
                href:     'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS',
                subs: [
                    { labelKey: 'nav_sub_chain',     label: 'Transmission Chain', href: 'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS&sub=Transmission+chain' },
                    { labelKey: 'nav_sub_sprockets', label: 'Sprockets',          href: 'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS&sub=Sprockets' },
                    { labelKey: 'nav_sub_couplings', label: 'Couplings',          href: 'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS&sub=Couplings' },
                ]
            },
        ];
    }

    // ── 2-column dropdown ────────────────────────────────────────────────────
    function buildDropdown() {
        var CATEGORIES = getCategories();
        var leftCol  = [];
        var rightCol = [];

        CATEGORIES.forEach(function (cat, i) {
            var col     = i % 2 === 0 ? leftCol : rightCol;
            var hasSubs = cat.subs.length > 0;
            var uid     = 'navcat-' + i;
            var catLabel = tr(cat.labelKey, cat.label);
            var html    = '';

            if (hasSubs) {
                var subItems = cat.subs.map(function (s) {
                    return '<li>' +
                        '<a href="' + s.href + '" class="block text-[11px] uppercase tracking-wide text-on-surface-variant hover:text-primary hover:pl-1 transition-all py-0.5 border-l-2 border-transparent hover:border-primary pl-2">' +
                            tr(s.labelKey, s.label) +
                        '</a>' +
                    '</li>';
                }).join('');

                html += '<div class="nav-cat-block mb-3">' +
                    '<button type="button" data-target="' + uid + '" onclick="window.__navToggleSub(\'' + uid + '\', this)" class="nav-cat-btn w-full text-left flex items-center justify-between gap-2 group/cat">' +
                        '<a href="' + cat.href + '" onclick="event.stopPropagation()" class="font-bold text-[12px] uppercase tracking-wide text-primary hover:text-secondary transition-colors border-b-2 border-primary pb-1 flex-1">' +
                            catLabel +
                        '</a>' +
                        '<span class="material-symbols-outlined text-sm text-primary transition-transform duration-200" id="' + uid + '-icon">expand_more</span>' +
                    '</button>' +
                    '<ul id="' + uid + '" class="hidden mt-1.5 pl-2 space-y-0.5">' + subItems + '</ul>' +
                '</div>';
            } else {
                html += '<div class="nav-cat-block mb-3">' +
                    '<a href="' + cat.href + '" class="font-bold text-[12px] uppercase tracking-wide text-primary hover:text-secondary transition-colors border-b-2 border-primary pb-1 block">' +
                        catLabel +
                    '</a>' +
                '</div>';
            }

            col.push(html);
        });

        var productCategoriesLabel = tr('product_categories_label', 'Product Categories');
        var viewAllLabel = tr('view_all_label', 'View All');

        return '<div class="absolute top-full left-1/2 -translate-x-1/2 w-[640px] bg-surface-container-lowest border border-outline-variant shadow-2xl z-[100] py-4 px-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">' +
            '<div class="flex items-center justify-between border-b border-outline-variant pb-2 mb-4">' +
                '<span class="text-[10px] uppercase tracking-widest text-on-surface-variant font-technical-label">' + productCategoriesLabel + '</span>' +
                '<a href="products.html" class="text-[10px] uppercase tracking-widest text-primary hover:underline font-technical-label flex items-center gap-1">' +
                    viewAllLabel + ' <span class="material-symbols-outlined text-xs">arrow_forward</span>' +
                '</a>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-x-6">' +
                '<div>' + leftCol.join('') + '</div>' +
                '<div>' + rightCol.join('') + '</div>' +
            '</div>' +
        '</div>';
    }

    // ── Global toggle helper ──────────────────────────────────────────────────
    window.__navToggleSub = function (uid, btn) {
        var list = document.getElementById(uid);
        var icon = document.getElementById(uid + '-icon');
        if (!list) return;
        var isOpen = !list.classList.contains('hidden');
        list.classList.toggle('hidden', isOpen);
        if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
    };

    // ── Desktop nav ──────────────────────────────────────────────────────────
    function buildDesktopNav(activePage) {
        return getPages().map(function (p) {
            var isActive  = p.id === activePage;
            var base      = 'font-body-md text-[11px] uppercase font-bold tracking-wider transition-colors whitespace-nowrap';
            var active    = 'text-primary border-b-2 border-primary pb-1';
            var inactive  = 'text-on-surface-variant hover:text-primary';
            var cls       = base + ' ' + (isActive ? active : inactive);
            var label     = tr(p.labelKey, p.label);

            if (p.hasDropdown) {
                return '<div class="relative group">' +
                    '<button class="' + cls + ' flex items-center gap-1 bg-transparent border-0 cursor-pointer">' +
                        label +
                        '<span class="material-symbols-outlined text-base leading-none">expand_more</span>' +
                    '</button>' +
                    buildDropdown() +
                '</div>';
            }
            return '<a class="' + cls + '" href="' + p.href + '">' + label + '</a>';
        }).join('\n');
    }

    // ── Mobile nav ───────────────────────────────────────────────────────────
    function buildMobileNav(activePage) {
        return getPages().map(function (p) {
            var isActive = p.id === activePage;
            var active   = 'text-primary font-bold bg-primary/5';
            var inactive = 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low';
            var cls      = 'block px-4 py-3 font-body-md text-sm uppercase font-bold transition-colors ' + (isActive ? active : inactive);
            var label    = tr(p.labelKey, p.label);
            var CATEGORIES = getCategories();

            if (p.hasDropdown) {
                var cats = CATEGORIES.map(function (cat, i) {
                    var uid     = 'mob-cat-' + i;
                    var hasSubs = cat.subs.length > 0;
                    var catLabel = tr(cat.labelKey, cat.label);

                    if (!hasSubs) {
                        return '<a href="' + cat.href + '" class="block px-6 py-2.5 text-xs font-technical-label uppercase text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant/40">' + catLabel + '</a>';
                    }

                    var subItems = cat.subs.map(function (s) {
                        return '<li><a href="' + s.href + '" class="block px-10 py-2 text-[11px] uppercase tracking-wide text-on-surface-variant hover:text-primary border-b border-outline-variant/20">' + tr(s.labelKey, s.label) + '</a></li>';
                    }).join('');

                    return '<div>' +
                        '<button type="button" onclick="(function(btn){var uid=\'' + uid + '\';var list=document.getElementById(uid);var icon=document.getElementById(uid+\'-icon\');var open=!list.classList.contains(\'hidden\');list.classList.toggle(\'hidden\',open);if(icon)icon.style.transform=open?\'\':\' rotate(180deg)\';})(this)" class="w-full flex items-center justify-between px-6 py-2.5 text-xs font-technical-label uppercase text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant/40">' +
                            '<a href="' + cat.href + '" onclick="event.stopPropagation()" class="hover:underline">' + catLabel + '</a>' +
                            '<span class="material-symbols-outlined text-sm" id="' + uid + '-icon">expand_more</span>' +
                        '</button>' +
                        '<ul id="' + uid + '" class="hidden bg-surface-container-low">' + subItems + '</ul>' +
                    '</div>';
                }).join('');

                return '<div>' +
                    '<button onclick="this.nextElementSibling.classList.toggle(\'hidden\')" class="' + cls + ' w-full text-left flex items-center justify-between">' +
                        label +
                        '<span class="material-symbols-outlined text-base">expand_more</span>' +
                    '</button>' +
                    '<div class="hidden bg-surface-container-low border-b border-outline-variant">' + cats + '</div>' +
                '</div>';
            }
            return '<a class="' + cls + '" href="' + p.href + '">' + label + '</a>';
        }).join('\n');
    }

    // ── Rebuild nav (called on language change) ───────────────────────────────
    function rebuildNav() {
        var activePage = window.__NAV_ACTIVE_PAGE || document.body.getAttribute('data-active-page') || '';
        var existingNav = document.querySelector('header nav');
        if (existingNav) {
            existingNav.innerHTML = buildDesktopNav(activePage);
        }
        var mobileNavEl = document.querySelector('#mobile-nav-panel nav');
        if (mobileNavEl) {
            mobileNavEl.innerHTML = buildMobileNav(activePage);
        }
        // Update View Cart button text
        var viewCartBtn = document.querySelector('#navbar-tools-group button[onclick*="floating-cart-btn"]');
        if (viewCartBtn) {
            var cartLabel = (window.i18n && window.i18n.t) ? window.i18n.t('view_cart') : null;
            if (cartLabel) viewCartBtn.textContent = cartLabel.toUpperCase();
        }
        // Update mobile contact button
        var mobileContactBtn = document.querySelector('#mobile-nav-panel .p-4 a');
        if (mobileContactBtn) {
            var contactLabel = (window.i18n && window.i18n.t) ? window.i18n.t('contact_us') : null;
            if (contactLabel) mobileContactBtn.textContent = contactLabel;
        }
        // Update search placeholder
        var searchInput = document.getElementById('header-search');
        if (searchInput && window.i18n && window.i18n.t) {
            var phVal = window.i18n.t('search_placeholder');
            if (phVal) searchInput.setAttribute('placeholder', phVal);
        }
        if (window.CustomCursor && typeof window.CustomCursor.updateToggleUI === 'function') {
            window.CustomCursor.updateToggleUI();
        }
    }

    // ── Listen for language changes ───────────────────────────────────────────
    document.addEventListener('languageChanged', function () {
        rebuildNav();
    });

    // ── Inject navbar ────────────────────────────────────────────────────────
    function injectNavbar() {
        var activePage = window.__NAV_ACTIVE_PAGE || document.body.getAttribute('data-active-page') || '';
        var header = document.querySelector('header');
        if (!header) return;

        // ── Logo block ───────────────────────────────────────────────────────
        var headerInner = header.querySelector('.max-w-container-max');
        if (headerInner) {
            headerInner.classList.remove('px-margin-desktop');
            headerInner.classList.add('pl-0', 'pr-margin-desktop', 'gap-4', 'lg:gap-6');
        }

        var leftGroup = header.querySelector('.flex.items-center.gap-8');
        if (leftGroup) {
            var logoLink = leftGroup.querySelector('a');
            if (logoLink) {
                logoLink.outerHTML =
                    '<a href="index.html" class="flex items-center gap-2 md:gap-4 bg-primary text-white w-auto md:w-[300px] max-w-[200px] md:max-w-none h-20 shrink-0 select-none pl-3 md:pl-6 pr-3 md:pr-4 overflow-hidden">' +
                        '<svg class="w-8 h-8 md:w-12 md:h-12 shrink-0" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                            '<rect x="12" y="12" width="96" height="96" rx="3" fill="white"/>' +
                            '<clipPath id="square-clip"><rect x="12" y="12" width="96" height="96" rx="3"/></clipPath>' +
                            '<g clip-path="url(#square-clip)">' +
                                '<ellipse cx="42" cy="74" rx="65" ry="22" stroke="#003178" stroke-width="14" fill="none" transform="rotate(25 42 74)"/>' +
                                '<ellipse cx="34" cy="46" rx="65" ry="22" stroke="white" stroke-width="22" fill="none" transform="rotate(25 34 46)"/>' +
                                '<ellipse cx="34" cy="46" rx="65" ry="22" stroke="#003178" stroke-width="14" fill="none" transform="rotate(25 34 46)"/>' +
                                '<path d="M 51.3,54.1 A 65,22 25 0 1 100.9,101.5" stroke="white" stroke-width="22" fill="none"/>' +
                                '<path d="M 51.3,54.1 A 65,22 25 0 1 100.9,101.5" stroke="#003178" stroke-width="14" fill="none"/>' +
                            '</g>' +
                        '</svg>' +
                        '<div class="flex flex-col justify-center leading-none truncate">' +
                            '<span class="font-bold text-lg md:text-[28px] leading-none text-white font-headline-lg truncate">معرض السيور</span>' +
                            '<span class="text-[10px] md:text-[17px] leading-none uppercase tracking-widest text-blue-100 font-bold font-technical-label mt-1 truncate">BELTS STORE</span>' +
                        '</div>' +
                    '</a>';
            }
            leftGroup.classList.remove('gap-8');
            leftGroup.classList.add('gap-2', 'lg:gap-5');
        }

        // ── Search input ─────────────────────────────────────────────────────
        var searchInput = header.querySelector('#header-search');
        if (searchInput) {
            searchInput.classList.remove('w-64', 'py-2');
            searchInput.classList.add('w-28', 'lg:w-36', 'py-1.5', 'text-xs');
            searchInput.setAttribute('data-i18n-placeholder', 'search_placeholder');
            var searchContainer = searchInput.parentElement;
            if (searchContainer) {
                searchContainer.classList.remove('hidden', 'lg:block');
                searchContainer.classList.add('hidden', 'xl:block');
                var searchIcon = searchContainer.querySelector('.material-symbols-outlined');
                if (searchIcon) {
                    searchIcon.classList.remove('top-2.5');
                    searchIcon.classList.add('top-1/2', '-translate-y-1/2', 'text-lg', 'right-2.5');
                }
            }
        }

        // Use overflow-x: clip (not the Tailwind `overflow-x-hidden` utility) so
        // horizontal scroll/bleed is still prevented without breaking
        // `position: sticky` on descendants (e.g. the products.html sidebar).
        document.body.style.overflowX = 'clip';
        document.documentElement.style.overflowX = 'clip';

        // ── Desktop nav ──────────────────────────────────────────────────────
        var existingNav = header.querySelector('nav');
        if (!existingNav) return;
        existingNav.className = 'hidden md:flex items-center gap-2.5 lg:gap-3.5 shrink-0';
        existingNav.innerHTML = buildDesktopNav(activePage);

        // ── Right section: View Cart + Admin + Lang Switcher ─────────────────
        var rightSection = header.querySelector('.flex.items-center.gap-6:last-child');
        if (rightSection && !document.getElementById('mobile-menu-btn')) {
            // Hamburger
            var hamburger = document.createElement('button');
            hamburger.id = 'mobile-menu-btn';
            hamburger.className = 'md:hidden flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-primary transition-colors';
            hamburger.setAttribute('aria-label', 'Open menu');
            hamburger.innerHTML = '<span class="material-symbols-outlined">menu</span>';
            rightSection.insertBefore(hamburger, rightSection.firstChild);
        }

        if (rightSection && !document.getElementById('admin-navbar-btn')) {
            // Admin icon
            var adminBtn = document.createElement('a');
            adminBtn.id = 'admin-navbar-btn';
            adminBtn.href = '/admin.html';
            adminBtn.className = 'flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors shrink-0';
            adminBtn.innerHTML = '<span class="material-symbols-outlined text-2xl">admin_panel_settings</span>';

            // Language switcher
            var langWrapper = document.createElement('div');
            langWrapper.className = 'flex items-center shrink-0';
            var langSelect = document.createElement('select');
            langSelect.id = 'site-lang-select';
            langSelect.className = 'p-1 border border-outline-variant bg-surface-container-low text-xs rounded w-[90px] shrink-0 font-body-md font-bold';
            langSelect.innerHTML = '<option value="en">English</option><option value="ar">العربية</option>';
            langWrapper.appendChild(langSelect);

            // View Cart button
            var viewCartBtn = header.querySelector('button[onclick*="floating-cart-btn"]');
            var toolsGroup = document.createElement('div');
            toolsGroup.id = 'navbar-tools-group';
            toolsGroup.className = 'flex items-center gap-1.5 shrink-0 ml-2';

            if (viewCartBtn) {
                viewCartBtn.className = viewCartBtn.className.replace('px-6 py-2', 'px-3 py-1.5 text-xs shrink-0');
                viewCartBtn.classList.add('whitespace-nowrap');
                viewCartBtn.setAttribute('data-i18n', 'view_cart');
                toolsGroup.appendChild(viewCartBtn);
            }

            // Custom cursor toggle (desktop navbar)
            if (!document.getElementById('cursor-toggle-btn')) {
                var cursorToggleBtn = document.createElement('button');
                cursorToggleBtn.id = 'cursor-toggle-btn';
                cursorToggleBtn.type = 'button';
                cursorToggleBtn.className = 'hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors shrink-0';
                cursorToggleBtn.setAttribute('aria-pressed', 'true');
                cursorToggleBtn.innerHTML = '<span class="material-symbols-outlined text-2xl">precision_manufacturing</span>';
                toolsGroup.appendChild(cursorToggleBtn);
                if (window.CustomCursor && typeof window.CustomCursor.registerToggleButton === 'function') {
                    window.CustomCursor.registerToggleButton(cursorToggleBtn);
                }
            }

            toolsGroup.appendChild(adminBtn);
            toolsGroup.appendChild(langWrapper);
            rightSection.appendChild(toolsGroup);

            // Set initial value and wire change event
            var currentLang = localStorage.getItem('site_lang') || 'en';
            langSelect.value = currentLang;

            langSelect.addEventListener('change', function (e) {
                var lang = e.target.value;
                if (window.i18n && typeof window.i18n.setLang === 'function') {
                    window.i18n.setLang(lang);
                } else {
                    localStorage.setItem('site_lang', lang);
                    window.location.reload();
                }
            });
        }

        // ── Mobile drawer ────────────────────────────────────────────────────
        if (!document.getElementById('mobile-nav-drawer')) {
            var drawer = document.createElement('div');
            drawer.id = 'mobile-nav-drawer';
            drawer.className = 'fixed inset-0 z-[200] pointer-events-none';
            var contactUsLabel = tr('contact_us', 'Contact Us');
            drawer.innerHTML =
                '<div id="mobile-nav-overlay" class="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300"></div>' +
                '<div id="mobile-nav-panel" class="absolute top-0 left-0 h-full w-80 max-w-full bg-surface-container-lowest shadow-2xl translate-x-[-100%] transition-transform duration-300 flex flex-col">' +
                    '<div class="flex items-center justify-between px-6 py-5 border-b border-outline-variant bg-primary">' +
                        '<a href="index.html" class="font-headline-lg text-lg font-bold text-on-primary">BELTS STORE</a>' +
                        '<button id="mobile-nav-close" class="text-on-primary/80 hover:text-on-primary"><span class="material-symbols-outlined">close</span></button>' +
                    '</div>' +
                    '<nav class="flex-1 overflow-y-auto py-2">' + buildMobileNav(activePage) + '</nav>' +
                    '<div class="px-4 py-3 border-t border-outline-variant flex items-center justify-between">' +
                        '<a href="/admin.html" class="flex items-center text-on-surface-variant hover:text-primary transition-colors font-bold text-sm uppercase gap-1"><span class="material-symbols-outlined text-xl">admin_panel_settings</span> ADMIN</a>' +
                        '<select id="mobile-site-lang-select" class="p-1 border border-outline-variant bg-surface-container-low text-xs rounded w-[90px] shrink-0 font-body-md font-bold">' +
                            '<option value="en">English</option><option value="ar">العربية</option>' +
                        '</select>' +
                    '</div>' +
                    '<div class="px-4 py-3 border-t border-outline-variant md:hidden">' +
                        '<button id="cursor-toggle-mobile" type="button" class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-outline-variant bg-surface-container-low hover:border-primary hover:text-primary transition-colors text-on-surface-variant" aria-pressed="true">' +
                            '<span class="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">' +
                                '<span class="material-symbols-outlined text-xl">precision_manufacturing</span>' +
                                '<span id="cursor-toggle-mobile-label">Gear Cursor</span>' +
                            '</span>' +
                            '<span class="material-symbols-outlined text-base opacity-60">swap_horiz</span>' +
                        '</button>' +
                    '</div>' +
                    '<div class="p-4 border-t border-outline-variant">' +
                        '<a href="contact.html" class="block bg-primary text-on-primary font-bold text-center py-3 uppercase text-sm hover:bg-primary-container transition-all">' + contactUsLabel + '</a>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(drawer);

            var mobLangSelect = document.getElementById('mobile-site-lang-select');
            if (mobLangSelect) {
                var currentLang = localStorage.getItem('site_lang') || 'en';
                mobLangSelect.value = currentLang;
                mobLangSelect.addEventListener('change', function(e) {
                    var lang = e.target.value;
                    if (window.i18n && typeof window.i18n.setLang === 'function') {
                        window.i18n.setLang(lang);
                    } else {
                        localStorage.setItem('site_lang', lang);
                        window.location.reload();
                    }
                });
            }

            var btn      = document.getElementById('mobile-menu-btn');
            var overlay  = document.getElementById('mobile-nav-overlay');
            var panel    = document.getElementById('mobile-nav-panel');
            var closeBtn = document.getElementById('mobile-nav-close');
            var drawerEl = document.getElementById('mobile-nav-drawer');

            function openDrawer() {
                drawerEl.classList.remove('pointer-events-none');
                overlay.classList.remove('opacity-0');
                overlay.classList.add('opacity-100');
                panel.classList.remove('translate-x-[-100%]');
                panel.classList.add('translate-x-0');
                document.body.style.overflow = 'hidden';
            }
            function closeDrawer() {
                drawerEl.classList.add('pointer-events-none');
                overlay.classList.remove('opacity-100');
                overlay.classList.add('opacity-0');
                panel.classList.remove('translate-x-0');
                panel.classList.add('translate-x-[-100%]');
                document.body.style.overflow = '';
            }

            if (btn)      btn.addEventListener('click', openDrawer);
            if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
            if (overlay)  overlay.addEventListener('click', closeDrawer);

            var mobileCursorToggle = document.getElementById('cursor-toggle-mobile');
            if (mobileCursorToggle && window.CustomCursor && typeof window.CustomCursor.registerToggleButton === 'function') {
                window.CustomCursor.registerToggleButton(mobileCursorToggle);
            }
        }

        // Wire desktop toggle if navbar was already built on a prior visit
        var desktopCursorToggle = document.getElementById('cursor-toggle-btn');
        if (desktopCursorToggle && window.CustomCursor && typeof window.CustomCursor.registerToggleButton === 'function') {
            window.CustomCursor.registerToggleButton(desktopCursorToggle);
        }
    }

    // ── Boot ─────────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectNavbar);
    } else {
        injectNavbar();
    }
})();