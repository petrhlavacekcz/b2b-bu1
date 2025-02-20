import { formatPrice } from "./utils.js";
import { updateOrderSummary } from "./orderHandling.js";

export function updateCartBadge(quantity) {
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        cartBadge.textContent = quantity;
        cartBadge.style.display = quantity > 0 ? 'block' : 'none';
    }
}

export function updateCartItems(products, currentCurrency) {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;

    cartItems.innerHTML = products.map(product => `
        <tr class="hover:bg-gray-50">
            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">${product.productName}</td>
            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">${product.size}</td>
            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${product.quantity}</td>
            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${formatPrice(product.price * product.quantity, currentCurrency)}</td>
            <td class="px-3 py-2 whitespace-nowrap text-right">
                <button 
                    class="text-gray-400 hover:text-red-500"
                    onclick="removeFromCart('${product.productId}', '${product.size}')"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    // Add the removeFromCart function to window scope
    window.removeFromCart = (productId, size) => {
        const input = document.querySelector(`input[data-product-id="${productId}"][data-variant="${size}"]`);
        if (input) {
            input.value = 0;
            input.dispatchEvent(new Event('change'));
            localStorage.removeItem(`order_${productId}_${size}`);
            updateOrderSummary(currentCurrency);
        }
    };
}

export function initializeCart() {
    const cartButton = document.getElementById('cartButton');
    const closeCartButton = document.getElementById('closeCartButton');
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    const previewOrderBtn = document.getElementById('previewOrderBtn');

    if (!cartButton || !closeCartButton || !cartPanel || !cartOverlay) {
        console.error('Cart elements not found');
        return;
    }

    // Open cart
    cartButton.addEventListener('click', () => {
        cartPanel.classList.add('open');
        cartOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    // Close cart
    const closeCart = () => {
        cartPanel.classList.remove('open');
        cartOverlay.classList.remove('open');
        document.body.style.overflow = '';
    };

    closeCartButton.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Close cart on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
        }
    });

    // Preview order button
    if (previewOrderBtn) {
        previewOrderBtn.addEventListener('click', () => {
            closeCart(); // Close the cart panel first
            const orderModal = document.getElementById('orderModal');
            if (orderModal) {
                orderModal.style.display = 'flex';
                showOrderPreview(); // Call the showOrderPreview function from main.js
            }
        });
    }
} 