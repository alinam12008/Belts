/**
 * nav-component.js — Shared Navbar Injection for Belts Store
 *
 * Usage: Include this script in the <head> or before </body>.
 * Set data-active-page attribute on the <body> to one of:
 *   "about" | "products" | "clients" | "partners" | "contact"
 *
 * Example:
 *   <body data-active-page="products">
 */
(function () {
    'use strict';

    const PAGES = [
        { id: 'about',    label: 'About Us',     href: 'about.html' },
        { id: 'products', label: 'Products',      href: 'products.html', hasDropdown: true },
        { id: 'clients',  label: 'Our Clients',   href: 'clients.html' },
        { id: 'partners', label: 'Our Partners',  href: 'partners.html' },
        { id: 'contact',  label: 'Contact Us',    href: 'contact.html' },
    ];

    const CATEGORIES = [
        {
            label: 'Belt Power Transmission',
            href: 'products.html?cat=Belts+Power+Transmission',
            subs: [
                { label: 'V Belts',                        href: 'products.html?cat=Belts+Power+Transmission&sub=V+Belts' },
                { label: 'Round Belts',                    href: 'products.html?cat=Belts+Power+Transmission&sub=Round+Belts' },
                { label: 'Ribbed Belts',                   href: 'products.html?cat=Belts+Power+Transmission&sub=Ribbed+Belts' },
                { label: 'Timing Belts',                   href: 'products.html?cat=Belts+Power+Transmission&sub=Timing+Belts' },
                { label: 'Special Belts',                  href: 'products.html?cat=Belts+Power+Transmission&sub=Special+Belts' },
                { label: 'Repair Kits & Tension Tools',    href: 'products.html?cat=Belts+Power+Transmission&sub=Repair+Kits+and+Tension+Tools' },
            ]
        },
        { label: 'Pulleys',                 href: 'products.html?cat=Pulleys', subs: [] },
        { label: 'Conveying Accessories',   href: 'products.html?cat=Conveying+Accessorise', subs: [] },
        { label: 'Rubber',                  href: 'products.html?cat=Rubber', subs: [] },
        { label: 'Industrial Insulation',   href: 'products.html?cat=Industrial+Insulation', subs: [] },
        {
            label: 'Bearings',
            href: 'products.html?cat=Bearings',
            subs: [
                { label: 'Radial Ball Bearings',              href: 'products.html?cat=Bearings&sub=Radial+Ball+Bearings' },
                { label: 'Radial Roller Bearings',            href: 'products.html?cat=Bearings&sub=Radial+Roller+Bearings' },
                { label: 'Thrust Ball Bearings',              href: 'products.html?cat=Bearings&sub=Thrust+Ball+Bearings' },
                { label: 'Bearing Units & Plummer Block',     href: 'products.html?cat=Bearings&sub=Bearing+Units+and+Plummer+Block+Housing' },
            ]
        },
        {
            label: 'Transmission Chains & Sprockets',
            href: 'products.html?cat=Transmission+Chains+And+Sprockets',
            subs: [
                { label: 'Transmission Chain',   href: 'products.html?cat=Transmission+Chains+And+Sprockets&sub=Transmission+chain' },
                { label: 'Couplings',            href: 'products.html?cat=Transmission+Chains+And+Sprockets&sub=Couplings' },
                { label: 'Sprockets',            href: 'products.html?cat=Transmission+Chains+And+Sprockets&sub=Sprockets' },
            ]
        },
    ];

    function buildDropdown() {
        const cols = CATEGORIES.map(cat => {
            const subs = cat.subs.length
                ? `<ul class="mt-1 space-y-0.5 pl-2">${cat.subs.map(s =>
                    `<li><a href="${s.href}" class="block text-[11px] font-technical-label text-on-surface-variant uppercase tracking-wide hover:text-primary hover:pl-1 transition-all py-0.5">${s.label}</a></li>`
                ).join('')}</ul>`
                : '';
            return `
            <div>
              <a href="${cat.href}" class="block text-[13px] font-headline-lg font-bold text-primary uppercase tracking-wide hover:text-secondary transition-colors border-b border-outline-variant pb-2 mb-2">${cat.label}</a>
              ${subs}
            </div>`;
        });
        return `
        <div class="absolute top-full left-1/2 -translate-x-1/2 w-[760px] bg-surface-container-lowest border border-outline-variant shadow-2xl z-[100] py-6 px-6 grid grid-cols-3 gap-x-8 gap-y-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div class="col-span-3 border-b border-outline-variant pb-3 mb-1 flex items-center justify-between">
                <span class="font-technical-label text-[10px] uppercase tracking-widest text-on-surface-variant">Product Categories</span>
                <a href="products.html" class="font-technical-label text-[10px] uppercase tracking-widest text-primary hover:underline flex items-center gap-1">View All <span class="material-symbols-outlined text-xs">arrow_forward</span></a>
            </div>
            ${cols.join('')}
        </div>`;
    }

    function buildDesktopNav(activePage) {
        return PAGES.map(p => {
            const isActive = p.id === activePage;
            const baseClass = 'font-body-md text-body-md uppercase font-bold transition-colors';
            const activeClass = 'text-primary border-b-2 border-primary pb-1';
            const inactiveClass = 'text-on-surface-variant hover:text-primary';
            const cls = `${baseClass} ${isActive ? activeClass : inactiveClass}`;

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

    function buildMobileNav(activePage) {
        const items = PAGES.map(p => {
            const isActive = p.id === activePage;
            const activeClass = 'text-primary font-bold bg-primary/5';
            const inactiveClass = 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low';
            const cls = `block px-4 py-3 font-body-md text-sm uppercase font-bold transition-colors ${isActive ? activeClass : inactiveClass}`;

            if (p.hasDropdown) {
                const subs = CATEGORIES.map(cat => `
                    <a href="${cat.href}" class="block px-8 py-2.5 text-xs font-technical-label uppercase text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant/40">
                        ${cat.label}
                    </a>`).join('');
                return `
                <div>
                    <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="${cls} w-full text-left flex items-center justify-between">
                        ${p.label}
                        <span class="material-symbols-outlined text-base">expand_more</span>
                    </button>
                    <div class="hidden bg-surface-container-low border-b border-outline-variant">
                        ${subs}
                    </div>
                </div>`;
            }
            return `<a class="${cls}" href="${p.href}">${p.label}</a>`;
        }).join('\n');

        return items;
    }

    function injectNavbar() {
        // Read the active page from a global var or body attribute
        const activePage = window.__NAV_ACTIVE_PAGE || document.body.getAttribute('data-active-page') || '';

        // Find the existing header or build one
        const header = document.querySelector('header');
        if (!header) return;

        // Find the existing nav element inside the header
        const existingNav = header.querySelector('nav');
        if (!existingNav) return;

        // Replace the nav content with the 5-item nav
        existingNav.innerHTML = buildDesktopNav(activePage);

        // Add mobile hamburger button if not present
        const rightSection = header.querySelector('.flex.items-center.gap-6:last-child');
        if (rightSection && !document.getElementById('mobile-menu-btn')) {
            const hamburger = document.createElement('button');
            hamburger.id = 'mobile-menu-btn';
            hamburger.className = 'md:hidden flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-primary transition-colors';
            hamburger.setAttribute('aria-label', 'Open menu');
            hamburger.innerHTML = '<span class="material-symbols-outlined">menu</span>';
            rightSection.insertBefore(hamburger, rightSection.firstChild);
        }

        // Add admin settings button if not present
        if (rightSection && !document.getElementById('admin-navbar-btn')) {
            const adminBtn = document.createElement('a');
            adminBtn.id = 'admin-navbar-btn';
            adminBtn.href = '/admin.html';
            adminBtn.setAttribute('aria-label', 'Admin Panel');
            adminBtn.className = 'flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors';
            adminBtn.title = 'Admin Panel';
            adminBtn.innerHTML = '<span class="material-symbols-outlined text-2xl">admin_panel_settings</span>';
            rightSection.appendChild(adminBtn);

            // Language selector
            const langWrapper = document.createElement('div');
            langWrapper.className = 'flex items-center ml-2';
            const langSelect = document.createElement('select');
            langSelect.id = 'site-lang-select';
            langSelect.className = 'p-2 border border-outline-variant bg-surface-container-low text-sm rounded';
            langSelect.innerHTML = '<option value="en">English</option><option value="ar">العربية</option>';
            langWrapper.appendChild(langSelect);
            rightSection.appendChild(langWrapper);

            function getSiteLang() { return localStorage.getItem('site_lang') || 'en'; }
            function applySiteLang(lang) {
                localStorage.setItem('site_lang', lang);
                document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
                document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
                const symbol = lang === 'ar' ? 'ر.س' : '$';
                document.documentElement.style.setProperty('--currency-symbol', symbol);
                // adjust nav labels for simple cases (only pages)
                // Rebuild nav with same active page to refresh labels if needed
                existingNav.innerHTML = buildDesktopNav(activePage);
            }
            langSelect.value = getSiteLang();
            langSelect.addEventListener('change', (e) => applySiteLang(e.target.value));
            // apply immediately
            applySiteLang(getSiteLang());
        }

        // Inject mobile drawer if not present
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
                    <nav class="flex-1 overflow-y-auto py-2">
                        ${buildMobileNav(activePage)}
                    </nav>
                    <div class="p-4 border-t border-outline-variant">
                        <a href="contact.html" class="block bg-primary text-on-primary font-bold text-center py-3 uppercase text-sm hover:bg-primary-container transition-all">Contact Us</a>
                    </div>
                </div>`;
            document.body.appendChild(drawer);

            // Wire up mobile nav events
            const btn = document.getElementById('mobile-menu-btn');
            const overlay = document.getElementById('mobile-nav-overlay');
            const panel = document.getElementById('mobile-nav-panel');
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

            if (btn) btn.addEventListener('click', openDrawer);
            if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
            if (overlay) overlay.addEventListener('click', closeDrawer);
        }
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectNavbar);
    } else {
        injectNavbar();
    }
})();
