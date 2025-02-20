import { VAT_RATES, WHOLESALE_PRICE_GROUP_ID, REGULAR_PRICE_EUR_ID, WHOLESALE_PRICE_EUR_ID } from './config.js';

export { VAT_RATES };

export function getVariants(products) {
    const variants = new Set();
    for (const product of Object.values(products)) {
        if (product.variants) {
            for (const variant of Object.values(product.variants)) {
                variants.add(variant.name);
            }
        } else {
            variants.add('single');
        }
    }
    return Array.from(variants).sort((a, b) => {
        if (a === 'single') return -1;
        if (b === 'single') return 1;
        return parseFloat(a) - parseFloat(b);
    });
}

export function getVariantSizes(products) {
    const variants = new Set();
    for (const product of Object.values(products)) {
        if (product.variants && Object.keys(product.variants).length > 0) {
            for (const variant of Object.values(product.variants)) {
                variants.add(variant.name);
            }
        } else {
            variants.add('single');
        }
    }
    return Array.from(variants).sort((a, b) => {
        if (a === 'single') return -1;
        if (b === 'single') return 1;
        const aNum = parseFloat(a);
        const bNum = parseFloat(b);
        if (isNaN(aNum) || isNaN(bNum)) {
            return a.localeCompare(b);
        }
        return aNum - bNum;
    });
}

export function getPrice(prices, isWholesale, currentCurrency) {
    if (currentCurrency === 'CZK') {
        return isWholesale ? parseFloat(prices[WHOLESALE_PRICE_GROUP_ID]) || 0 : parseFloat(Object.values(prices)[0]) || 0;
    } else {
        return isWholesale ? parseFloat(prices[WHOLESALE_PRICE_EUR_ID]) || 0 : parseFloat(prices[REGULAR_PRICE_EUR_ID]) || 0;
    }
}

export function formatPrice(price, currency) {
    return `${price.toFixed(2)} ${currency}`;
}

export function getVATRate(country, isVatRegistered) {
    if (country === "CZ") {
        return VAT_RATES["CZ"];
    }

    if (isVatRegistered) {
        return 0;
    }

    return VAT_RATES[country] || 0;
}

export function calculateVAT(price, country, isVatRegistered) {
    const vatRate = getVATRate(country, isVatRegistered);
    return price * vatRate;
}

export function validatePhoneNumber(phone) {
    const phonePattern = /^[0-9+()\-\s]{9,}$/;
    return phonePattern.test(phone);
}

export function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}