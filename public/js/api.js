import { INVENTORY_ID } from './config.js';

export async function fetchCategories() {
    const response = await fetch('/api/baselinker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'getInventoryCategories',
            parameters: {
                inventory_id: INVENTORY_ID
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

    return data.categories || [];
}

export async function fetchAllProducts() {
    try {
        console.log('Fetching all products list...');
        // Fetch product list without category filter to get all products
        const response = await fetch('/api/baselinker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'getInventoryProductsList',
                parameters: {
                    inventory_id: INVENTORY_ID
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

        const productIds = Object.keys(data.products || {});
        console.log('Total number of products:', productIds.length);

        if (productIds.length === 0) {
            return {};
        }

        // Fetch detailed data for all products at once
        const productData = await fetchProductData(productIds);
        console.log('All product data fetched');

        return productData;
    } catch (error) {
        console.error(`Error loading products: ${error.message}`);
        throw error;
    }
}

async function fetchProductData(productIds) {
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

// Helper function to categorize products
export function categorizeProducts(products) {
    const categorizedProducts = {};
    
    // Initialize with empty arrays for each category
    for (const [productId, product] of Object.entries(products)) {
        const categoryId = product.category_id;
        if (!categorizedProducts[categoryId]) {
            categorizedProducts[categoryId] = {};
        }
        categorizedProducts[categoryId][productId] = product;
    }
    
    return categorizedProducts;
}