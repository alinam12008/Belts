// i18n.js – translation engine
(function() {
    'use strict';

    let currentLang = localStorage.getItem('site_lang') || 'en';
    let translations = {};
    let isLoaded = false;

    // ── Load translations from API ──
    function loadTranslations(lang) {
        return fetch(`/api/language/${lang}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load translations');
                return res.json();
            })
            .then(data => {
                translations = data;
                currentLang = lang;
                localStorage.setItem('site_lang', lang);
                applyTranslations();
                document.documentElement.lang = lang;
                document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
                document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
                isLoaded = true;
                // Update language selector if exists
                const select = document.getElementById('site-lang-select');
                if (select) select.value = lang;
            })
            .catch(err => {
                console.warn('Failed to load translations, using keys.', err);
                // Keep existing translations or use keys
            });
    }

    // ── Apply translations to all elements with data-i18n ──
    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = translations[key];
            if (val !== undefined) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.placeholder !== undefined) el.placeholder = val;
                    else el.value = val;
                } else if (el.tagName === 'SELECT') {
                    // skip for selects (we manage options separately)
                } else {
                    el.textContent = val;
                }
            }
        });
        // attributes (title, alt, etc.)
        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            try {
                const attrs = JSON.parse(el.getAttribute('data-i18n-attr'));
                for (const [attr, key] of Object.entries(attrs)) {
                    if (translations[key] !== undefined) {
                        el.setAttribute(attr, translations[key]);
                    }
                }
            } catch (e) {}
        });
        // Also update the language selector if exists
        const select = document.getElementById('site-lang-select');
        if (select) select.value = currentLang;
    }

    // ── Public API ──
    window.i18n = {
        currentLang: () => currentLang,
        setLang: loadTranslations,
        t: (key) => translations[key] || key,
        isLoaded: () => isLoaded,
        init: () => {
            return loadTranslations(currentLang);
        }
    };
})();