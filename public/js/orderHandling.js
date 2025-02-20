import { VAT_RATES, getVATRate, calculateVAT, formatPrice } from "./utils.js";
import { showOrderResult } from "./domManipulation.js";
import { updateCartBadge, updateCartItems } from "./cart.js";

export function gatherOrderData() {
    const orderData = {
        companyName: document.getElementById("companyName")?.value || "",
        ico: document.getElementById("ico")?.value || "",
        dic: document.getElementById("dic")?.value || "",
        street: document.getElementById("street")?.value || "",
        city: document.getElementById("city")?.value || "",
        postalCode: document.getElementById("postalCode")?.value || "",
        country: document.getElementById("country")?.value || "CZ",
        phone: document.getElementById("phone")?.value || "",
        email: document.getElementById("email")?.value || "",
        contactPerson: document.getElementById("contactPerson")?.value || "",
        isVatRegistered: !!document.getElementById("dic")?.value,
        products: [],
        totalPrice: 0,
        totalQuantity: 0
    };

    // Find all product tables and gather data from each
    document.querySelectorAll('input[type="number"]').forEach((input) => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            const productId = input.dataset.productId;
            const variant = input.dataset.variant;
            const price = parseFloat(input.dataset.price);
            const variantId = input.dataset.variantId;
            const sku = input.dataset.sku;
            const ean = input.dataset.ean;
            const productName = input
                .closest("tr")
                .querySelector(
                    "td:first-child .text-sm.font-medium",
                ).textContent;
            orderData.products.push({
                productId,
                productName,
                size: variant,
                quantity,
                price,
                variantId,
                sku,
                ean,
            });
            orderData.totalPrice += quantity * price;
            orderData.totalQuantity += quantity;
        }
    });

    return orderData;
}

export function updateOrderSummary(currentCurrency) {
    const orderData = gatherOrderData();
    const vatRate = getVATRate(orderData.country, orderData.isVatRegistered);
    const vatAmount = calculateVAT(orderData.totalPrice, orderData.country, orderData.isVatRegistered);
    const totalWithVAT = orderData.totalPrice + vatAmount;

    // Update cart items
    updateCartItems(orderData.products, currentCurrency);

    // Update summary values
    document.getElementById("totalPrice").textContent = formatPrice(orderData.totalPrice, currentCurrency);
    document.getElementById("vatAmount").textContent = `${formatPrice(vatAmount, currentCurrency)} (${(vatRate * 100).toFixed(0)}%)`;
    document.getElementById("totalWithVAT").textContent = formatPrice(totalWithVAT, currentCurrency);

    // Update cart badge
    updateCartBadge(orderData.totalQuantity);
}

export async function sendOrder(orderData, currentCurrency) {
    const country = orderData.country;
    const isVatRegistered = !!orderData.dic;

    const calculatePriceWithVAT = (price, country, isVatRegistered) => {
        if (country === "CZ") {
            // Pro ČR vždy přidáváme DPH
            return price * (1 + VAT_RATES["CZ"]);
        } else if (!isVatRegistered) {
            // Pro ostatní země přidáváme DPH, pouze pokud není plátce
            return price * (1 + (VAT_RATES[country] || 0));
        }
        // Pro plátce DPH mimo ČR vracíme cenu bez DPH
        return price;
    };

    const formatTaxRate = (country, isVatRegistered) => {
        if (country === "CZ") {
            // Pro ČR vždy vracíme standardní sazbu DPH
            return VAT_RATES["CZ"] * 100;
        } else if (!isVatRegistered) {
            // Pro neplátce z jiných zemí vracíme jejich sazbu DPH
            return (VAT_RATES[country] || 0) * 100;
        }
        // Pro plátce DPH mimo ČR vracíme -1 (osvobozeno od DPH)
        return -1;
    };

    try {
        const response = await fetch("/api/baselinker", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                method: "addOrder",
                parameters: {
                    order_status_id: "247482",
                    custom_source_id: "42040",
                    date_add: Math.floor(Date.now() / 1000).toString(),
                    user_comments: orderData.userComments || "",
                    phone: orderData.phone,
                    email: orderData.email,
                    user_login: orderData.companyName,
                    currency: currentCurrency,
                    payment_method: "Bank Deposit",
                    paid: "0",
                    delivery_method: "PPL Kurýrní služba",
                    delivery_price: 0,
                    delivery_fullname: orderData.contactPerson,
                    delivery_company: orderData.companyName,
                    delivery_address: orderData.street,
                    delivery_city: orderData.city,
                    delivery_state: "",
                    delivery_postcode: orderData.postalCode,
                    delivery_country_code: country,
                    invoice_fullname: orderData.contactPerson,
                    invoice_company: orderData.companyName,
                    invoice_nip: orderData.dic,
                    invoice_address: orderData.street,
                    invoice_city: orderData.city,
                    invoice_state: "",
                    invoice_postcode: orderData.postalCode,
                    invoice_country_code: country,
                    want_invoice: "1",
                    custom_extra_fields: {
                        60445: orderData.ico,
                    },
                    products: orderData.products.map((p) => ({
                        storage: "db",
                        storage_id: 0,
                        product_id: p.productId,
                        variant_id: parseInt(p.variantId),
                        name: `${p.productName} - Size ${p.size}`,
                        sku: p.sku,
                        ean: p.ean,
                        location: "",
                        warehouse_id: 0,
                        attributes: `Size: ${p.size}`,
                        price_brutto: calculatePriceWithVAT(
                            p.price,
                            country,
                            isVatRegistered,
                        ),
                        tax_rate: formatTaxRate(country, isVatRegistered),
                        quantity: p.quantity,
                        weight: 0,
                    })),
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === "SUCCESS") {
            showOrderResult(
                true,
                "Vaši objednávku jsme v pořádku přijali. Vyčkejte na fakturu k úhradě.",
            );
            clearOrder();
        } else {
            throw new Error(
                `API error: ${result.error_code} - ${result.error_message}`,
            );
        }
    } catch (error) {
        console.error("Error submitting order:", error);
        showOrderResult(
            false,
            "Vaši objednávku se nepodařilo odeslat, prosím kontaktujte nás na e-mailu bu1@bu1.cz",
        );
    }
}

export function clearOrder() {
    // Clear all order data from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
        if (key.startsWith("order_")) {
            localStorage.removeItem(key);
        }
    });

    // Reset all input fields to 0
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach((input) => {
        input.value = 0;
    });

    // Update order summary
    updateOrderSummary();
    
    // Update cart badge
    updateCartBadge(0);
}
