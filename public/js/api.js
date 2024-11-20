import { INVENTORY_ID, CATEGORY_ID_SENIOR, CATEGORY_ID_JUNIOR } from './config.js';

export async function fetchProductList(type = 'senior') {
    const response = await fetch('/api/baselinker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'getInventoryProductsList',
            parameters: {
                inventory_id: INVENTORY_ID,
                filter_category_id: type === 'senior' ? CATEGORY_ID_SENIOR : CATEGORY_ID_JUNIOR
            }
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'SUCCESS') {
        throw new Error(`API returned an error: ${data.error_code} - ${data.error_message}`);
    }

    return data.products || {};
}

export async function fetchProductData(productIds) {
    const response = await fetch('/api/baselinker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'getInventoryProductsData',
            parameters: {
                inventory_id: INVENTORY_ID,
                products: productIds
            }
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'SUCCESS') {
        throw new Error(`API returned an error: ${data.error_code} - ${data.error_message}`);
    }

    return data.products || {};
}

export async function fetchGloves(type = 'senior') {
    try {
        console.log('Fetching product list...');
        const productList = await fetchProductList(type);
        console.log('Product list response:', productList);

        const productIds = Object.keys(productList);
        console.log('Number of products:', productIds.length);

        if (productIds.length === 0) {
            throw new Error('No products found');
        }

        console.log('Fetching product data...');
        const productData = await fetchProductData(productIds);
        console.log('Product data response:', productData);

        return productData;
    } catch (error) {
        console.error(`Error loading data: ${error.message}`);
        throw error;
    }
}