import { getPrice, formatPrice } from "./utils.js";

let activeImageModal = null;

export function createRow(
    productId,
    product,
    variants,
    currentCurrency,
) {
    const row = document.createElement("tr");
    const mocPrice = getPrice(product.prices, false, currentCurrency);
    const vocPrice = getPrice(product.prices, true, currentCurrency);

    const imageUrl = product.images && Object.values(product.images)[0];
    const isVariantProduct = Object.keys(product.variants || {}).length > 0;

    // Get total stock directly from the product's stock field
    const totalInStock = Object.values(product.stock)[0] || 0;

    let variantColumns = '';
    if (isVariantProduct) {
        variantColumns = variants
            .map((variant) => {
                const variantMatch = Object.entries(product.variants).find(
                    ([, v]) => v.name === variant.toString(),
                );
                if (!variantMatch) return '<td class="px-1 py-2 whitespace-nowrap text-center size-column" style="min-width: 80px; width: 80px;"></td>';

                const [variantId, variantData] = variantMatch;
                const variantQuantity = Object.values(variantData.stock)[0] || 0;
                const savedQuantity =
                    parseInt(localStorage.getItem(`order_${productId}_${variant}`)) ||
                    0;
                const isInStock = variantQuantity > 0;

                return `
                <td class="px-1 py-2 whitespace-nowrap text-center size-column" style="min-width: 80px; width: 80px;">
                    <div class="flex flex-col items-center ${isInStock ? "bg-green-100" : ""}">
                        <span class="text-xs ${isInStock ? "font-semibold text-gray-900" : "text-gray-500"}">${variantQuantity}</span>
                        ${
                            isInStock
                                ? `
                            <input type="number" min="0" value="${savedQuantity}" 
                            data-product-id="${productId}" 
                            data-variant="${variant}" 
                            data-price="${getPrice(variantData.prices, true, currentCurrency)}" 
                            data-variant-id="${variantId}"
                            data-sku="${variantData.sku}"
                            data-ean="${variantData.ean}"
                            max="${variantQuantity}"
                            class="mt-1 block w-16 text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        `
                                : ""
                        }
                    </div>
                </td>`;
            })
            .join("");
    } else {
        // Non-variant product
        const quantity = Object.values(product.stock)[0] || 0;
        const savedQuantity = parseInt(localStorage.getItem(`order_${productId}`)) || 0;
        const isInStock = quantity > 0;

        variantColumns = `
            <td class="px-1 py-2 whitespace-nowrap text-center" style="min-width: 80px;">
                <div class="flex flex-col items-center ${isInStock ? "bg-green-100" : ""}">
                    <span class="text-xs ${isInStock ? "font-semibold text-gray-900" : "text-gray-500"}">${quantity}</span>
                    ${
                        isInStock
                            ? `
                        <input type="number" min="0" value="${savedQuantity}" 
                        data-product-id="${productId}" 
                        data-variant="single"
                        data-price="${vocPrice}" 
                        data-sku="${product.sku}"
                        data-ean="${product.ean}"
                        max="${quantity}"
                        class="mt-1 block w-16 text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    `
                            : ""
                    }
                </div>
            </td>`;
    }

    const totalOrdered = isVariantProduct
        ? variants.reduce((total, variant) => {
            return total + (parseInt(localStorage.getItem(`order_${productId}_${variant}`)) || 0);
        }, 0)
        : parseInt(localStorage.getItem(`order_${productId}`)) || 0;

    row.innerHTML = `
        <td class="px-2 py-2 whitespace-nowrap sticky-column" style="left: 0; z-index: 10; min-width: 200px;">
            <div class="flex items-center">
                <div class="text-sm font-medium text-gray-900 mr-2">${product.text_fields.name || ""}</div>
                ${
                    imageUrl
                        ? `
                    <button class="product-image-button" data-product-id="${productId}" data-image-url="${imageUrl}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                `
                        : ""
                }
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
        ${variantColumns}
    `;
    return row;
}

export function populateTableHeader(tableId, variants) {
    const headerRow = document.querySelector(`#${tableId} thead tr`);
    headerRow.innerHTML = `
        <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky-header sticky-column" style="left: 0; z-index: 20; min-width: 200px;">Produkt</th>
        <th scope="col" class="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider sticky-header" style="min-width: 60px;">Skladem</th>
        <th scope="col" class="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider sticky-header border-r border-gray-200" style="min-width: 60px;">Objednáno</th>
        ${variants
            .map((variant) => {
                const isNonVariant = variant === 'single';
                return `
                    <th scope="col" class="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider size-column sticky-header" style="min-width: 80px; width: 80px;">
                        ${isNonVariant ? 
                            `<svg class="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                            </svg>` 
                            : variant}
                    </th>
                `;
            })
            .join("")}
    `;
}

export function showProductImage(event) {
    const button = event.currentTarget;
    const imageUrl = button.dataset.imageUrl;
    if (!imageUrl || imageUrl === "undefined" || imageUrl === "") return;

    if (activeImageModal) {
        hideProductImage();
    }

    const imageModal = document.createElement("div");
    imageModal.className = "product-image-modal";
    imageModal.style.position = "fixed";
    imageModal.style.zIndex = "1000";
    imageModal.style.background = "white";
    imageModal.style.padding = "10px";
    imageModal.style.border = "1px solid #ccc";
    imageModal.style.borderRadius = "5px";
    imageModal.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";

    const img = document.createElement("img");
    img.src = imageUrl;
    img.style.maxWidth = "200px";
    img.style.maxHeight = "200px";

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
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        activeImageModal.style.left = `${rect.right + 10}px`;
        activeImageModal.style.top = `${rect.top}px`;
    }
}

export function showOrderResult(success, message) {
    const modalTitle = document.getElementById("modalTitle");
    const modalContent = document.getElementById("modalContent");
    const confirmButton = document.getElementById("confirmOrder");
    const cancelButton = document.getElementById("cancelOrder");

    modalTitle.textContent = success
        ? "Objednávka úspěšně odeslána"
        : "Chyba při odesílání objednávky";

    modalContent.innerHTML = `
        <div class="text-center">
            ${
                success
                    ? '<svg class="w-24 h-24 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                    : '<svg class="w-24 h-24 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
            }
            <p class="mt-4 text-lg ${success ? "text-green-700" : "text-red-700"}">${message}</p>
        </div>
        ${
            success
                ? `
            <div class="mt-6">
                <a href="https://www.bu1sport.com" class="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Přejít na oficiální stránky BU1
                </a>
            </div>
        `
                : ""
        }
    `;

    confirmButton.style.display = "none";
    cancelButton.textContent = "Zavřít";
}
