/**
 * products-data.js — Belts Store Product Data Module
 * Loads products_data.json and exposes BeltsStore query API globally.
 *
 * Data Model per product:
 * {
 *   id: String (url-slug),
 *   category: String,
 *   subcategory: String|null,
 *   productName: String,
 *   description: String (plain text),
 *   rawDescription: String (HTML),
 *   specifications: Object,
 *   images: String[],
 *   relatedProducts: String[],
 * }
 */

(function () {
    'use strict';

    let _products = [];
    let _loaded = false;
    let _loadPromise = null;

    /* ── Utility helpers ─────────────────────────────────────── */

    function slugify(str) {
        return (str || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function stripHtml(html) {
        if (!html) return '';
        return html
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&#8243;/g, '"')
            .replace(/&#8220;/g, '\u201C')
            .replace(/&#8221;/g, '\u201D')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    function normalize(raw, index) {
        const slug = slugify(raw.title);
        return {
            id: slug || ('product-' + index),
            category: (raw.breadcrumbs && raw.breadcrumbs[0]) || 'General',
            subcategory: (raw.breadcrumbs && raw.breadcrumbs[1]) || null,
            productName: raw.title || 'Unnamed Product',
            description: stripHtml(raw.short_description),
            rawDescription: raw.short_description || '',
            fullDescription: raw.full_description || '',
            specifications: raw.specs || {},
            images: raw.image ? [raw.image] : [],
            relatedProducts: raw.related || [],
            sourceUrl: raw.url || '',
        };
    }

    /* ── Load ──────────────────────────────────────────────────── */

    async function loadProducts() {
        if (_loaded) return _products;
        if (_loadPromise) return _loadPromise;

        _loadPromise = fetch('products_data.json')
            .then(r => r.json())
            .then(raw => {
                _products = raw.map(normalize);
                _loaded = true;
                return _products;
            })
            .catch(err => {
                console.error('[BeltsStore] Failed to load products_data.json:', err);
                _products = [];
                _loaded = true;
                return _products;
            });

        return _loadPromise;
    }

    /* ── Query API ──────────────────────────────────────────────── */

    /**
     * Returns { categoryName: [subcategoryName, ...], ... }
     */
    function getCategories() {
        const map = {};
        _products.forEach(p => {
            if (!map[p.category]) map[p.category] = [];
            if (p.subcategory && !map[p.category].includes(p.subcategory)) {
                map[p.category].push(p.subcategory);
            }
        });
        return map;
    }

    /**
     * Get a single product by its id slug.
     */
    function getProductById(id) {
        return _products.find(p => p.id === id) || null;
    }

    /**
     * Filter products by category and optionally subcategory.
     * Case-insensitive matching.
     */
    function getProductsByCategory(category, subcategory) {
        const cat = (category || '').toLowerCase();
        const sub = (subcategory || '').toLowerCase();
        return _products.filter(p => {
            const catMatch = p.category.toLowerCase() === cat;
            if (!cat) return true;
            if (!catMatch) return false;
            if (sub) return (p.subcategory || '').toLowerCase() === sub;
            return true;
        });
    }

    /**
     * Full-text search across name, description, category.
     */
    function searchProducts(query) {
        if (!query) return _products;
        const q = query.toLowerCase().trim();
        return _products.filter(p =>
            p.productName.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.subcategory || '').toLowerCase().includes(q)
        );
    }

    /**
     * Get related products (same category, different id), limited.
     */
    function getRelatedProducts(product, limit) {
        limit = limit || 4;
        return _products
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, limit);
    }

    /**
     * Get a random selection of products for the homepage featured section.
     */
    function getFeaturedProducts(limit) {
        limit = limit || 6;
        const shuffled = _products.slice().sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);
    }

    /* ── Ordered category list (matches reference site order) ─── */
    const CATEGORY_ORDER = [
        'Belts Power Transmission',
        'Pulleys',
        'Conveying Accessorise',
        'Rubber',
        'Industrial Insulation',
        'Bearings',
        'Transmission Chains And Sprockets',
    ];

    const CATEGORY_SUBCATEGORIES = {
        'Belts Power Transmission': ['V Belts', 'Round Belts', 'Ribbed Belts', 'Timing Belts', 'Special Belts', 'Repair Kits and Tension Tools'],
        'Bearings': ['Radial Ball Bearings', 'Radial Roller Bearings', 'Thrust Ball Bearings', 'Bearing Units and Plummer Block Housing'],
        'Transmission Chains And Sprockets': ['Transmission chain', 'Couplings', 'Sprockets'],
    };

    const CATEGORY_ICONS = {
        'Belts Power Transmission': 'settings_input_component',
        'Pulleys': 'settings_backup_restore',
        'Conveying Accessorise': 'conveyor_belt',
        'Rubber': 'opacity',
        'Industrial Insulation': 'heat_pump',
        'Bearings': 'radio_button_checked',
        'Transmission Chains And Sprockets': 'link',
    };

    const CATEGORY_LABELS = {
        'Belts Power Transmission': 'Belt Power Transmission',
        'Pulleys': 'Pulleys',
        'Conveying Accessorise': 'Conveying Accessories',
        'Rubber': 'Rubber',
        'Industrial Insulation': 'Industrial Insulation',
        'Bearings': 'Bearings',
        'Transmission Chains And Sprockets': 'Transmission Chains & Sprockets',
    };

    /* ── Expose global API ────────────────────────────────────── */
    window.BeltsStore = {
        loadProducts,
        getCategories,
        getProductById,
        getProductsByCategory,
        searchProducts,
        getRelatedProducts,
        getFeaturedProducts,
        CATEGORY_ORDER,
        CATEGORY_SUBCATEGORIES,
        CATEGORY_ICONS,
        CATEGORY_LABELS,
        get products() { return _products; },
    };
})();
