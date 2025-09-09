import {
    fetchCategories,
    fetchAllProducts,
    categorizeProducts,
} from "./api.js";
import {
    getVariantSizes,
    getVATRate,
    validateEmail,
    validatePhoneNumber,
    getPrice,
    formatPrice,
    calculateVAT,
} from "./utils.js";
import {
    createRow,
    populateTableHeader,
    showProductImage,
    hideProductImage,
} from "./domManipulation.js";
import {
    updateOrderSummary,
    sendOrder,
    clearOrder,
    gatherOrderData,
} from "./orderHandling.js";
import { initializeCart, updateCartBadge } from "./cart.js";
import { initializeCategories, resetCategories } from "./filterCategories.js";
import { initFloatingHeaders } from "./floatingHeader.js";

let allProducts = {};
let currentCurrency = "CZK";

// Password validation
window.addEventListener("load", () => {
    const validPasswords = [
        "bu1b2bheslo",
        "Sportfotbal5?",
        "Sali34:",
        "PartnerBU1?",
        "?FutbalShop92",
        "Gol1Sport!?",
        "HSportB2b?",
        "JanalikB2B?",
        "Mtrade24?!?",
        "SportJecha!2024?",
        "Decathlon?1!20",
        "SKKeeperSPORT?10",
        "COMSport23?",
        "24?Foremo",
        "GAZAsport?1!",
        "Kadidlo?2!",
        "KOVAC2024?!?",
        "FS?Glkp!24",
        "Havros!Praha25",
        "1905Klokani!",
        "Kromeriz25?!",
        "BuchticSK?25!",
        "ElveSportBr?25!",
        "ElveSportLe?25!",
        "MFKK03?",
        "GKsLeague?25!",
        "DenChudy1?",
        "MFKZV1902?!",
        "Foremo25?!",
        "HFKO25?!",
        "FKnj25?!",
        "LastyPico25?!",
        "ARTISBrno25?!",
        "Gazza25?!",
    ];

    const passwordModal = document.getElementById("passwordModal");
    const mainContent = document.getElementById("mainContent");
    const passwordInput = document.getElementById("passwordInput");
    const submitButton = document.getElementById("submitPassword");
    const passwordError = document.getElementById("passwordError");

    submitButton.addEventListener("click", () => {
        const password = passwordInput.value;
        if (validPasswords.includes(password)) {
            passwordModal.style.display = "none";
            mainContent.classList.remove("hidden");
            passwordError.classList.add("hidden");

            // Initialize cart functionality
            initializeCart();

            // Initialize the application
            populateTable();

            // Initialize filter panel
            initializeFilterPanel();

            // Add currency change listener
            document
                .getElementById("currency")
                .addEventListener("change", changeCurrency);
        } else {
            passwordError.classList.remove("hidden");
        }
    });

    passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            submitButton.click();
        }
    });
});

// Initialize application
function initializeApp() {
    console.log("Window loaded");
    populateTable();

    // Initialize filter panel functionality
    initializeFilterPanel();

    document
        .getElementById("currency")
        .addEventListener("change", changeCurrency);

    // Clear order button in header
    const clearOrderBtn = document.getElementById("clearOrderBtn");
    if (clearOrderBtn) {
        clearOrderBtn.addEventListener("click", () => {
            if (confirm("Opravdu chcete vymazat celou objednávku?")) {
                clearOrder();
            }
        });
    }

    // Preview order button in cart
    const previewOrderBtn = document.getElementById("previewOrderBtn");
    if (previewOrderBtn) {
        previewOrderBtn.addEventListener("click", showOrderPreview);
    }

    // Modal close button
    const closeModalButton = document.getElementById("closeModalButton");
    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeModal);
    }

    // Form validation and submission
    const orderForm = document.getElementById("orderForm");
    if (orderForm) {
        // ... rest of the initialization code ...
    }
}

