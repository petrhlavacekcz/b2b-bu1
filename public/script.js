// Constants
const API_TOKEN = '4011247-4024140-CDPH2B8FLN887DA787Y7MZWFBCGA69LZCGSXXB2MXT0UGQ25HZ7UJ5Y1OOQDEU8U';
const INVENTORY_ID = '39571';
const CATEGORY_ID = '3064077';
const WHOLESALE_PRICE_GROUP_ID = '42344';
const REGULAR_PRICE_EUR_ID = '46109';
const WHOLESALE_PRICE_EUR_ID = '55160';

// VAT rates for EU countries (OSS)
const VAT_RATES = {
    'CZ': 0.21, 'AT': 0.20, 'BE': 0.21, 'BG': 0.20, 'CY': 0.19, 'DE': 0.19, 
    'DK': 0.25, 'EE': 0.20, 'ES': 0.21, 'FI': 0.24, 'FR': 0.20, 'GR': 0.24, 
    'HR': 0.25, 'HU': 0.27, 'IE': 0.23, 'IT': 0.22, 'LT': 0.21, 'LU': 0.17, 
    'LV': 0.21, 'MT': 0.18, 'NL': 0.21, 'PL': 0.23, 'PT': 0.23, 'RO': 0.19, 
    'SE': 0.25, 'SI': 0.22, 'SK': 0.20
};

// State
let allGloves = [];
let currentCurrency = 'CZK';

