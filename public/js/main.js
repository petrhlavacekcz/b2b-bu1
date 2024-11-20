import { fetchGloves } from "./api.js";
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
    createGloveRow,
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

let allGloves = {
    senior: [],
    junior: [],
};
let currentCurrency = "CZK";

async function populateTable() {
    try {
        console.log("Starting data loading...");
        const seniorGloves = await fetchGloves("senior");
        const juniorGloves = await fetchGloves("junior");
        console.log("Senior data loaded:", seniorGloves);
        console.log("Junior data loaded:", juniorGloves);

        allGloves.senior = Object.entries(seniorGloves).filter(
            ([, product]) => {
                return Object.values(product.variants || {}).some(
                    (variant) => Object.values(variant.stock)[0] > 0,
                );
            },
        );
        allGloves.junior = Object.entries(juniorGloves).filter(
            ([, product]) => {
                return Object.values(product.variants || {}).some(
                    (variant) => Object.values(variant.stock)[0] > 0,
                );
            },
        );
        console.log("Filtered senior products:", allGloves.senior);
        console.log("Filtered junior products:", allGloves.junior);

        const seniorSizes = getVariantSizes(
            Object.fromEntries(allGloves.senior),
        );
        const juniorSizes = getVariantSizes(
            Object.fromEntries(allGloves.junior),
        );
        console.log("Available senior sizes:", seniorSizes);
        console.log("Available junior sizes:", juniorSizes);

        populateTableHeader("seniorGlovesTable", seniorSizes);
        populateTableHeader("juniorGlovesTable", juniorSizes);

        if (allGloves.senior.length === 0 && allGloves.junior.length === 0) {
            document.getElementById("loading").textContent =
                "No data to display.";
            return;
        }

        sortAndDisplayGloves();

        console.log("Tables populated with data.");
        document.getElementById("loading").style.display = "none";
        document.getElementById("seniorGlovesTable").style.display = "table";
        document.getElementById("juniorGlovesTable").style.display = "table";

        document
            .querySelectorAll(
                '#seniorGlovesTable input[type="number"], #juniorGlovesTable input[type="number"]',
            )
            .forEach((input) => {
                input.addEventListener("change", saveOrderQuantity);
            });

        updateOrderSummary(currentCurrency);
        addImageButtonListeners();
    } catch (error) {
        console.error("Error populating table:", error);
        document.getElementById("loading").textContent =
            "Error loading data. Please try again later.";
    }
}

function sortAndDisplayGloves() {
    const sortValue = document.getElementById("sort").value;

    // Sort senior gloves
    allGloves.senior.sort(([, a], [, b]) => {
        if (sortValue === "name") {
            return (a.text_fields.name || "").localeCompare(
                b.text_fields.name || "",
            );
        } else if (sortValue === "priceAsc" || sortValue === "priceDesc") {
            const priceA = getPrice(a.prices, true, currentCurrency);
            const priceB = getPrice(b.prices, true, currentCurrency);
            return sortValue === "priceAsc" ? priceA - priceB : priceB - priceA;
        }
    });

    // Sort junior gloves
    allGloves.junior.sort(([, a], [, b]) => {
        if (sortValue === "name") {
            return (a.text_fields.name || "").localeCompare(
                b.text_fields.name || "",
            );
        } else if (sortValue === "priceAsc" || sortValue === "priceDesc") {
            const priceA = getPrice(a.prices, true, currentCurrency);
            const priceB = getPrice(b.prices, true, currentCurrency);
            return sortValue === "priceAsc" ? priceA - priceB : priceB - priceA;
        }
    });

    populateGlovesTable("seniorGlovesTable", allGloves.senior);
    populateGlovesTable("juniorGlovesTable", allGloves.junior);
}