function initializeFilterPanel() {
    const filterButton = document.getElementById("filterButton");
    console.log("Filter button:", filterButton);
    const filterPanel = document.getElementById("filterPanel");
    console.log("Filter panel:", filterPanel);
    const filterOverlay = document.getElementById("filterOverlay");
    const closeFilterButton = document.getElementById("closeFilterButton");
    const sortSelect = document.getElementById("sort");
    const resetCategoriesButton = document.getElementById("resetCategories");

    if (
        !filterButton ||
        !filterPanel ||
        !filterOverlay ||
        !closeFilterButton ||
        !sortSelect
    ) {
        console.error("Some filter elements are missing:", {
            filterButton,
            filterPanel,
            filterOverlay,
            closeFilterButton,
            sortSelect,
        });
        return;
    }

    // Open filter panel
    filterButton.addEventListener("click", (e) => {
        console.log("Filter button clicked");
        e.preventDefault();
        filterPanel.classList.add("open");
        filterOverlay.classList.add("open");
    });

    // Close filter panel
    const closeFilterPanel = () => {
        filterPanel.classList.remove("open");
        filterOverlay.classList.remove("open");
    };

    closeFilterButton.addEventListener("click", closeFilterPanel);
    filterOverlay.addEventListener("click", closeFilterPanel);

    // Handle sorting
    sortSelect.addEventListener("change", () => {
        sortAndDisplayProducts();
    });

    // Handle reset categories
    if (resetCategoriesButton) {
        resetCategoriesButton.addEventListener("click", resetCategories);
    }
}

// Initialize cart when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    initializeCart();
    updateCartCount();
});

// Update cart badge when order changes
function updateCartCount() {
    const orderData = gatherOrderData();
    const totalItems = orderData.totalQuantity;
    updateCartBadge(totalItems);
}

// Add event listener for input changes to update cart badge
document.addEventListener("input", (e) => {
    if (e.target.matches('input[type="number"]')) {
        updateCartCount();
        updateOrderSummary(currentCurrency);
    }
});

async function populateTable() {
    const loadingElement = document.getElementById("loading");
    const mainContent = document.getElementById("mainContent");

    if (!loadingElement || !mainContent) {
        console.error("Required elements not found");
        return;
    }

    try {
        console.log("Starting data loading...");
        loadingElement.textContent = "Načítání dat...";

        // 1. Fetch all categories
        const categories = await fetchCategories();
        console.log("Categories loaded:", categories);

        // Initialize categories in filter panel
        initializeCategories(categories);

        // 2. Fetch all products at once
        const allProductsData = await fetchAllProducts();
        console.log("All products loaded");

        // 3. Categorize products
        const categorizedProducts = categorizeProducts(allProductsData);
        console.log("Products categorized:", categorizedProducts);

        // Create tables for each category
        const tablesContainer = document.getElementById("tablesContainer");
        if (!tablesContainer) {
            throw new Error("Tables container not found");
        }

        // Clear existing tables
        tablesContainer.innerHTML = "";

        for (const category of categories) {
            const categoryId = category.category_id;
            const categoryName = category.name;

            // Get products for this category
            const categoryProducts = categorizedProducts[categoryId] || {};

            // Skip empty categories
            if (Object.keys(categoryProducts).length === 0) {
                continue;
            }

            // Create table container
            let tableContainer = document.createElement("div");
            tableContainer.id = `category_${categoryId}`;
            tableContainer.className = "category-container";
            tableContainer.innerHTML = `
                <div class="category-header">
                    <h2 class="text-xl font-bold">${categoryName}</h2>
                </div>
                <div class="order-table">
                    <table id="table_${categoryId}" class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr></tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200"></tbody>
                    </table>
                </div>
            `;
            tablesContainer.appendChild(tableContainer);

            // Filter products with stock
            allProducts[categoryId] = Object.entries(categoryProducts).filter(
                ([, product]) => {
                    if (
                        product.variants &&
                        Object.keys(product.variants).length > 0
                    ) {
                        return Object.values(product.variants).some(
                            (variant) => Object.values(variant.stock)[0] > 0,
                        );
                    }
                    return Object.values(product.stock)[0] > 0;
                },
            );

            const variants = getVariantSizes(
                Object.fromEntries(allProducts[categoryId]),
            );
            console.log(
                `Available variants for category ${categoryName}:`,
                variants,
            );

            populateTableHeader(`table_${categoryId}`, variants);
            populateProductTable(categoryId, variants);
        }

        if (
            Object.keys(allProducts).every(
                (catId) => allProducts[catId].length === 0,
            )
        ) {
            loadingElement.textContent = "Žádné produkty k dispozici.";
            return;
        }

        console.log("Tables populated with data.");
        loadingElement.style.display = "none";

        // Add event listeners to all number inputs
        document.querySelectorAll('input[type="number"]').forEach((input) => {
            input.addEventListener("change", saveOrderQuantity);
        });

        updateOrderSummary(currentCurrency);
        addImageButtonListeners();

        // Initialize floating headers
        initFloatingHeaders();
    } catch (error) {
        console.error("Error populating table:", error);
        if (loadingElement) {
            loadingElement.textContent =
                "Chyba při načítání dat. Prosím zkuste to znovu později.";
        }
    }
}

