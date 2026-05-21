/**
 * Evocore Tech - Dynamic Content Loader
 * Fetches services, products, and other content from the API
 * and dynamically renders them on the frontend pages.
 */

const API_BASE = '/api';

// Utility functions
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;'
    }[c]));
}

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/**
 * Fetch services from API and render on services page
 */
async function loadServices() {
    const grid = $('.services-grid');
    if (!grid) return;

    try {
        const res = await fetch(API_BASE + '/services');
        const { data } = await res.json();

        if (data.length === 0) return; // Keep static content as fallback

        // Clear grid and rebuild with dynamic content
        grid.innerHTML = '';

        data.forEach((service, index) => {
            const isFeatured = index === 0;
            const card = document.createElement('div');
            card.className = `service-card${isFeatured ? ' featured' : ''}`;
            card.id = service.slug;

            const tagsHtml = (service.tags || []).slice(0, 4).map(tag =>
                `<span class="tag">${esc(tag)}</span>`
            ).join('');

            const featuresHtml = (service.features || []).slice(0, 4).map(f =>
                `<span class="tag">${esc(f)}</span>`
            ).join('');

            card.innerHTML = `
                <div class="${isFeatured ? 'featured-content' : ''}">
                    <h3 class="card-title">${esc(service.title)}</h3>
                    <p class="card-desc">${esc(service.short_description || service.description || '')}</p>
                    <div class="card-tags">
                        ${tagsHtml || featuresHtml}
                    </div>
                    <a href="contact.html" class="card-link">Get a quote</a>
                </div>
                ${service.image && isFeatured ? `<img src="${esc(service.image)}" alt="${esc(service.title)}" class="featured-img">` : ''}
            `;

            grid.appendChild(card);
        });

        // Update page meta for SEO
        if (data.length > 0) {
            const serviceNames = data.slice(0, 4).map(s => s.title).join(', ');
            updateMeta('description', `Explore Evocore Tech's services: ${serviceNames} and more. Professional tech solutions for Kenyan SMEs.`);
        }

    } catch (err) {
        console.error('Failed to load services:', err);
    }
}

/**
 * Fetch products from API and render on products page
 */
async function loadProducts() {
    const grid = $('.products-grid');
    if (!grid) return;

    try {
        const res = await fetch(API_BASE + '/products');
        const { data } = await res.json();

        if (data.length === 0) return; // Keep static content as fallback

        grid.innerHTML = '';

        data.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const featuresHtml = (product.features || []).slice(0, 3).map(f =>
                `<span class="ptag">${esc(f)}</span>`
            ).join('');

            card.innerHTML = `
                <div class="product-image">
                    ${product.image ? `<img src="${esc(product.image)}" alt="${esc(product.name)}">` : '<div class="product-placeholder"></div>'}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${esc(product.name)}</h3>
                    <p class="product-desc">${esc(product.short_description || '')}</p>
                    <div class="product-tags">${featuresHtml}</div>
                    <div class="product-price">${esc(product.price || 'Contact for pricing')}</div>
                    <a href="contact.html?product=${esc(product.slug)}" class="btn-primary">Get a quote</a>
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Failed to load products:', err);
    }
}

/**
 * Update meta tags for SEO
 */
function updateMeta(name, content) {
    let meta = $(`meta[name="${name}"]`);
    if (meta) {
        meta.setAttribute('content', content);
    } else {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }
}

/**
 * Load company info for footer/about page
 */
async function loadCompanyInfo() {
    const yearEl = $('#current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

/**
 * Initialize page-specific content
 */
document.addEventListener('DOMContentLoaded', () => {
    // Load company info on all pages
    loadCompanyInfo();

    // Determine which page we're on and load appropriate content
    const path = window.location.pathname;

    if (path.includes('services.html') || path.endsWith('/services')) {
        loadServices();
    } else if (path.includes('products.html') || path.endsWith('/products')) {
        loadProducts();
    } else if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        // Home page - load both services and products preview
        loadServices();
        loadProducts();
    }
});

// Export for use in other scripts
window.EvocoreApp = {
    loadServices,
    loadProducts,
    updateMeta
};