function populateGlovesTable(tableId, gloves) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = "";

    const glovesObj = Object.fromEntries(gloves);
    const sizes = getVariantSizes(glovesObj);

    gloves.forEach(([productId, product]) => {
        const isSenior = tableId === "seniorGlovesTable";
        tbody.appendChild(
            createGloveRow(
                productId,
                product,
                sizes,
                isSenior,
                currentCurrency,
            ),
        );
    });

    updateOrderSummary(currentCurrency);
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
    console.log("showOrderPreview called"); // Debug log
    const orderData = gatherOrderData();
    if (orderData.products.length === 0) {
        alert("Prosím vyberte alespoň jeden produkt do objednávky.");
        return;
    }

    if (!validateEmail(orderData.email)) {
        alert("Zadejte platný e-mail.");
        return;
    }

    if (!validatePhoneNumber(orderData.phone)) {
        alert(
            "Zadejte platné telefonní číslo (minimálně 9 číslic, povolené znaky: +, -, (, )).",
        );
        return;
    }

    const vatRate = getVATRate(orderData.country, orderData.isVatRegistered);
    const vatAmount = calculateVAT(
        orderData.totalPrice,
        orderData.country,
        orderData.isVatRegistered,
    );
    const totalWithVAT = orderData.totalPrice + vatAmount;

    const modal = document.getElementById("orderModal");
    const modalContent = document.getElementById("modalContent");

    // Make sure modal exists
    if (!modal || !modalContent) {
        console.error("Modal elements not found:", { modal, modalContent });
        return;
    }

    document.getElementById("modalTitle").textContent = "Náhled objednávky";

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
        <div class="mt-4">
            <p class="font-bold">Celková cena bez DPH: ${formatPrice(orderData.totalPrice, currentCurrency)}</p>
            <p>DPH ${(vatRate * 100).toFixed(0)}%: ${formatPrice(vatAmount, currentCurrency)}</p>
            <p class="font-bold">Celková cena s DPH: ${formatPrice(totalWithVAT, currentCurrency)}</p>
            <p>Celkový počet kusů: ${orderData.totalQuantity}</p>
            <p>Počet senior kusů: ${orderData.seniorQuantity}</p>
            <p>Počet junior kusů: ${orderData.juniorQuantity}</p>
        </div>
    `;

    document.getElementById("confirmOrder").style.display = "inline-block";
    document.getElementById("modalActions").style.display = "flex";

    // Show the modal by setting display style directly
    modal.style.display = "flex";

    console.log("Modal should be visible now"); // Debug log
}

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
    sortAndDisplayGloves();
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
    ];
    const passwordModal = document.getElementById("passwordModal");
    const passwordInput = document.getElementById("passwordInput");
    const submitPassword = document.getElementById("submitPassword");
    const passwordError = document.getElementById("passwordError");
    const mainContent = document.getElementById("mainContent");

    passwordModal.classList.remove("hidden");

    submitPassword.addEventListener("click", function () {
        const enteredPassword = passwordInput.value;

        if (!validPasswords.includes(enteredPassword)) {
            passwordError.classList.remove("hidden");
        } else {
            passwordError.classList.add("hidden");
            passwordModal.classList.add("hidden");
            mainContent.classList.remove("hidden");
        }
    });
});

window.addEventListener("load", () => {
    console.log("Window loaded");
    populateTable();

    document
        .getElementById("sort")
        .addEventListener("change", sortAndDisplayGloves);
    document
        .getElementById("currency")
        .addEventListener("change", changeCurrency);

    const loadCompanyInfoButton = document.getElementById("loadCompanyInfo");
    if (loadCompanyInfoButton) {
        loadCompanyInfoButton.addEventListener("click", loadCompanyInfo);
        console.log("Event listener added for loadCompanyInfo button");
    } else {
        console.error("loadCompanyInfo button not found");
    }

    // Add event listener for the submit order button
    const submitOrderButton = document.getElementById("submitOrder");
    if (submitOrderButton) {
        submitOrderButton.addEventListener("click", showOrderPreview);
        console.log("Event listener added for submitOrder button");
    } else {
        console.error("submitOrder button not found");
    }

    const confirmOrderButton = document.getElementById("confirmOrder");
    if (confirmOrderButton) {
        confirmOrderButton.addEventListener("click", async () => {
            document.getElementById("modalTitle").textContent = "";
            document.getElementById("modalActions").style.display = "none"; // Hide the action buttons

            document.getElementById("modalContent").innerHTML = `
                <div class="flex justify-center items-center">
                    <svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"></path>
                    </svg>
                </div>
            `;

            const orderData = gatherOrderData();
            await sendOrder(orderData, currentCurrency);
        });
    } else {
        console.error("confirmOrder button not found");
    }

    const cancelOrderButton = document.getElementById("cancelOrder");
    if (cancelOrderButton) {
        cancelOrderButton.addEventListener("click", closeModal);
    } else {
        console.error("cancelOrder button not found");
    }

    document.getElementById("email").addEventListener("blur", function () {
        if (!validateEmail(this.value)) {
            this.classList.add("border-red-500");
            alert("Please enter a valid email address.");
        } else {
            this.classList.remove("border-red-500");
        }
    });

    document.getElementById("phone").addEventListener("blur", function () {
        if (!validatePhoneNumber(this.value)) {
            this.classList.add("border-red-500");
            alert(
                "Please enter a valid phone number (minimum 9 digits, allowed characters: +, -, (, )).",
            );
        } else {
            this.classList.remove("border-red-500");
        }
    });

    document.querySelectorAll(".category-header").forEach((header) => {
        header.addEventListener("click", () => {
            const category = header.dataset.category;
            toggleCategory(category);
        });
    });

    document
        .getElementById("country")
        .addEventListener("change", updateVATDisplay);
    document.getElementById("dic").addEventListener("input", updateVATDisplay);

    document.getElementById("clearOrder").addEventListener("click", clearOrder);
});