function populateProductTable(categoryId, variants) {
    const tbody = document.querySelector(`#table_${categoryId} tbody`);
    tbody.innerHTML = "";

    const products = allProducts[categoryId];
    const productsObj = Object.fromEntries(products);

    products.forEach(([productId, product]) => {
        tbody.appendChild(
            createRow(productId, product, variants, currentCurrency),
        );
    });

    updateOrderSummary(currentCurrency);
}

function sortAndDisplayProducts() {
    const sortValue = document.getElementById("sort").value;

    // Sort products in each category
    Object.keys(allProducts).forEach((categoryId) => {
        allProducts[categoryId].sort(([, a], [, b]) => {
            if (sortValue === "name") {
                return (a.text_fields.name || "").localeCompare(
                    b.text_fields.name || "",
                );
            } else if (sortValue === "priceAsc" || sortValue === "priceDesc") {
                const priceA = getPrice(a.prices, true, currentCurrency);
                const priceB = getPrice(b.prices, true, currentCurrency);
                return sortValue === "priceAsc"
                    ? priceA - priceB
                    : priceB - priceA;
            }
        });

        const variants = getVariantSizes(
            Object.fromEntries(allProducts[categoryId]),
        );
        populateProductTable(categoryId, variants);
    });
}

function addImageButtonListeners() {
    console.log("Adding image button listeners");
    document.querySelectorAll(".product-image-button").forEach((button) => {
        button.addEventListener("mouseenter", showProductImage);
        button.addEventListener("mouseleave", hideProductImage);
        button.addEventListener("click", (event) => {
            event.preventDefault();
            showProductImage(event);
        });
    });
}

function saveOrderQuantity(event) {
    const input = event.target;
    const productId = input.dataset.productId;
    const size = input.dataset.size;
    localStorage.setItem(`order_${productId}_${size}`, input.value);
    updateOrderSummary(currentCurrency);

    const row = input.closest("tr");
    const orderedCell = row.querySelector("td:nth-child(3)");
    let totalOrdered = 0;
    row.querySelectorAll('input[type="number"]').forEach((input) => {
        totalOrdered += parseInt(input.value) || 0;
    });
    orderedCell.querySelector("span").textContent = totalOrdered;
}

async function loadCompanyInfo() {
    console.log("loadCompanyInfo function called");
    const ico = document.getElementById("ico").value.trim();
    if (!ico) {
        alert("Please enter ICO.");
        return;
    }

    try {
        console.log("Fetching data from ARES API for ICO:", ico);
        const response = await fetch(
            `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`,
        );
        if (!response.ok) {
            throw new Error("Failed to load data from ARES API");
        }
        const data = await response.json();
        console.log("Data received from ARES API:", data);

        if (data && data.ico) {
            document.getElementById("companyName").value =
                data.obchodniJmeno || "";
            document.getElementById("dic").value = data.dic || "";

            const addressInfo = data.sidlo;

            if (addressInfo) {
                let street = addressInfo.nazevUlice || "";
                if (addressInfo.cisloDomovni) {
                    street += (street ? " " : "") + addressInfo.cisloDomovni;
                    if (addressInfo.cisloOrientacni) {
                        street += "/" + addressInfo.cisloOrientacni;
                    }
                }

                document.getElementById("street").value = street;

                const city =
                    addressInfo.nazevMestskeCastiObvodu ||
                    addressInfo.nazevObce ||
                    "";
                document.getElementById("city").value = city;

                document.getElementById("postalCode").value = addressInfo.psc
                    ? addressInfo.psc.toString()
                    : "";
                document.getElementById("country").value =
                    addressInfo.kodStatu || "CZ";
            }

            console.log("Company info updated:", {
                companyName: data.obchodniJmeno,
                dic: data.dic,
                street: document.getElementById("street").value,
                city: document.getElementById("city").value,
                postalCode: document.getElementById("postalCode").value,
                country: document.getElementById("country").value,
            });

            updateVATDisplay();
        } else {
            console.log("No data found for the given ICO");
            alert("No information found for the given ICO.");
        }
    } catch (error) {
        console.error("Error loading data from ARES:", error);
        alert("Failed to load data from ARES. Please try again later.");
    }
}

