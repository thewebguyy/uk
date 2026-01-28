/**
 * Component Loader - Load HTML components dynamically
 * Modern replacement for repeated code across pages
 */

class ComponentLoader {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Load a component from external HTML file
     * @param {string} elementId - ID of element where component will be inserted
     * @param {string} componentPath - Path to component HTML file
     */
    async load(elementId, componentPath) {
        try {
            // Check cache first
            let html;
            if (this.cache.has(componentPath)) {
                html = this.cache.get(componentPath);
            } else {
                // Fetch component
                const response = await fetch(componentPath);
                if (!response.ok) {
                    throw new Error(`Failed to load component: ${componentPath}`);
                }
                html = await response.text();

                // Cache for future use
                this.cache.set(componentPath, html);
            }

            // Insert into DOM
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = html;

                // Highlight active link if it's the navigation component
                if (elementId === 'navigation') {
                    this.highlightActiveLink(element);
                }

                // Trigger custom event for component loaded
                element.dispatchEvent(new CustomEvent('componentLoaded', {
                    detail: { componentPath }
                }));
            } else {
                console.error(`Element with ID "${elementId}" not found`);
            }
        } catch (error) {
            console.error('Component loading error:', error);
        }
    }

    /**
     * Highlight the active link in the navigation based on current URL
     * @param {HTMLElement} navElement 
     */
    highlightActiveLink(navElement) {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const links = navElement.querySelectorAll('a');

        links.forEach(link => {
            const linkPath = link.getAttribute('href');
            // Remove leading slash if present for comparison
            const normalizedLinkPath = linkPath ? linkPath.split('/').pop() : '';

            if (normalizedLinkPath === currentPath) {
                link.classList.add('active');
                // If it's in a dropdown, also highlight the parent
                const parentDropdown = link.closest('.dropdown');
                if (parentDropdown) {
                    const toggle = parentDropdown.querySelector('.dropdown-toggle');
                    if (toggle) toggle.classList.add('active');
                }
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Load multiple components at once
     * @param {Array} components - Array of {id, path} objects
     */
    async loadMultiple(components) {
        const promises = components.map(comp =>
            this.load(comp.id, comp.path)
        );
        return Promise.all(promises);
    }

    /**
     * Clear cache (useful for development)
     */
    clearCache() {
        this.cache.clear();
    }
}

// Create global instance
window.componentLoader = new ComponentLoader();

/**
 * Convenience function for loading components
 */
window.loadComponent = (id, path) => {
    return window.componentLoader.load(id, path);
};

/**
 * Load multiple components
 */
window.loadComponents = (components) => {
    return window.componentLoader.loadMultiple(components);
};

/**
 * Auto-load components on page load
 * Looks for data-component attributes
 */
document.addEventListener('DOMContentLoaded', async () => {
    const elements = document.querySelectorAll('[data-component]');

    const components = Array.from(elements).map(el => ({
        id: el.id,
        path: el.getAttribute('data-component')
    }));

    if (components.length > 0) {
        await window.loadComponents(components);

        // Re-initialize Bootstrap components after loading
        if (typeof bootstrap !== 'undefined') {
            // Re-initialize dropdowns
            const dropdowns = document.querySelectorAll('[data-bs-toggle="dropdown"]');
            dropdowns.forEach(dropdown => {
                // First dispose existing if any (though unlikely on first load)
                const existing = bootstrap.Dropdown.getInstance(dropdown);
                if (existing) existing.dispose();
                new bootstrap.Dropdown(dropdown);
            });

            // Re-initialize offcanvas
            const offcanvasElements = document.querySelectorAll('[data-bs-toggle="offcanvas"]');
            offcanvasElements.forEach(trigger => {
                const targetId = trigger.getAttribute('data-bs-target');
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    const existing = bootstrap.Offcanvas.getInstance(targetEl);
                    if (existing) existing.dispose();
                    new bootstrap.Offcanvas(targetEl);
                }
            });
        }

        // Custom: Trigger a globally accessible event that components are ready
        document.dispatchEvent(new CustomEvent('allComponentsLoaded'));
    }
});
