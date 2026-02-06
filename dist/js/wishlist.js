/**
 * WISHLIST.JS - Wishlist Management System
 * Creative Merch UK
 */

function getWishlist() {
    const wishlist = localStorage.getItem('wishlist');
    return wishlist ? JSON.parse(wishlist) : [];
}

function saveWishlist(wishlist) {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    window.dispatchEvent(new Event('wishlistUpdated'));
}

function toggleWishlist(product) {
    let wishlist = getWishlist();
    const index = wishlist.findIndex(item => item.id === product.id);

    if (index === -1) {
        // Add to wishlist
        wishlist.push(product);
        showWishlistToast('Added to wishlist');
    } else {
        // Remove from wishlist
        wishlist.splice(index, 1);
        showWishlistToast('Removed from wishlist');
    }

    saveWishlist(wishlist);
}

function isInWishlist(productId) {
    const wishlist = getWishlist();
    return wishlist.some(item => item.id === productId);
}

function updateWishlistUI() {
    const count = getWishlist().length;
    const badges = document.querySelectorAll('.badge-wishlist');
    badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    });

    // Update heart icons on product cards
    const heartBtns = document.querySelectorAll('.wishlist-btn');
    heartBtns.forEach(btn => {
        const productId = btn.getAttribute('data-id');
        if (isInWishlist(productId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function showWishlistToast(message) {
    // Simple toast or alert for feedback
    console.log(message);
}

// Global exposure
window.getWishlist = getWishlist;
window.toggleWishlist = toggleWishlist;
window.isInWishlist = isInWishlist;
window.updateWishlistUI = updateWishlistUI;

document.addEventListener('DOMContentLoaded', () => {
    updateWishlistUI();

    // Listen for component loading to update badges in nav
    document.addEventListener('allComponentsLoaded', updateWishlistUI);
});
