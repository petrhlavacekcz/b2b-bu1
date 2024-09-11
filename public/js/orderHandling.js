import { VAT_RATES, getVATRate, calculateVAT, formatPrice } from "./utils.js";
import { showOrderResult } from "./domManipulation.js";

export function gatherOrderData() {
    const orderData = {
        companyName: document.getElementById("companyName").value,
        ico: document.getElementById("ico").value,
        dic: document.getElementById("dic").value,
        street: document.getElementById("street").value,
        city: document.getElementById("city").value,
        postalCode: document.getElementById("postalCode").value,
        country: document.getElementById("country").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        isVatRegistered: !!document.getElementById("dic").value,
        products: [],
        totalPrice: 0,
        totalQuantity: 0,
        seniorQuantity: 0,
        juniorQuantity: 0,
    };

    document
        .querySelectorAll(
            '#seniorGlovesTable input[type="number"], #juniorGlovesTable input[type="number"]',
        )
        .forEach((input) => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                const productId = input.dataset.productId;
                const size = input.dataset.size;
                const price = parseFloat(input.dataset.price);
                const productName = input
                    .closest("tr")
                    .querySelector(
                        "td:first-child .text-sm.font-medium",
                    ).textContent;
                orderData.products.push({
                    productId,
                    productName,
                    size,
                    quantity,
                    price,
                });
                orderData.totalPrice += quantity * price;
                orderData.totalQuantity += quantity;
                if (parseFloat(size) >= 7) {
                    orderData.seniorQuantity += quantity;
                } else {
                    orderData.juniorQuantity += quantity;
                }
            }
        });

    return orderData;
}

export function updateOrderSummary(currentCurrency) {
    const orderData = gatherOrderData();
    const { totalPrice, totalQuantity, seniorQuantity, juniorQuantity } =
        orderData;
    const vatRate = getVATRate(orderData.country, orderData.isVatRegistered);
    const vatAmount = calculateVAT(
        totalPrice,
        orderData.country,
        orderData.isVatRegistered,
    );
    const totalWithVAT = totalPrice + vatAmount;

    document.getElementById("totalPrice").textContent = formatPrice(
        totalPrice,
        currentCurrency,
    );
    document.getElementById("totalQuantity").textContent = totalQuantity;
    document.getElementById("seniorQuantity").textContent = seniorQuantity;
    document.getElementById("juniorQuantity").textContent = juniorQuantity;
    document.getElementById("vatAmount").textContent =
        `${formatPrice(vatAmount, currentCurrency)} (${(vatRate * 100).toFixed(0)}%)`;
    document.getElementById("totalWithVAT").textContent = formatPrice(
        totalWithVAT,
        currentCurrency,
    );
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
                    delivery_fullname: orderData.companyName,
                    delivery_company: orderData.companyName,
                    delivery_address: orderData.street,
                    delivery_city: orderData.city,
                    delivery_state: "",
                    delivery_postcode: orderData.postalCode,
                    delivery_country_code: country,
                    invoice_fullname: orderData.companyName,
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
                        variant_id: 0,
                        name: `${p.productName} - Size ${p.size}`,
                        sku: "",
                        ean: "",
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
                "Vaši objednávku jsme v pořádku přijali. V nejbližší době bude na uvedený e-mail zaslána faktura k proplacení. Upozorňujeme, že zboží je v našem skladu rezervováno maximálně 3 pracovní dny.",
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
    document
        .querySelectorAll(
            '#seniorGlovesTable input[type="number"], #juniorGlovesTable input[type="number"]',
        )
        .forEach((input) => {
            input.value = 0;
            const productId = input.dataset.productId;
            const size = input.dataset.size;
            localStorage.removeItem(`order_${productId}_${size}`);
        });

    document
        .querySelectorAll(
            "#seniorGlovesTable tbody tr, #juniorGlovesTable tbody tr",
        )
        .forEach((row) => {
            const orderedCell = row.querySelector("td:nth-child(3)");
            orderedCell.querySelector("span").textContent = "0";
        });

    updateOrderSummary();
}
