// nav-component.js — v5.0 (2-col dropdown, click-to-expand subs, filtered links)
console.log('✅ nav-component.js v5.0 loaded');

(function () {
    'use strict';

    const PAGES = [
        { id: 'about',    label: 'About Us',    href: 'about.html' },
        { id: 'products', label: 'Products',     href: 'products.html', hasDropdown: true },
        { id: 'clients',  label: 'Our Clients',  href: 'clients.html' },
        { id: 'partners', label: 'Our Partners', href: 'partners.html' },
        { id: 'contact',  label: 'Contact Us',   href: 'contact.html' },
    ];

    const CATEGORIES = [
        {
            label: 'BELT POWER TRANSMISSION',
            href:  'products.html?cat=BELTS+POWER+TRANSMISSION',
            subs: [
                { label: 'V Belts',                       href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=V+Belts' },
                { label: 'Round Belts',                   href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Round+Belts' },
                { label: 'Measurement and Testing Tools', href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Measurement+and+Testing+Tools' },
                { label: 'Ribbed Belts',                  href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Ribbed+Belts' },
                { label: 'Emergency and Transport Belts', href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Emergency+and+transport+belts' },
                { label: 'Timing Belts',                  href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Timing+Belts' },
                { label: 'Special Belts',                 href: 'products.html?cat=BELTS+POWER+TRANSMISSION&sub=Special+Belts' },
            ]
        },
        {
            label: 'PULLEYS',
            href:  'products.html?cat=PULLEYS',
            subs: []
        },
        {
            label: 'CONVEYING ACCESSORIES',
            href:  'products.html?cat=CONVEYING+ACCESSORIES',
            subs: []
        },
        {
            label: 'RUBBER',
            href:  'products.html?cat=RUBBER',
            subs: []
        },
        {
            label: 'INDUSTRIAL INSULATION',
            href:  'products.html?cat=INDUSTRIAL+INSULATION',
            subs: []
        },
        {
            label: 'BEARINGS',
            href:  'products.html?cat=BEARINGS',
            subs: [
                { label: 'Radial Ball Bearings',           href: 'products.html?cat=BEARINGS&sub=Radial+Ball+Bearings' },
                { label: 'Radial Roller Bearings',         href: 'products.html?cat=BEARINGS&sub=Radial+Roller+Bearings' },
                { label: 'Thrust Ball Bearings',           href: 'products.html?cat=BEARINGS&sub=Thrust+Ball+Bearings' },
                { label: 'Bearing Units & Plummer Block',  href: 'products.html?cat=BEARINGS&sub=Bearing+Units+and+Plummer+Block+Housing' },
            ]
        },
        {
            label: 'TRANSMISSION CHAINS AND SPROCKETS',
            href:  'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS',
            subs: [
                { label: 'Transmission Chain', href: 'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS&sub=Transmission+chain' },
                { label: 'Sprockets',          href: 'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS&sub=Sprockets' },
                { label: 'Couplings',          href: 'products.html?cat=TRANSMISSION+CHAINS+AND+SPROCKETS&sub=Couplings' },
            ]
        },
    ];

    // ── 2-column dropdown with click-to-expand subs ──────────────────────────
    function buildDropdown() {
        const leftCol  = [];
        const rightCol = [];

        CATEGORIES.forEach((cat, i) => {
            const col = i % 2 === 0 ? leftCol : rightCol;
            const hasSubs = cat.subs.length > 0;
            const uid = 'navcat-' + i;

            let html = '';

            if (hasSubs) {
                // Category header acts as accordion toggle
                html += `
                <div class="nav-cat-block mb-3">
                    <button
                        type="button"
                        data-target="${uid}"
                        onclick="window.__navToggleSub('${uid}', this)"
                        class="nav-cat-btn w-full text-left flex items-center justify-between gap-2 group/cat"
                    >
                        <a href="${cat.href}"
                           onclick="event.stopPropagation()"
                           class="font-bold text-[12px] uppercase tracking-wide text-primary hover:text-secondary transition-colors border-b-2 border-primary pb-1 flex-1">
                            ${cat.label}
                        </a>
                        <span class="material-symbols-outlined text-sm text-primary transition-transform duration-200" id="${uid}-icon">expand_more</span>
                    </button>
                    <ul id="${uid}" class="hidden mt-1.5 pl-2 space-y-0.5">
                        ${cat.subs.map(s => `
                        <li>
                            <a href="${s.href}"
                               class="block text-[11px] uppercase tracking-wide text-on-surface-variant hover:text-primary hover:pl-1 transition-all py-0.5 border-l-2 border-transparent hover:border-primary pl-2">
                                ${s.label}
                            </a>
                        </li>`).join('')}
                    </ul>
                </div>`;
            } else {
                // No subs — plain link
                html += `
                <div class="nav-cat-block mb-3">
                    <a href="${cat.href}"
                       class="font-bold text-[12px] uppercase tracking-wide text-primary hover:text-secondary transition-colors border-b-2 border-primary pb-1 block">
                        ${cat.label}
                    </a>
                </div>`;
            }

            col.push(html);
        });

        return `
        <div class="absolute top-full left-1/2 -translate-x-1/2 w-[640px] bg-surface-container-lowest border border-outline-variant shadow-2xl z-[100] py-4 px-5
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">

            <!-- Header row -->
            <div class="flex items-center justify-between border-b border-outline-variant pb-2 mb-4">
                <span class="text-[10px] uppercase tracking-widest text-on-surface-variant font-technical-label">Product Categories</span>
                <a href="products.html" class="text-[10px] uppercase tracking-widest text-primary hover:underline font-technical-label flex items-center gap-1">
                    View All <span class="material-symbols-outlined text-xs">arrow_forward</span>
                </a>
            </div>

            <!-- 2-column grid -->
            <div class="grid grid-cols-2 gap-x-6">
                <div>${leftCol.join('')}</div>
                <div>${rightCol.join('')}</div>
            </div>
        </div>`;
    }

    // ── Global toggle helper (called from onclick in the HTML) ────────────────
    window.__navToggleSub = function (uid, btn) {
        const list = document.getElementById(uid);
        const icon = document.getElementById(uid + '-icon');
        if (!list) return;
        const isOpen = !list.classList.contains('hidden');
        list.classList.toggle('hidden', isOpen);
        if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
    };

    // ── Desktop nav ──────────────────────────────────────────────────────────
    function buildDesktopNav(activePage) {
        return PAGES.map(p => {
            const isActive = p.id === activePage;
            const base    = 'font-body-md text-[11px] uppercase font-bold tracking-wider transition-colors whitespace-nowrap';
            const active  = 'text-primary border-b-2 border-primary pb-1';
            const inactive = 'text-on-surface-variant hover:text-primary';
            const cls = `${base} ${isActive ? active : inactive}`;

            if (p.hasDropdown) {
                return `
                <div class="relative group">
                    <button class="${cls} flex items-center gap-1 bg-transparent border-0 cursor-pointer">
                        ${p.label}
                        <span class="material-symbols-outlined text-base leading-none">expand_more</span>
                    </button>
                    ${buildDropdown()}
                </div>`;
            }
            return `<a class="${cls}" href="${p.href}">${p.label}</a>`;
        }).join('\n');
    }

    // ── Mobile nav ───────────────────────────────────────────────────────────
    function buildMobileNav(activePage) {
        return PAGES.map(p => {
            const isActive = p.id === activePage;
            const active   = 'text-primary font-bold bg-primary/5';
            const inactive = 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low';
            const cls = `block px-4 py-3 font-body-md text-sm uppercase font-bold transition-colors ${isActive ? active : inactive}`;

            if (p.hasDropdown) {
                const cats = CATEGORIES.map((cat, i) => {
                    const uid = 'mob-cat-' + i;
                    const hasSubs = cat.subs.length > 0;

                    if (!hasSubs) {
                        return `<a href="${cat.href}" class="block px-6 py-2.5 text-xs font-technical-label uppercase text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant/40">${cat.label}</a>`;
                    }
                    return `
                    <div>
                        <button type="button"
                            onclick="(function(btn){var uid='${uid}';var list=document.getElementById(uid);var icon=document.getElementById(uid+'-icon');var open=!list.classList.contains('hidden');list.classList.toggle('hidden',open);if(icon)icon.style.transform=open?'':'rotate(180deg)';})(this)"
                            class="w-full flex items-center justify-between px-6 py-2.5 text-xs font-technical-label uppercase text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant/40">
                            <a href="${cat.href}" onclick="event.stopPropagation()" class="hover:underline">${cat.label}</a>
                            <span class="material-symbols-outlined text-sm" id="${uid}-icon">expand_more</span>
                        </button>
                        <ul id="${uid}" class="hidden bg-surface-container-low">
                            ${cat.subs.map(s => `<li><a href="${s.href}" class="block px-10 py-2 text-[11px] uppercase tracking-wide text-on-surface-variant hover:text-primary border-b border-outline-variant/20">${s.label}</a></li>`).join('')}
                        </ul>
                    </div>`;
                }).join('');

                return `
                <div>
                    <button onclick="this.nextElementSibling.classList.toggle('hidden')"
                        class="${cls} w-full text-left flex items-center justify-between">
                        ${p.label}
                        <span class="material-symbols-outlined text-base">expand_more</span>
                    </button>
                    <div class="hidden bg-surface-container-low border-b border-outline-variant">
                        ${cats}
                    </div>
                </div>`;
            }
            return `<a class="${cls}" href="${p.href}">${p.label}</a>`;
        }).join('\n');
    }

    // ── Inject navbar ────────────────────────────────────────────────────────
    function injectNavbar() {
        const activePage = window.__NAV_ACTIVE_PAGE || document.body.getAttribute('data-active-page') || '';
        const header = document.querySelector('header');
        if (!header) return;

        const headerInner = header.querySelector('.max-w-container-max');
        if (headerInner) {
            headerInner.classList.remove('px-margin-desktop');
            headerInner.classList.add('pl-0', 'pr-margin-desktop', 'gap-4', 'lg:gap-6');
        }

        const leftGroup = header.querySelector('.flex.items-center.gap-8');
        if (leftGroup) {
            const logoLink = leftGroup.querySelector('a');
            if (logoLink) {
                logoLink.outerHTML = `
                <a href="index.html" class="flex items-center gap-4 bg-primary text-white w-[300px] h-20 shrink-0 select-none pl-6 pr-4">
                    <svg class="w-12 h-12 shrink-0" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="12" y="12" width="96" height="96" rx="3" fill="white"/>
                        <clipPath id="square-clip"><rect x="12" y="12" width="96" height="96" rx="3"/></clipPath>
                        <g clip-path="url(#square-clip)">
                            <ellipse cx="42" cy="74" rx="65" ry="22" stroke="#003178" stroke-width="14" fill="none" transform="rotate(25 42 74)"/>
                            <ellipse cx="34" cy="46" rx="65" ry="22" stroke="white" stroke-width="22" fill="none" transform="rotate(25 34 46)"/>
                            <ellipse cx="34" cy="46" rx="65" ry="22" stroke="#003178" stroke-width="14" fill="none" transform="rotate(25 34 46)"/>
                            <path d="M 51.3,54.1 A 65,22 25 0 1 100.9,101.5" stroke="white" stroke-width="22" fill="none"/>
                            <path d="M 51.3,54.1 A 65,22 25 0 1 100.9,101.5" stroke="#003178" stroke-width="14" fill="none"/>
                        </g>
                    </svg>
                    <div class="flex flex-col justify-center leading-none">
                        <span class="font-bold text-[28px] leading-none text-white font-headline-lg whitespace-nowrap">معرض السيور</span>
                        <span class="text-[17px] leading-none uppercase tracking-widest text-blue-100 font-bold font-technical-label mt-1 whitespace-nowrap">BELTS STORE</span>
                    </div>
                </a>`;
            }
            leftGroup.classList.remove('gap-8');
            leftGroup.classList.add('gap-4', 'lg:gap-5');
        }

        const searchInput = header.querySelector('#header-search');
        if (searchInput) {
            searchInput.classList.remove('w-64', 'py-2');
            searchInput.classList.add('w-28', 'lg:w-36', 'py-1.5', 'text-xs');
            const searchContainer = searchInput.parentElement;
            if (searchContainer) {
                searchContainer.classList.remove('hidden', 'lg:block');
                searchContainer.classList.add('hidden', 'xl:block');
                const searchIcon = searchContainer.querySelector('.material-symbols-outlined');
                if (searchIcon) {
                    searchIcon.classList.remove('top-2.5');
                    searchIcon.classList.add('top-1/2', '-translate-y-1/2', 'text-lg', 'right-2.5');
                }
            }
        }

        document.body.classList.add('overflow-x-hidden');
        document.documentElement.classList.add('overflow-x-hidden');

        const existingNav = header.querySelector('nav');
        if (!existingNav) return;
        existingNav.className = 'hidden md:flex items-center gap-2.5 lg:gap-3.5 shrink-0';
        existingNav.innerHTML = buildDesktopNav(activePage);

        const rightSection = header.querySelector('.flex.items-center.gap-6:last-child');
        if (rightSection && !document.getElementById('mobile-menu-btn')) {
            const hamburger = document.createElement('button');
            hamburger.id = 'mobile-menu-btn';
            hamburger.className = 'md:hidden flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-primary transition-colors';
            hamburger.setAttribute('aria-label', 'Open menu');
            hamburger.innerHTML = '<span class="material-symbols-outlined">menu</span>';
            rightSection.insertBefore(hamburger, rightSection.firstChild);
        }

        if (rightSection && !document.getElementById('admin-navbar-btn')) {
            const adminBtn = document.createElement('a');
            adminBtn.id = 'admin-navbar-btn';
            adminBtn.href = '/admin.html';
            adminBtn.className = 'flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors shrink-0';
            adminBtn.innerHTML = '<span class="material-symbols-outlined text-2xl">admin_panel_settings</span>';

            const langWrapper = document.createElement('div');
            langWrapper.className = 'flex items-center shrink-0';
            const langSelect = document.createElement('select');
            langSelect.id = 'site-lang-select';
            langSelect.className = 'p-1 border border-outline-variant bg-surface-container-low text-xs rounded w-[90px] shrink-0 font-body-md font-bold';
            langSelect.innerHTML = '<option value="en">English</option><option value="ar">العربية</option>';
            langWrapper.appendChild(langSelect);

            const viewCartBtn = header.querySelector('button[onclick*="floating-cart-btn"]');
            const toolsGroup = document.createElement('div');
            toolsGroup.id = 'navbar-tools-group';
            toolsGroup.className = 'flex items-center gap-1.5 shrink-0 ml-2';

            if (viewCartBtn) {
                viewCartBtn.className = viewCartBtn.className.replace('px-6 py-2', 'px-3 py-1.5 text-xs shrink-0');
                viewCartBtn.classList.add('whitespace-nowrap');
                toolsGroup.appendChild(viewCartBtn);
            }
            toolsGroup.appendChild(adminBtn);
            toolsGroup.appendChild(langWrapper);
            rightSection.appendChild(toolsGroup);

            function getSiteLang() { return localStorage.getItem('site_lang') || 'en'; }
            function applySiteLang(lang) {
                localStorage.setItem('site_lang', lang);
                document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
                document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.style.setProperty('--currency-symbol', lang === 'ar' ? 'ر.س' : '$');
                existingNav.innerHTML = buildDesktopNav(activePage);
            }
            langSelect.value = getSiteLang();
            langSelect.addEventListener('change', (e) => applySiteLang(e.target.value));
            applySiteLang(getSiteLang());
        }

        if (!document.getElementById('mobile-nav-drawer')) {
            const drawer = document.createElement('div');
            drawer.id = 'mobile-nav-drawer';
            drawer.className = 'fixed inset-0 z-[200] pointer-events-none';
            drawer.innerHTML = `
                <div id="mobile-nav-overlay" class="absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300"></div>
                <div id="mobile-nav-panel" class="absolute top-0 left-0 h-full w-80 max-w-full bg-surface-container-lowest shadow-2xl translate-x-[-100%] transition-transform duration-300 flex flex-col">
                    <div class="flex items-center justify-between px-6 py-5 border-b border-outline-variant bg-primary">
                        <a href="index.html" class="font-headline-lg text-lg font-bold text-on-primary">BELTS STORE</a>
                        <button id="mobile-nav-close" class="text-on-primary/80 hover:text-on-primary">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <nav class="flex-1 overflow-y-auto py-2">${buildMobileNav(activePage)}</nav>
                    <div class="p-4 border-t border-outline-variant">
                        <a href="contact.html" class="block bg-primary text-on-primary font-bold text-center py-3 uppercase text-sm hover:bg-primary-container transition-all">Contact Us</a>
                    </div>
                </div>`;
            document.body.appendChild(drawer);

            const btn      = document.getElementById('mobile-menu-btn');
            const overlay  = document.getElementById('mobile-nav-overlay');
            const panel    = document.getElementById('mobile-nav-panel');
            const closeBtn = document.getElementById('mobile-nav-close');
            const drawerEl = document.getElementById('mobile-nav-drawer');

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
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectNavbar);
    } else {
        injectNavbar();
    }
})();