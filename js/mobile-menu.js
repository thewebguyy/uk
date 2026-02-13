/**
 * MOBILE MENU & DESKTOP NAVIGATION CONTROLLER
 * Redesign for Creative Merch UK
 */

class MobileMenuController {
    constructor() {
        this.overlay = document.getElementById('mobileMenuOverlay');
        this.toggleBtn = document.getElementById('mobileMenuToggle');
        this.closeBtn = document.getElementById('mobileMenuClose');
        this.content = document.querySelector('.mobile-menu-content');
        this.views = document.querySelectorAll('.mobile-menu-view');
        this.history = ['main'];
        this.isTransitioning = false;

        if (this.overlay) {
            this.init();
        }
    }

    init() {
        // Toggle Open
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.open());
        }

        // Close
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // View Navigation
        document.addEventListener('click', (e) => {
            const submenuBtn = e.target.closest('[data-submenu]');
            const backBtn = e.target.closest('[data-back]');
            const regularLink = e.target.closest('.mobile-menu-item:not([data-submenu])');

            if (submenuBtn && this.overlay.classList.contains('active')) {
                e.preventDefault();
                const targetView = submenuBtn.getAttribute('data-submenu');
                this.navigateTo(targetView);
            }

            if (backBtn && this.overlay.classList.contains('active')) {
                e.preventDefault();
                this.goBack();
            }

            if (regularLink && this.overlay.classList.contains('active')) {
                // Regular link tapped, close menu after slight delay
                setTimeout(() => this.close(), 300);
            }
        });
    }

    open() {
        this.overlay.style.display = 'flex';
        // Force reflow
        this.overlay.offsetHeight;
        this.overlay.classList.add('active');
        document.body.classList.add('mobile-menu-open');
        this.resetToMain();
    }

    close() {
        this.overlay.classList.remove('active');
        document.body.classList.remove('mobile-menu-open');
        setTimeout(() => {
            if (!this.overlay.classList.contains('active')) {
                this.overlay.style.display = 'none';
            }
        }, 300);
    }

    navigateTo(viewName) {
        if (this.isTransitioning) return;

        const currentViewName = this.history[this.history.length - 1];
        const currentEl = this.overlay.querySelector(`[data-view="${currentViewName}"]`);
        const nextEl = this.overlay.querySelector(`[data-view="${viewName}"]`);

        if (!nextEl) return;

        this.isTransitioning = true;
        this.history.push(viewName);

        // Prep next view
        nextEl.style.visibility = 'visible';
        nextEl.classList.add('active');

        // Start animation
        currentEl.classList.add('sliding-out');

        setTimeout(() => {
            currentEl.classList.remove('active', 'sliding-out', 'sliding-in-back');
            this.isTransitioning = false;
        }, 300);
    }

    goBack() {
        if (this.isTransitioning || this.history.length <= 1) return;

        const currentViewName = this.history.pop();
        const prevViewName = this.history[this.history.length - 1];

        const currentEl = this.overlay.querySelector(`[data-view="${currentViewName}"]`);
        const prevEl = this.overlay.querySelector(`[data-view="${prevViewName}"]`);

        if (!prevEl) return;

        this.isTransitioning = true;

        // Prep previous view
        prevEl.classList.add('active', 'sliding-in-back');

        // Let it render
        prevEl.offsetHeight;

        // Current slides out to right
        currentEl.style.transform = 'translateX(100%)';
        currentEl.style.opacity = '0';

        // Previous slides in from left
        prevEl.classList.remove('sliding-in-back');

        setTimeout(() => {
            currentEl.classList.remove('active');
            currentEl.style.transform = '';
            currentEl.style.opacity = '';
            this.isTransitioning = false;
        }, 300);
    }

    resetToMain() {
        this.history = ['main'];
        this.views.forEach(view => {
            view.classList.remove('active', 'sliding-out', 'sliding-in-back');
            view.style.transform = '';
            view.style.opacity = '';
            if (view.getAttribute('data-view') === 'main') {
                view.classList.add('active');
            }
        });
    }
}

class DesktopNavController {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.main-nav .nav-link');
            if (navLink && window.innerWidth >= 992) {
                // If it has a href="#" or its parent is a mega-menu, prevent navigation
                // Actually client says "Clicking nav link should NOT navigate"
                const href = navLink.getAttribute('href');
                if (href === '#' || navLink.closest('.mega-menu')) {
                    e.preventDefault();
                }
            }
        });
    }
}

// Initialize when components are loaded
document.addEventListener('allComponentsLoaded', () => {
    window.mobileMenu = new MobileMenuController();
    window.desktopNav = new DesktopNavController();
});

// Fallback in case they are already there
if (document.getElementById('mobileMenuOverlay')) {
    window.mobileMenu = new MobileMenuController();
    window.desktopNav = new DesktopNavController();
}
