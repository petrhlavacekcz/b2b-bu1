import { VAT_RATES, WHOLESALE_PRICE_GROUP_ID, REGULAR_PRICE_EUR_ID, WHOLESALE_PRICE_EUR_ID } from './config.js';

export { VAT_RATES };

export function getVariantSizes(products) {
    const sizes = new Set();
    for (const product of Object.values(products)) {
        if (product.variants) {
            for (const variant of Object.values(product.variants)) {
                const size = variant.name.split(' ').pop().replace(',', '.');
                if (!isNaN(parseFloat(size)) && isFinite(size)) {
                    sizes.add(size);
                }
            }
        }
    }
    return Array.from(sizes).sort((a, b) => parseFloat(a) - parseFloat(b));
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
    if (country === 'CZ' || !isVatRegistered) {
        return VAT_RATES[country] || VAT_RATES['CZ'];
    }
    return 0;
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