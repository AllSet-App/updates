/* AllSet Landing Logic */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    updateDownloadLinks();
    initScrollAnimations();
});

/* --- Theme System --- */
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Check saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = html.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
}

/* --- Mobile Menu (Bulletproof SVG) --- */
function initMobileMenu() {
    const btn = document.getElementById('mobile-toggle');
    const menu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('icon-menu');
    const closeIcon = document.getElementById('icon-close');

    if (!btn || !menu) return;

    // Toggle Function
    const toggleMenu = () => {
        const isOpen = menu.classList.toggle('is-open');

        // Manual SVG Toggle
        if (isOpen) {
            if (menuIcon) menuIcon.style.display = 'none';
            if (closeIcon) closeIcon.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Lock scroll
        } else {
            if (menuIcon) menuIcon.style.display = 'block';
            if (closeIcon) closeIcon.style.display = 'none';
            document.body.style.overflow = ''; // Unlock scroll
        }
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Close on Link Click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (menu.classList.contains('is-open')) toggleMenu();
        });
    });

    // Close on Outside Click
    document.addEventListener('click', (e) => {
        if (menu.classList.contains('is-open') && !menu.contains(e.target) && !btn.contains(e.target)) {
            toggleMenu();
        }
    });
}

/* --- Dynamic Links --- */
function updateDownloadLinks() {
    const winBtns = document.querySelectorAll('.btn-download-win');
    const androidBtns = document.querySelectorAll('.btn-download-android');
    const versionBadges = document.querySelectorAll('.version-text');

    winBtns.forEach(btn => btn.href = CONFIG.exeLink);
    androidBtns.forEach(btn => btn.href = CONFIG.apkLink);
    versionBadges.forEach(badge => badge.textContent = `v${CONFIG.version}`);
}

/* --- Scroll Animations --- */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}