// API Functions
async function fetchProductList() {
    const response = await fetch('/api/baselinker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'getInventoryProductsList',
            parameters: {
                inventory_id: INVENTORY_ID,
                filter_category_id: CATEGORY_ID
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

async function fetchGloves() {
    try {
        console.log('Fetching product list...');
        const productList = await fetchProductList();
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

// Helper Functions
function getVariantSizes(products) {
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

function getPrice(prices, isWholesale) {
    if (currentCurrency === 'CZK') {
        return isWholesale ? parseFloat(prices[WHOLESALE_PRICE_GROUP_ID]) || 0 : parseFloat(Object.values(prices)[0]) || 0;
    } else {
        return isWholesale ? parseFloat(prices[WHOLESALE_PRICE_EUR_ID]) || 0 : parseFloat(prices[REGULAR_PRICE_EUR_ID]) || 0;
    }
}

function formatPrice(price) {
    return `${price.toFixed(2)} ${currentCurrency}`;
}

function getVATRate(country, isVatRegistered) {
    if (country === 'CZ' || !isVatRegistered) {
        return VAT_RATES[country] || 0;
    }
    return 0; // 0% VAT only for VAT registered customers outside Czech Republic
}

function calculateVAT(price, country, isVatRegistered) {
    const vatRate = getVATRate(country, isVatRegistered);
    return price * vatRate;
}

function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// DOM Manipulation Functions
function createGloveRow(productId, product, sizes, isSenior) {
    const row = document.createElement('tr');
    const mocPrice = getPrice(product.prices, false);
    const vocPrice = getPrice(product.prices, true);
    
    let totalInStock = 0;
    let totalOrdered = 0;
    
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
                    totalInStock += variantQuantity;
                    break;
                }
            }
        }
        const savedQuantity = parseInt(localStorage.getItem(`order_${productId}_${size}`)) || 0;
        totalOrdered += savedQuantity;
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

    row.innerHTML = `
        <td class="px-2 py-2 whitespace-nowrap sticky-column" style="left: 0; z-index: 10; min-width: 200px;">
            <div class="text-sm font-medium text-gray-900">${product.text_fields.name || ''}</div>
            <div class="text-xs text-gray-500">VOC: ${formatPrice(vocPrice)} bez DPH</div>
            <div class="text-xs text-gray-500">MOC: ${formatPrice(mocPrice)} s DPH</div>
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

function populateTableHeader(tableId, sizes) {
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

// Main Functions
async function populateTable() {
    try {
        console.log('Starting data loading...');
        const gloves = await fetchGloves();
        console.log('Data loaded:', gloves);

        allGloves = Object.entries(gloves).filter(([, product]) => {
            return Object.values(product.variants || {}).some(variant => Object.values(variant.stock)[0] > 0);
        });
        console.log('Filtered products:', allGloves);

        const sizes = getVariantSizes(Object.fromEntries(allGloves));
        console.log('Available sizes:', sizes);
        
        const seniorSizes = sizes.filter(size => parseFloat(size) >= 7);
        const juniorSizes = sizes.filter(size => parseFloat(size) < 7);
        
        populateTableHeader('seniorGlovesTable', seniorSizes);
        populateTableHeader('juniorGlovesTable', juniorSizes);

        if (allGloves.length === 0) {
            document.getElementById('loading').textContent = 'No data to display.';
            return;
        }

        sortAndDisplayGloves();

        console.log('Tables populated with data.');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('seniorGlovesTable').style.display = 'table';
        document.getElementById('juniorGlovesTable').style.display = 'table';

        document.querySelectorAll('#seniorGlovesTable input[type="number"], #juniorGlovesTable input[type="number"]').forEach(input => {
            input.addEventListener('change', saveOrderQuantity);
        });

        updateOrderSummary();
    } catch (error) {
        console.error('Error populating table:', error);
        document.getElementById('loading').textContent = 'Error loading data. Please try again later.';
    }
}

function sortAndDisplayGloves() {
    const sortValue = document.getElementById('sort').value;
    const sizes = getVariantSizes(Object.fromEntries(allGloves));
    const seniorSizes = sizes.filter(size => parseFloat(size) >= 7);
    const juniorSizes = sizes.filter(size => parseFloat(size) < 7);

    allGloves.sort(([, a], [, b]) => {
        if (sortValue === 'name') {
            return (a.text_fields.name || '').localeCompare(b.text_fields.name || '');
        } else if (sortValue === 'priceAsc' || sortValue === 'priceDesc') {
            const priceA = getPrice(a.prices, true);
            const priceB = getPrice(b.prices, true);
            return sortValue === 'priceAsc' ? priceA - priceB : priceB - priceA;
        }
    });

    const seniorGloves = allGloves.filter(([, product]) => {
        return Object.values(product.variants || {}).some(variant => {
            const size = parseFloat(variant.name.split(' ').pop().replace(',', '.'));
            return size >= 7;
        });
    });

    const juniorGloves = allGloves.filter(([, product]) => {
        return Object.values(product.variants || {}).some(variant => {
            const size = parseFloat(variant.name.split(' ').pop().replace(',', '.'));
            return size < 7;
        });
    });

    const seniorTbody = document.querySelector('#seniorGlovesTable tbody');
    const juniorTbody = document.querySelector('#juniorGlovesTable tbody');
    seniorTbody.innerHTML = '';
    juniorTbody.innerHTML = '';

    seniorGloves.forEach(([productId, product]) => {
        seniorTbody.appendChild(createGloveRow(productId, product, seniorSizes, true));
    });

    juniorGloves.forEach(([productId, product]) => {
        juniorTbody.appendChild(createGloveRow(productId, product, juniorSizes, false));
    });

    updateOrderSummary();
}

function updateOrderSummary() {
    const orderData = gatherOrderData();
    const { totalPrice, totalQuantity, seniorQuantity, juniorQuantity } = orderData;
    const vatRate = getVATRate(orderData.country, orderData.isVatRegistered);
    const vatAmount = calculateVAT(totalPrice, orderData.country, orderData.isVatRegistered);
    const totalWithVAT = totalPrice + vatAmount;

    document.getElementById('totalPrice').textContent = formatPrice(totalPrice);
    document.getElementById('totalQuantity').textContent = totalQuantity;
    document.getElementById('seniorQuantity').textContent = seniorQuantity;
    document.getElementById('juniorQuantity').textContent = juniorQuantity;
    document.getElementById('vatAmount').textContent = `${formatPrice(vatAmount)} (${(vatRate * 100).toFixed(0)}%)`;
    document.getElementById('totalWithVAT').textContent = formatPrice(totalWithVAT);
}

function gatherOrderData() {
    const orderData = {
        companyName: document.getElementById('companyName').value,
        ico: document.getElementById('ico').value,
        dic: document.getElementById('dic').value,
        street: document.getElementById('street').value,
        city: document.getElementById('city').value,
        postalCode: document.getElementById('postalCode').value,
        country: document.getElementById('country').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        isVatRegistered: !!document.getElementById('dic').value,
        products: [],
        totalPrice: 0,
        totalQuantity: 0,
        seniorQuantity: 0,
        juniorQuantity: 0
    };

    document.querySelectorAll('#seniorGlovesTable input[type="number"], #juniorGlovesTable input[type="number"]').forEach(input => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            const productId = input.dataset.productId;
            const size = input.dataset.size;
            const price = parseFloat(input.dataset.price);
            const productName = input.closest('tr').querySelector('td:first-child .text-sm.font-medium').textContent;
            orderData.products.push({
                productId,
                productName,
                size,
                quantity,
                price
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

function saveOrderQuantity(event) {
    const input = event.target;
    const productId = input.dataset.productId;
    const size = input.dataset.size;
    localStorage.setItem(`order_${productId}_${size}`, input.value);
    updateOrderSummary();
    
    const row = input.closest('tr');
    const orderedCell = row.querySelector('td:nth-child(3)');
    let totalOrdered = 0;
    row.querySelectorAll('input[type="number"]').forEach(input => {
        totalOrdered += parseInt(input.value) || 0;
    });
    orderedCell.querySelector('span').textContent = totalOrdered;
}

async function loadCompanyInfo() {
    console.log('loadCompanyInfo function called');
    const ico = document.getElementById('ico').value.trim();
    if (!ico) {
        alert('Please enter ICO.');
        return;
    }

    try {
        console.log('Fetching data from ARES API for ICO:', ico);
        const response = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`);
        if (!response.ok) {
            throw new Error('Failed to load data from ARES API');
        }
        const data = await response.json();
        console.log('Data received from ARES API:', data);

        if (data && data.ico) {
            document.getElementById('companyName').value = data.obchodniJmeno || '';
            document.getElementById('dic').value = data.dic || '';
            
            const addressInfo = data.sidlo;
            
            if (addressInfo) {
                let street = addressInfo.nazevUlice || '';
                if (addressInfo.cisloDomovni) {
                    street += (street ? ' ' : '') + addressInfo.cisloDomovni;
                    if (addressInfo.cisloOrientacni) {
                        street += '/' + addressInfo.cisloOrientacni;
                    }
                }
                
                document.getElementById('street').value = street;
                
                const city = addressInfo.nazevMestskeCastiObvodu || addressInfo.nazevObce || '';
                document.getElementById('city').value = city;
                
                document.getElementById('postalCode').value = addressInfo.psc ? addressInfo.psc.toString() : '';
                document.getElementById('country').value = addressInfo.kodStatu || 'CZ';
            }

            console.log('Company info updated:', {
                companyName: data.obchodniJmeno,
                dic: data.dic,
                street: document.getElementById('street').value,
                city: document.getElementById('city').value,
                postalCode: document.getElementById('postalCode').value,
                country: document.getElementById('country').value
            });

            updateVATDisplay();
        } else {
            console.log('No data found for the given ICO');
            alert('No information found for the given ICO.');
        }
    } catch (error) {
        console.error('Error loading data from ARES:', error);
        alert('Failed to load data from ARES. Please try again later.');
    }
}

function showOrderPreview() {
    const orderData = gatherOrderData();
    if (orderData.products.length === 0) {
        alert('Please select at least one product for the order.');
        return;
    }

    if (!validateEmail(orderData.email)) {
        alert('Please enter a valid email address.');
        return;
    }

    const vatRate = getVATRate(orderData.country, orderData.isVatRegistered);
    const vatAmount = calculateVAT(orderData.totalPrice, orderData.country, orderData.isVatRegistered);
    const totalWithVAT = orderData.totalPrice + vatAmount;

    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${orderData.products.map(p => `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.productName}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.size}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.quantity}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatPrice(p.price * p.quantity)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="mt-4">
            <p class="font-bold">Total price without VAT: ${formatPrice(orderData.totalPrice)}</p>
            <p>VAT ${(vatRate * 100).toFixed(0)}%: ${formatPrice(vatAmount)}</p>
            <p class="font-bold">Total price with VAT ${(vatRate * 100).toFixed(0)}%: ${formatPrice(totalWithVAT)}</p>
            <p>Total number of pieces: ${orderData.totalQuantity}</p>
            <p>Number of senior pieces: ${orderData.seniorQuantity}</p>
            <p>Number of junior pieces: ${orderData.juniorQuantity}</p>
        </div>
    `;

    document.getElementById('modalTitle').textContent = 'Náhled objednávky';
    document.getElementById('confirmOrder').style.display = 'inline-block';
    document.getElementById('orderModal').classList.remove('hidden');
    document.getElementById('orderModal').classList.add('flex');
}

async function sendOrder(orderData) {
    const country = orderData.country;
    const isVatRegistered = !!orderData.dic;
    
    const calculatePriceWithVAT = (price, country, isVatRegistered) => {
        if (!isVatRegistered) {
            return price * (1 + (VAT_RATES[country] || 0));
        }
        return price;
    };
    
    const formatTaxRate = (country, isVatRegistered) => {
        if (country === 'CZ' || !isVatRegistered) {
            return (VAT_RATES[country] || 0) * 100;
        }
        return -1; // -1 for VAT exempt (only for VAT registered customers outside Czech Republic)
    };

    try {
        const response = await fetch('/api/baselinker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: 'addOrder',
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
                        "60445": orderData.ico
                    },
                    products: orderData.products.map(p => ({
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
                        price_brutto: calculatePriceWithVAT(p.price, country, isVatRegistered),
                        tax_rate: formatTaxRate(country, isVatRegistered),
                        quantity: p.quantity,
                        weight: 0
                    }))
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'SUCCESS') {
            showOrderResult(true, "Vaši objednávku jsme v pořádku přijali. Během 15 minut Vám přijdou informace na uvedený e-mail.");
            clearOrder();
        } else {
            throw new Error(`API error: ${result.error_code} - ${result.error_message}`);
        }
    } catch (error) {
        console.error('Error submitting order:', error);
        showOrderResult(false, "Vaši objednávku se nepodařilo odeslat, prosím kontaktujte nás na e-mailu bu1@bu1.cz");
    }
}

function showOrderResult(success, message) {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const confirmButton = document.getElementById('confirmOrder');
    const cancelButton = document.getElementById('cancelOrder');

    modalTitle.textContent = success ? 'Objednávka úspěšně odeslána' : 'Chyba při odesílání objednávky';
    
    modalContent.innerHTML = `
        <div class="text-center">
            ${success 
                ? '<svg class="w-24 h-24 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                : '<svg class="w-24 h-24 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
            }
            <p class="mt-4 text-lg ${success ? 'text-green-700' : 'text-red-700'}">${message}</p>
        </div>
    `;

    confirmButton.style.display = 'none';
    cancelButton.textContent = 'Zavřít';
}

function closeModal() {
    document.getElementById('orderModal').classList.add('hidden');
    document.getElementById('orderModal').classList.remove('flex');
}

function toggleCategory(category) {
    const content = document.querySelector(`.category-content[data-category="${category}"]`);
    const header = document.querySelector(`.category-header[data-category="${category}"]`);
    const arrow = header.querySelector('svg');
    
    content.classList.toggle('collapsed');
    arrow.style.transform = content.classList.contains('collapsed') ? 'rotate(180deg)' : '';
}

function changeCurrency() {
    currentCurrency = document.getElementById('currency').value;
    sortAndDisplayGloves();
}

function updateVATDisplay() {
    const country = document.getElementById('country').value;
    const isVatRegistered = !!document.getElementById('dic').value;
    const vatRate = getVATRate(country, isVatRegistered);
    
    document.getElementById('vatAmount').textContent = `${(vatRate * 100).toFixed(0)}%`;
    updateOrderSummary();
}

function clearOrder() {
    document.querySelectorAll('#seniorGlovesTable input[type="number"], #juniorGlovesTable input[type="number"]').forEach(input => {
        input.value = 0;
        const productId = input.dataset.productId;
        const size = input.dataset.size;
        localStorage.removeItem(`order_${productId}_${size}`);
    });

    document.querySelectorAll('#seniorGlovesTable tbody tr, #juniorGlovesTable tbody tr').forEach(row => {
        const orderedCell = row.querySelector('td:nth-child(3)');
        orderedCell.querySelector('span').textContent = '0';
    });

    updateOrderSummary();
}

// Event Listeners
window.addEventListener('load', () => {
    console.log('Window loaded');
    populateTable();

    document.getElementById('sort').addEventListener('change', sortAndDisplayGloves);
    document.getElementById('currency').addEventListener('change', changeCurrency);

    const loadCompanyInfoButton = document.getElementById('loadCompanyInfo');
    if (loadCompanyInfoButton) {
        loadCompanyInfoButton.addEventListener('click', loadCompanyInfo);
        console.log('Event listener added for loadCompanyInfo button');
    } else {
        console.error('loadCompanyInfo button not found');
    }

    document.getElementById('submitOrder').addEventListener('click', showOrderPreview);

    document.getElementById('confirmOrder').addEventListener('click', () => {
        const orderData = gatherOrderData();
        sendOrder(orderData);
    });

    document.getElementById('cancelOrder').addEventListener('click', closeModal);

    document.getElementById('email').addEventListener('blur', function() {
        if (!validateEmail(this.value)) {
            this.classList.add('border-red-500');
            alert('Please enter a valid email address.');
        } else {
            this.classList.remove('border-red-500');
        }
    });

    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', () => {
            const category = header.dataset.category;
            toggleCategory(category);
        });
    });

    document.getElementById('country').addEventListener('change', updateVATDisplay);
    document.getElementById('dic').addEventListener('input', updateVATDisplay);

    document.getElementById('clearOrder').addEventListener('click', clearOrder);
});