import { getPrice, formatPrice } from './utils.js';

let activeImageModal = null;

export function createGloveRow(productId, product, sizes, isSenior, currentCurrency) {
    const row = document.createElement('tr');
    const mocPrice = getPrice(product.prices, false, currentCurrency);
    const vocPrice = getPrice(product.prices, true, currentCurrency);

    // Získání URL prvního obrázku
    const imageUrl = product.images && Object.values(product.images)[0];

    const sizeColumns = sizes.map(size => {
        if ((isSenior && parseFloat(size) < 7) || (!isSenior && parseFloat(size) >= 7)) {
            return '';
        }
        let variantQuantity = 0;
        if (product.variants) {
            for (const variant of Object.values(product.variants)) {
                const variantSize = variant.name.split(' ').pop().replace(',', '.');
                if (variantSize === size) {
                    variantQuantity = Object.values(variant.stock)[0] || 0;
                    break;
                }
            }
        }
        const savedQuantity = parseInt(localStorage.getItem(`order_${productId}_${size}`)) || 0;
        const isInStock = variantQuantity > 0;
        return `
            <td class="px-1 py-2 whitespace-nowrap text-center size-column" style="min-width: 80px; width: 80px;">
                <div class="flex flex-col items-center ${isInStock ? 'bg-green-100' : ''}">
                    <span class="text-xs ${isInStock ? 'font-semibold text-gray-900' : 'text-gray-500'}">${variantQuantity}</span>
                    ${isInStock ? `
                        <input type="number" min="0" value="${savedQuantity}" data-product-id="${productId}" data-size="${size}" data-price="${vocPrice}" max="${variantQuantity}"
                        class="mt-1 block w-16 text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    ` : ''}
                </div>
            </td>`;
    }).join('');

    const totalInStock = sizes.reduce((total, size) => {
        if (product.variants) {
            for (const variant of Object.values(product.variants)) {
                const variantSize = variant.name.split(' ').pop().replace(',', '.');
                if (variantSize === size) {
                    return total + (Object.values(variant.stock)[0] || 0);
                }
            }
        }
        return total;
    }, 0);

    const totalOrdered = sizes.reduce((total, size) => {
        return total + (parseInt(localStorage.getItem(`order_${productId}_${size}`)) || 0);
    }, 0);

    row.innerHTML = `
        <td class="px-2 py-2 whitespace-nowrap sticky-column" style="left: 0; z-index: 10; min-width: 200px;">
            <div class="text-sm font-medium text-gray-900 product-name" data-product-id="${productId}" data-image-url="${imageUrl || ''}">
                ${product.text_fields.name || ''}
            </div>
            <div class="text-xs text-gray-500">VOC: ${formatPrice(vocPrice, currentCurrency)} bez DPH</div>
            <div class="text-xs text-gray-500">MOC: ${formatPrice(mocPrice, currentCurrency)} s DPH</div>
        </td>
        <td class="px-2 py-2 whitespace-nowrap text-center" style="min-width: 60px;">
            <span class="text-xs text-gray-500">${totalInStock}</span>
        </td>
        <td class="px-2 py-2 whitespace-nowrap text-center border-r border-gray-200" style="min-width: 60px;">
            <span class="text-xs text-gray-500">${totalOrdered}</span>
        </td>
        ${sizeColumns}
    `;
    return row;
}

export function populateTableHeader(tableId, sizes) {
    const headerRow = document.querySelector(`#${tableId} thead tr`);
    headerRow.innerHTML = `
        <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky-header sticky-column" style="left: 0; z-index: 20; min-width: 200px;">Produkt</th>
        <th scope="col" class="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider sticky-header" style="min-width: 60px;">Skladem</th>
        <th scope="col" class="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider sticky-header border-r border-gray-200" style="min-width: 60px;">Objednáno</th>
        ${sizes.map(size => `
            <th scope="col" class="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider size-column sticky-header" style="min-width: 80px; width: 80px;">${size}</th>
        `).join('')}
    `;
}

export function showProductImage(event) {
    const imageUrl = event.target.dataset.imageUrl;
    if (!imageUrl || imageUrl === 'undefined' || imageUrl === '') return;

    const imageModal = document.createElement('div');
    imageModal.className = 'product-image-modal';
    imageModal.style.position = 'fixed';
    imageModal.style.zIndex = '1000';
    imageModal.style.background = 'white';
    imageModal.style.padding = '10px';
    imageModal.style.border = '1px solid #ccc';
    imageModal.style.borderRadius = '5px';
    imageModal.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = '200px';
    img.style.maxHeight = '200px';

    imageModal.appendChild(img);
    document.body.appendChild(imageModal);

    activeImageModal = imageModal;
    updateImagePosition(event);
}

export function hideProductImage() {
    if (activeImageModal) {
        activeImageModal.remove();
        activeImageModal = null;
    }
}

function updateImagePosition(event) {
    if (activeImageModal) {
        activeImageModal.style.left = `${event.pageX + 20}px`;
        activeImageModal.style.top = `${event.pageY + 20}px`;
    }
}

// Přidejte tento globální event listener
document.addEventListener('mousemove', updateImagePosition);

export function showOrderResult(success, message) {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const confirmButton = document.getElementById('confirmOrder');
    const cancelButton = document.getElementById('cancelOrder');

    // Set the title based on success or failure
    modalTitle.textContent = success ? 'Objednávka úspěšně odeslána' : 'Chyba při odesílání objednávky';

    // Update the content of the modal
    modalContent.innerHTML = `
        <div class="text-center">
            ${success 
                ? '<svg class="w-24 h-24 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                : '<svg class="w-24 h-24 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
            }
            <p class="mt-4 text-lg ${success ? 'text-green-700' : 'text-red-700'}">${message}</p>
        </div>
        ${success ? `
            <div class="mt-6">
                <a href="https://www.bu1sport.com" class="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Přejít na oficiální stránky BU1
                </a>
            </div>
        ` : ''}
    `;

    // Hide the confirm button and update cancel button text
    confirmButton.style.display = 'none';
    cancelButton.textContent = 'Zavřít';
}