function showOrderPreview() {
    console.log("showOrderPreview called");
    const orderData = gatherOrderData();
    if (orderData.products.length === 0) {
        alert("Prosím vyberte alespoň jeden produkt do objednávky.");
        return;
    }

    const modal = document.getElementById("orderModal");
    const modalContent = document.getElementById("modalContent");
    const modalTotalPrice = document.getElementById("modalTotalPrice");
    const modalVatAmount = document.getElementById("modalVatAmount");
    const modalTotalWithVAT = document.getElementById("modalTotalWithVAT");
    const modalTotalQuantity = document.getElementById("modalTotalQuantity");

    // Make sure modal elements exist
    if (!modal || !modalContent) {
        console.error("Modal elements not found");
        return;
    }

    // Populate order items
    modalContent.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Velikost</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Počet</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena bez DPH</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${orderData.products
                    .map(
                        (p) => `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.productName}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.size}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.quantity}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatPrice(p.price * p.quantity, currentCurrency)}</td>
                    </tr>
                `,
                    )
                    .join("")}
            </tbody>
        </table>
    `;

    updateModalTotals();

    // Show the modal
    modal.style.display = "flex";
}

// Function to update modal totals
function updateModalTotals() {
    const orderData = gatherOrderData();
    const vatRate = getVATRate(orderData.country, orderData.isVatRegistered);
    const vatAmount = calculateVAT(
        orderData.totalPrice,
        orderData.country,
        orderData.isVatRegistered,
    );
    const totalWithVAT = orderData.totalPrice + vatAmount;

    const modalTotalPrice = document.getElementById("modalTotalPrice");
    const modalVatAmount = document.getElementById("modalVatAmount");
    const modalTotalWithVAT = document.getElementById("modalTotalWithVAT");
    const modalTotalQuantity = document.getElementById("modalTotalQuantity");

    if (modalTotalPrice)
        modalTotalPrice.textContent = formatPrice(
            orderData.totalPrice,
            currentCurrency,
        );
    if (modalVatAmount)
        modalVatAmount.textContent = `${(vatRate * 100).toFixed(0)}% (${formatPrice(vatAmount, currentCurrency)})`;
    if (modalTotalWithVAT)
        modalTotalWithVAT.textContent = formatPrice(
            totalWithVAT,
            currentCurrency,
        );
    if (modalTotalQuantity)
        modalTotalQuantity.textContent = orderData.totalQuantity;
}

// Make functions available globally
window.showOrderPreview = showOrderPreview;
window.updateModalTotals = updateModalTotals;

// Add event listener for country change
window.addEventListener("load", () => {
    const countrySelect = document.getElementById("country");
    if (countrySelect) {
        countrySelect.addEventListener("change", () => {
            console.log("Country changed, updating totals");
            updateModalTotals();
        });
    }
});

function closeModal() {
    const modal = document.getElementById("orderModal");
    if (modal) {
        modal.style.display = "none";
    }
}

function toggleCategory(category) {
    const content = document.querySelector(
        `.category-content[data-category="${category}"]`,
    );
    const header = document.querySelector(
        `.category-header[data-category="${category}"]`,
    );
    const arrow = header.querySelector("svg");

    content.classList.toggle("collapsed");
    arrow.style.transform = content.classList.contains("collapsed")
        ? "rotate(180deg)"
        : "";
}

function changeCurrency() {
    currentCurrency = document.getElementById("currency").value;
    sortAndDisplayProducts();
}

function updateVATDisplay() {
    const country = document.getElementById("country").value;
    const isVatRegistered = !!document.getElementById("dic").value;
    const vatRate = getVATRate(country, isVatRegistered);

    document.getElementById("vatAmount").textContent =
        `${(vatRate * 100).toFixed(0)}%`;
    updateOrderSummary(currentCurrency);
}

// Event Listeners
window.addEventListener("load", () => {
    console.log("Window loaded");
    populateTable();

    document
        .getElementById("sort")
        .addEventListener("change", sortAndDisplayProducts);
    document
        .getElementById("currency")
        .addEventListener("change", changeCurrency);

    // Clear order button in header
    const clearOrderBtn = document.getElementById("clearOrderBtn");
    if (clearOrderBtn) {
        clearOrderBtn.addEventListener("click", () => {
            if (confirm("Opravdu chcete vymazat celou objednávku?")) {
                clearOrder();
            }
        });
    }

    // Preview order button in cart
    const previewOrderBtn = document.getElementById("previewOrderBtn");
    if (previewOrderBtn) {
        previewOrderBtn.addEventListener("click", showOrderPreview);
    }

    // Modal close button
    const closeModalButton = document.getElementById("closeModalButton");
    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeModal);
    }

    // Form validation and submission
    const orderForm = document.getElementById("orderForm");
    if (orderForm) {
        // Email validation
        const emailInput = document.getElementById("email");
        if (emailInput) {
            emailInput.addEventListener("blur", function () {
                if (!validateEmail(this.value)) {
                    this.classList.add("border-red-500");
                    alert("Prosím zadejte platný email.");
                } else {
                    this.classList.remove("border-red-500");
                }
            });
        }

        // Phone validation
        const phoneInput = document.getElementById("phone");
        if (phoneInput) {
            phoneInput.addEventListener("blur", function () {
                if (!validatePhoneNumber(this.value)) {
                    this.classList.add("border-red-500");
                    alert(
                        "Prosím zadejte platné telefonní číslo (minimálně 9 číslic, povolené znaky: +, -, (, )).",
                    );
                } else {
                    this.classList.remove("border-red-500");
                }
            });
        }

        // Load company info from ARES
        const loadCompanyInfoBtn = document.getElementById("loadCompanyInfo");
        if (loadCompanyInfoBtn) {
            loadCompanyInfoBtn.addEventListener("click", loadCompanyInfo);
        }

        // VAT display update
        const countrySelect = document.getElementById("country");
        const dicInput = document.getElementById("dic");
        if (countrySelect && dicInput) {
            countrySelect.addEventListener("change", updateVATDisplay);
            dicInput.addEventListener("input", updateVATDisplay);
        }
    }

    // Order confirmation
    const confirmOrderBtn = document.getElementById("confirmOrder");
    if (confirmOrderBtn) {
        confirmOrderBtn.addEventListener("click", async () => {
            const orderData = gatherOrderData();

            // Validate form
            if (!validateEmail(orderData.email)) {
                alert("Prosím zadejte platný email.");
                return;
            }

            if (!validatePhoneNumber(orderData.phone)) {
                alert("Prosím zadejte platné telefonní číslo.");
                return;
            }

            // Show loading state
            const modalContent = document.getElementById("modalContent");
            const modalActions = document.getElementById("modalActions");
            if (modalContent && modalActions) {
                modalActions.style.display = "none";
                modalContent.innerHTML = `
                    <div class="flex justify-center items-center p-8">
                        <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span class="ml-3 text-lg font-medium">Odesílání objednávky...</span>
                    </div>
                `;
            }

            try {
                await sendOrder(orderData, currentCurrency);
                closeModal();
            } catch (error) {
                console.error("Error sending order:", error);
                if (modalContent) {
                    modalContent.innerHTML = `
                        <div class="text-center text-red-600 p-4">
                            Došlo k chybě při odesílání objednávky. Prosím zkuste to znovu později.
                        </div>
                    `;
                }
                if (modalActions) {
                    modalActions.style.display = "flex";
                }
            }
        });
    }

    // Cancel order
    const cancelOrderBtn = document.getElementById("cancelOrder");
    if (cancelOrderBtn) {
        cancelOrderBtn.addEventListener("click", closeModal);
    }
});
