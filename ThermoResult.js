// ======================================
// API CONFIGURATION
// ======================================

// Local backend
const BASE_URL = "http://localhost:8080";

// Deployed backend (uncomment after frontend deployment)
// const BASE_URL = "https://thermofisher-crm-backend.onrender.com";


// ======================================
// GLOBAL VARIABLES
// ======================================

let currentOrderItems = [];
let productOptions = [];
let isProductEditMode = false;
let currentOrderNumber = "";
let currentOrderStatus = "";


// ======================================
// HELPER FUNCTIONS
// ======================================

// Format backend date without timezone conversion
function formatDate(value, includeTime = false) {

    if (!value) return "—";

    const match = String(value).match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (!match) return "—";

    const [, year, month, day, hours, minutes] = match;

    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const formattedDate =
        `${monthNames[Number(month) - 1]} ${Number(day)}, ${year}`;

    if (!includeTime || hours === undefined) {
        return formattedDate;
    }

    const hour = Number(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = String(hour % 12 || 12).padStart(2, "0");

    return `${formattedDate}, ${formattedHour}:${minutes} ${period}`;
}


// Escape backend text before inserting it into HTML
function escapeHTML(value) {

    return String(value ?? "—").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// Safely read a response body
async function readResponse(response) {

    const responseText = await response.text();

    if (!responseText) return {};

    try {
        return JSON.parse(responseText);
    } catch {
        throw new Error("Invalid response received from backend.");
    }
}


// Update the order price summary
function updateOrderSummary(order) {

    const fields = {
        summarySubtotal: order.subtotal,
        summaryDiscount: order.discountAmount,
        summaryShipping: order.shippingCharges,
        summaryTax: order.taxAmount,
        summaryGrandTotal: order.grandTotal,
        orderAmountVal: order.orderAmount
    };

    Object.entries(fields).forEach(([id, value]) => {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = value ?? "—";
        }
    });
}


// ======================================
// PRODUCT TABLE - NORMAL VIEW
// ======================================

function renderProductTable() {

    const productTableBody =
        document.getElementById("productTableBody");

    if (!productTableBody) return;

    productTableBody.innerHTML = "";

    if (!currentOrderItems.length) {

        productTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No products found.
                </td>
            </tr>
        `;

    } else {

        currentOrderItems.forEach(item => {

            const row = document.createElement("tr");

            const removeButton =
                currentOrderStatus?.toUpperCase() === "PROCESSING"
                    ? `
                        <button
                            type="button"
                            class="btn btn-outline btn-remove-product"
                            data-item-id="${escapeHTML(item.id)}">
                            Remove
                        </button>
                    `
                    : "—";

            row.innerHTML = `
                <td>${escapeHTML(item.productName)}</td>
                <td>${escapeHTML(item.productSku)}</td>
                <td>${escapeHTML(item.quantity)}</td>
                <td>${escapeHTML(item.unitOfMeasure)}</td>
                <td>${escapeHTML(item.unitPrice)}</td>
                <td>${escapeHTML(item.discountAmount)}</td>
                <td>${escapeHTML(item.lineTotal)}</td>
                <td>${removeButton}</td>
            `;

            productTableBody.appendChild(row);
        });
    }

    // Update product count
    const badge = document.getElementById("itemsCountBadge");

    if (badge) {
        badge.textContent = `${currentOrderItems.length} Items`;
    }

    // Attach Remove button events
    productTableBody
        .querySelectorAll(".btn-remove-product")
        .forEach(button => {

            button.addEventListener("click", () => {

                removeOrderItem(
                    button.dataset.itemId,
                    button
                );
            });
        });
}


// ======================================
// REMOVE PRODUCT FROM ORDER - DELETE API
// ======================================

async function removeOrderItem(itemId, button) {

    const item = currentOrderItems.find(
        product => Number(product.id) === Number(itemId)
    );

    if (!item) {
        alert("Product not found in this order.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to remove "${item.productName}" from this order?`
    );

    if (!confirmed) return;

    try {

        button.disabled = true;
        button.textContent = "Removing...";

        const response = await fetch(
            `${BASE_URL}/api/orders/${encodeURIComponent(currentOrderNumber)}/items/${encodeURIComponent(itemId)}`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        const updatedOrder = await readResponse(response);

        console.log("DELETE Status:", response.status);
        console.log("Updated Order:", updatedOrder);

        if (!response.ok) {

            throw new Error(
                updatedOrder.message ||
                updatedOrder.error ||
                "Failed to remove product."
            );
        }

        // Update products using backend response
        currentOrderItems = updatedOrder.orderItems ?? [];

        // Update order status
        currentOrderStatus =
            updatedOrder.orderStatus ?? currentOrderStatus;

        // Refresh product table
        renderProductTable();

        // Refresh order totals
        updateOrderSummary(updatedOrder);

        alert("Product removed successfully!");

    } catch (error) {

        console.error("Remove Product Error:", error);

        alert("Unable to remove product: " + error.message);

        button.disabled = false;
        button.textContent = "Remove";
    }
}


// ======================================
// PRODUCT TABLE - EDIT VIEW
// ======================================

function renderEditableProducts() {

    const productTableBody =
        document.getElementById("productTableBody");

    if (!productTableBody) return;

    productTableBody.innerHTML = "";

    if (!currentOrderItems.length) {

        productTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No products available to edit.
                </td>
            </tr>
        `;

        return;
    }

    currentOrderItems.forEach((item, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(item.productName)}</td>

            <td>${escapeHTML(item.productSku)}</td>

            <td>
                <input
                    type="number"
                    min="1"
                    step="1"
                    class="product-edit-input"
                    data-index="${index}"
                    data-field="quantity"
                    value="${escapeHTML(item.quantity ?? 1)}"
                >
            </td>

            <td>${escapeHTML(item.unitOfMeasure)}</td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="product-edit-input"
                    data-index="${index}"
                    data-field="unitPrice"
                    value="${escapeHTML(item.unitPrice ?? 0)}"
                >
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="product-edit-input"
                    data-index="${index}"
                    data-field="discountAmount"
                    value="${escapeHTML(item.discountAmount ?? 0)}"
                >
            </td>

            <td>${escapeHTML(item.lineTotal)}</td>

            <td>Editing</td>
        `;

        productTableBody.appendChild(row);
    });
}


// ======================================
// SAVE EDITED PRODUCTS - PATCH API
// ======================================

async function saveEditedProducts(orderNumber) {

    const updatedItems = currentOrderItems.map((item, index) => {

        const getValue = field => {

            const input = document.querySelector(
                `.product-edit-input[data-index="${index}"][data-field="${field}"]`
            );

            return input ? input.value : null;
        };

        const quantityValue = getValue("quantity");
        const unitPriceValue = getValue("unitPrice");
        const discountValue = getValue("discountAmount");

        const quantity = Number(quantityValue);
        const unitPrice = Number(unitPriceValue);
        const discountAmount = Number(discountValue);

        if (
            quantityValue === null ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            throw new Error(
                `Enter a valid quantity for ${item.productName}.`
            );
        }

        if (
            unitPriceValue === null ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            throw new Error(
                `Enter a valid unit price for ${item.productName}.`
            );
        }

        if (
            discountValue === null ||
            !Number.isFinite(discountAmount) ||
            discountAmount < 0 ||
            discountAmount > unitPrice
        ) {
            throw new Error(
                `Enter a valid discount for ${item.productName}.`
            );
        }

        if (item.id == null) {
            throw new Error(
                `Product ID is missing for ${item.productName}.`
            );
        }

        return {
            id: item.id,
            productName: item.productName,
            productSku: item.productSku,
            quantity: quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: unitPrice,
            discountAmount: discountAmount
        };
    });


    // Send PATCH request
    const response = await fetch(
        `${BASE_URL}/api/orders/${encodeURIComponent(orderNumber)}`,
        {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                orderItems: updatedItems
            })
        }
    );

    const updatedOrder = await readResponse(response);

    console.log("Product PATCH Status:", response.status);
    console.log("Updated Order:", updatedOrder);

    if (!response.ok) {

        throw new Error(
            updatedOrder.message ||
            updatedOrder.error ||
            "Failed to update products."
        );
    }

    // Update local product data using backend response
    currentOrderItems =
        updatedOrder.orderItems ?? updatedItems;

    currentOrderStatus =
        updatedOrder.orderStatus ?? currentOrderStatus;

    isProductEditMode = false;

    renderProductTable();

    // Update order totals
    updateOrderSummary(updatedOrder);

    // Restore Edit Products button
    const editProductsBtn =
        document.getElementById("editProductsBtn");

    if (editProductsBtn) {

        editProductsBtn.disabled = false;

        editProductsBtn.innerHTML = `
            <i data-lucide="pencil"></i>
            <span>Edit Products</span>
        `;
    }

    if (window.lucide) {
        lucide.createIcons();
    }

    alert("Products updated successfully!");
}


// ======================================
// MAIN PAGE INITIALIZATION
// ======================================

document.addEventListener("DOMContentLoaded", () => {


    // ======================================
    // GET ORDER NUMBER FROM URL
    // ======================================

    const params = new URLSearchParams(window.location.search);

    const orderNumber = params.get("orderNumber");

    console.log("Order Number:", orderNumber);

    if (!orderNumber) {

        console.error("Order number is missing from the URL.");

        alert("Order number not found.");

        return;
    }

    currentOrderNumber = orderNumber;


    // ======================================
    // EDIT MODE - STAGE 1
    // PO NUMBER AND ORDER STATE
    // ======================================

    const editModeBtn =
        document.getElementById("editModeBtn");

    const editableFieldIds = [
        "poNumber",
        "orderState"
    ];

    let isEditMode = false;

    const activeEditors = new Map();


    // ======================================
    // LOAD PRODUCT CATALOGUE
    // ======================================

    fetch(`${BASE_URL}/api/products`, {
        credentials: "include"
    })

        .then(response => {

            if (!response.ok) {
                throw new Error("Failed to load product catalogue.");
            }

            return response.json();
        })

        .then(products => {

            productOptions = products;

            console.log("Product Catalogue:", productOptions);
        })

        .catch(error => {

            console.error("Product Catalogue Error:", error);
        });


    // ======================================
    // ADD PRODUCT TO ORDER
    // ======================================

    const addProductBtn =
        document.getElementById("addProductBtn");

    const addProductForm =
        document.getElementById("addProductForm");

    const newProductSelect =
        document.getElementById("newProductSelect");

    const newProductQuantity =
        document.getElementById("newProductQuantity");

    const confirmAddProductBtn =
        document.getElementById("confirmAddProductBtn");

    const cancelAddProductBtn =
        document.getElementById("cancelAddProductBtn");


    // Populate dropdown using backend catalogue
    function populateProductDropdown() {

        if (!newProductSelect) return;

        newProductSelect.innerHTML =
            '<option value="">-- Select a Product --</option>';

        productOptions.forEach(product => {

            const option = document.createElement("option");

            option.value = product.id;

            option.textContent =
                `${product.productName} (${product.productSku}) - ${product.unitPrice}`;

            newProductSelect.appendChild(option);
        });
    }


    // Open Add Product form
    if (addProductBtn && addProductForm) {

        addProductBtn.addEventListener("click", () => {

            addProductForm.style.display = "flex";

            populateProductDropdown();
        });
    }


    // Cancel Add Product
    if (cancelAddProductBtn) {

        cancelAddProductBtn.addEventListener("click", () => {

            addProductForm.style.display = "none";

            if (newProductSelect) {
                newProductSelect.value = "";
            }

            if (newProductQuantity) {
                newProductQuantity.value = 1;
            }
        });
    }


    // Confirm Add Product
    if (confirmAddProductBtn) {

        confirmAddProductBtn.addEventListener("click", async () => {

            const productOptionId = newProductSelect?.value;

            const quantity = Number(newProductQuantity?.value);

            if (!productOptionId) {

                alert("Please select a product.");

                return;
            }

            if (!Number.isInteger(quantity) || quantity <= 0) {

                alert("Please enter a valid quantity.");

                return;
            }

            try {

                confirmAddProductBtn.disabled = true;

                confirmAddProductBtn.textContent = "Adding...";

                const response = await fetch(
                    `${BASE_URL}/api/orders/${encodeURIComponent(orderNumber)}/items`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            productOptionId: Number(productOptionId),
                            quantity: quantity
                        })
                    }
                );

                const result = await readResponse(response);

                console.log("Add Product Status:", response.status);
                console.log("Add Product Response:", result);

                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        result.error ||
                        "Unable to add product."
                    );
                }

                alert("Product added successfully!");

                // Reload order details from backend
                window.location.reload();

            } catch (error) {

                console.error("Add Product Error:", error);

                alert(error.message);

                confirmAddProductBtn.disabled = false;

                confirmAddProductBtn.innerHTML = `
                    <i data-lucide="plus"></i>
                    Add Product
                `;

                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        });
    }


    // ======================================
    // PRODUCT EDIT BUTTON
    // ======================================

    const editProductsBtn =
        document.getElementById("editProductsBtn");

    if (editProductsBtn) {

        editProductsBtn.addEventListener("click", async () => {

            // Enter product edit mode
            if (!isProductEditMode) {

                isProductEditMode = true;

                editProductsBtn.innerHTML = `
                    <i data-lucide="save"></i>
                    <span>Save Changes</span>
                `;

                renderEditableProducts();

                if (window.lucide) {
                    lucide.createIcons();
                }

                return;
            }


            // Save product changes
            try {

                editProductsBtn.disabled = true;

                editProductsBtn.textContent = "Saving...";

                await saveEditedProducts(orderNumber);

            } catch (error) {

                console.error("Product Update Error:", error);

                alert(error.message);

                editProductsBtn.disabled = false;

                editProductsBtn.innerHTML = `
                    <i data-lucide="save"></i>
                    <span>Save Changes</span>
                `;

                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        });
    }


    // ======================================
    // EDIT MODE - STAGE 2
    // INDIVIDUAL FIELD EDITING
    // ======================================

    editableFieldIds.forEach(fieldId => {

        const field = document.getElementById(fieldId);

        if (!field) return;

        const container =
            field.closest(".input-display-box");

        if (!container) return;


        // Create pencil button
        const editBtn = document.createElement("button");

        editBtn.type = "button";

        editBtn.className =
            "copy-field-btn edit-field-btn";

        editBtn.innerHTML =
            '<i data-lucide="pencil"></i>';

        editBtn.title = "Edit this field";

        editBtn.style.display = "none";

        container.appendChild(editBtn);


        // Click pencil button
        editBtn.addEventListener("click", () => {

            if (activeEditors.has(fieldId)) return;

            const originalValue =
                field.textContent.trim();

            const input = document.createElement("input");

            input.type = "text";

            input.className = "field-edit-input";

            input.value =
                originalValue === "—" ? "" : originalValue;


            // Save button
            const saveBtn = document.createElement("button");

            saveBtn.type = "button";

            saveBtn.textContent = "Save";

            saveBtn.className = "field-save-btn";


            // Cancel button
            const cancelBtn = document.createElement("button");

            cancelBtn.type = "button";

            cancelBtn.textContent = "Cancel";

            cancelBtn.className = "field-cancel-btn";


            field.style.display = "none";

            editBtn.style.display = "none";

            container.appendChild(input);

            container.appendChild(saveBtn);

            container.appendChild(cancelBtn);


            // Close editor
            function closeEditor() {

                input.remove();

                saveBtn.remove();

                cancelBtn.remove();

                field.style.display = "";

                editBtn.style.display =
                    isEditMode ? "inline-flex" : "none";

                activeEditors.delete(fieldId);
            }


            // Save individual field
            saveBtn.addEventListener("click", async () => {

                const updatedValue = input.value.trim();

                if (!updatedValue) {

                    alert("This field cannot be empty.");

                    input.focus();

                    return;
                }

                saveBtn.disabled = true;

                saveBtn.textContent = "Saving...";

                try {

                    const requestBody = {};

                    if (fieldId === "poNumber") {
                        requestBody.poNumber = updatedValue;
                    }

                    if (fieldId === "orderState") {
                        requestBody.state = updatedValue;
                    }


                    // PATCH request
                    const response = await fetch(
                        `${BASE_URL}/api/orders/${encodeURIComponent(orderNumber)}`,
                        {
                            method: "PATCH",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            credentials: "include",

                            body: JSON.stringify(requestBody)
                        }
                    );

                    const updatedOrder =
                        await readResponse(response);

                    console.log("PATCH Status:", response.status);

                    console.log("Updated Order:", updatedOrder);


                    if (!response.ok) {

                        throw new Error(
                            updatedOrder.message ||
                            updatedOrder.error ||
                            "Failed to update order."
                        );
                    }


                    // Update displayed field
                    const responseValue =
                        fieldId === "poNumber"
                            ? updatedOrder.poNumber
                            : updatedOrder.state;

                    field.textContent = responseValue ?? "—";


                    // Update totals
                    updateOrderSummary(updatedOrder);

                    // Update current status if applicable
                    currentOrderStatus =
                        updatedOrder.orderStatus ?? currentOrderStatus;

                    closeEditor();

                    alert("Order updated successfully!");

                } catch (error) {

                    console.error("Update Error:", error);

                    alert("Unable to update order: " + error.message);

                    saveBtn.disabled = false;

                    saveBtn.textContent = "Save";
                }
            });


            // Cancel individual field editing
            cancelBtn.addEventListener("click", () => {

                closeEditor();
            });


            activeEditors.set(fieldId, closeEditor);

            input.focus();
        });
    });


    // ======================================
    // EDIT MODE - STAGE 3
    // TOGGLE EDIT MODE
    // ======================================

    if (editModeBtn) {

        editModeBtn.addEventListener("click", () => {

            isEditMode = !isEditMode;


            // Cancel unfinished individual edits
            if (!isEditMode) {

                Array.from(activeEditors.values()).forEach(cancel => {
                    cancel();
                });
            }


            // Show or hide pencil buttons
            document.querySelectorAll(".edit-field-btn").forEach(btn => {

                btn.style.display =
                    isEditMode ? "inline-flex" : "none";
            });


            editModeBtn.setAttribute(
                "aria-pressed",
                String(isEditMode)
            );


            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }


    // ======================================
    // FETCH ORDER DETAILS
    // ======================================

    fetch(
        `${BASE_URL}/api/orders/search?orderNumber=${encodeURIComponent(orderNumber)}`,
        {
            credentials: "include"
        }
    )

        .then(response => {

            console.log("HTTP Status:", response.status);

            if (!response.ok) {
                throw new Error("Failed to fetch order details.");
            }

            return response.json();
        })

        .then(data => {

            console.log(
                "Backend Response:",
                JSON.stringify(data, null, 2)
            );


            // ======================================
            // GET ORDER
            // ======================================

            if (!data.results || data.results.length === 0) {
                throw new Error("Order not found.");
            }

            const order = data.results[0];

            currentOrderNumber = order.orderNumber;
            currentOrderStatus = order.orderStatus;


            // ======================================
            // CUSTOMER NAME
            // ======================================

            document.getElementById("headerCustomerName").textContent =
                order.customerName ?? "—";


            // ======================================
            // PRODUCT TABLE
            // ======================================

            currentOrderItems = order.orderItems ?? [];

            renderProductTable();


            // ======================================
            // SHIPPING ADDRESS
            // ======================================

            const ship = order.shipToAddress;

            if (ship) {

                document.getElementById("shipRecipient").textContent =
                    ship.recipientName ?? "—";

                document.getElementById("shipLine1").textContent =
                    ship.addressLine1 ?? "—";

                document.getElementById("shipLine2").textContent =
                    ship.addressLine2 ?? "—";

                document.getElementById("shipCity").textContent =
                    ship.city ?? "—";

                document.getElementById("shipState").textContent =
                    ship.state ?? "—";

                document.getElementById("shipZip").textContent =
                    ship.postalCode ?? "—";

                document.getElementById("shipCountry").textContent =
                    ship.country ?? "—";

            } else {

                document.getElementById("shipRecipient").textContent =
                    "Shipping address not available";
            }


            // ======================================
            // BILLING ADDRESS
            // ======================================

            const bill = order.billToAddress;

            if (bill) {

                document.getElementById("billRecipient").textContent =
                    bill.recipientName ?? "—";

                document.getElementById("billLine1").textContent =
                    bill.addressLine1 ?? "—";

                document.getElementById("billLine2").textContent =
                    bill.addressLine2 ?? "—";

                document.getElementById("billCity").textContent =
                    bill.city ?? "—";

                document.getElementById("billState").textContent =
                    bill.state ?? "—";

                document.getElementById("billZip").textContent =
                    bill.postalCode ?? "—";

                document.getElementById("billCountry").textContent =
                    bill.country ?? "—";

            } else {

                document.getElementById("billRecipient").textContent =
                    "Billing address not available";
            }


            // ======================================
            // ORDER SUMMARY
            // ======================================

            updateOrderSummary(order);


            // ======================================
            // PRIMARY ORDER DETAILS
            // ======================================

            document.getElementById("displayOrderNumber").textContent =
                order.orderNumber ?? "—";

            document.getElementById("accNumber").textContent =
                order.accountNumber ?? "—";

            document.getElementById("poNumber").textContent =
                order.poNumber ?? "—";

            document.getElementById("invoiceNumber").textContent =
                order.invoiceNumber ?? "—";

            document.getElementById("quoteNumber").textContent =
                order.quoteNumber ?? "—";

            document.getElementById("custName").textContent =
                order.customerName ?? "—";

            document.getElementById("orderState").textContent =
                order.state ?? "—";


            // ======================================
            // ORDER STATUS
            // ======================================

            document.getElementById("boxStatusBadge").textContent =
                order.orderStatus ?? "—";

            document.getElementById("statusVal").textContent =
                order.orderStatus ?? "—";

            document.getElementById("orderStatusPill").textContent =
                order.orderStatus ?? "—";


            // ======================================
            // ORDER AMOUNT AND DATES
            // ======================================

            document.getElementById("orderDateVal").textContent =
                formatDate(order.orderDate);

            document.getElementById("createdAtVal").textContent =
                formatDate(order.createdAt, true);

            document.getElementById("updatedAtVal").textContent =
                formatDate(order.updatedAt, true);


            console.log("Order details loaded successfully.");

        })

        .catch(error => {

            console.error("API Error:", error);

            alert("Unable to load order details: " + error.message);
        });


        
// ======================================
// ADDRESS EDITING AND COPY FUNCTIONALITY
// ======================================

const addressFields = {
    recipientName: "Recipient",
    addressLine1: "Line1",
    addressLine2: "Line2",
    city: "City",
    state: "State",
    postalCode: "Zip",
    country: "Country"
};

const addressConfig = {
    ship: {
        prefix: "ship",
        requestKey: "shipToAddress",
        editButton: "editShipBtn",
        saveButton: "saveShipBtn",
        cancelButton: "cancelShipBtn",
        form: "shipAddressForm",
        copyButton: "copyShipBtn"
    },
    bill: {
        prefix: "bill",
        requestKey: "billToAddress",
        editButton: "editBillBtn",
        saveButton: "saveBillBtn",
        cancelButton: "cancelBillBtn",
        form: "billAddressForm",
        copyButton: "copyBillBtn"
    }
};


// Get the displayed address
function getAddressFromDisplay(type) {

    const config = addressConfig[type];
    const address = {};

    Object.entries(addressFields).forEach(([field, suffix]) => {

        const element = document.getElementById(
            config.prefix + suffix
        );

        address[field] = element?.textContent.trim() || "";
    });

    return address;
}


// Display an address
function setAddressDisplay(type, address) {

    const config = addressConfig[type];

    Object.entries(addressFields).forEach(([field, suffix]) => {

        const element = document.getElementById(
            config.prefix + suffix
        );

        if (element) {
            element.textContent = address?.[field] || "—";
        }
    });
}


// Open address editor
function openAddressEditor(type) {

    const config = addressConfig[type];
    const address = getAddressFromDisplay(type);

    Object.entries(addressFields).forEach(([field, suffix]) => {

        const input = document.getElementById(
            config.prefix + suffix + "Input"
        );

        if (input) {
            input.value = address[field] === "—"
                ? ""
                : address[field];
        }
    });

    const addressBlock = document.getElementById(
        type + "AddressBlock"
    );

    const form = document.getElementById(config.form);

    if (addressBlock) addressBlock.style.display = "none";
    if (form) form.style.display = "block";
}


// Close address editor
function closeAddressEditor(type) {

    const config = addressConfig[type];

    const addressBlock = document.getElementById(
        type + "AddressBlock"
    );

    const form = document.getElementById(config.form);

    if (form) form.style.display = "none";
    if (addressBlock) addressBlock.style.display = "";
}


// Save address through PATCH API
async function saveAddress(type) {

    const config = addressConfig[type];

    const updatedAddress = {};

    Object.entries(addressFields).forEach(([field, suffix]) => {

        const input = document.getElementById(
            config.prefix + suffix + "Input"
        );

        updatedAddress[field] = input?.value.trim() ?? "";
    });

    if (
        !updatedAddress.recipientName ||
        !updatedAddress.addressLine1
    ) {
        alert("Recipient name and Address Line 1 are required.");
        return;
    }

    const saveButton = document.getElementById(config.saveButton);

    try {

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        const response = await fetch(
            `${BASE_URL}/api/orders/${encodeURIComponent(currentOrderNumber)}`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    [config.requestKey]: updatedAddress
                })
            }
        );

        const result = await readResponse(response);

        console.log("Address PATCH Status:", response.status);
        console.log("Address PATCH Response:", result);

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.error ||
                "Failed to update address."
            );
        }

        // Use the address returned by the backend
        const savedAddress = result[config.requestKey];

        setAddressDisplay(
            type,
            savedAddress || updatedAddress
        );

        closeAddressEditor(type);

        alert(
            type === "ship"
                ? "Shipping address updated successfully!"
                : "Billing address updated successfully!"
        );

    } catch (error) {

        console.error("Address Update Error:", error);

        alert("Unable to update address: " + error.message);

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save";
        }
    }
}


// Copy complete address
async function copyAddress(type) {

    const address = getAddressFromDisplay(type);

    const addressText = [
        address.recipientName,
        address.addressLine1,
        address.addressLine2,
        [
            address.city,
            address.state,
            address.postalCode
        ].filter(value => value && value !== "—").join(", "),
        address.country
    ]
        .filter(value => value && value !== "—")
        .join("\n");

    if (!addressText) {
        alert("No address available to copy.");
        return;
    }

    try {

        await navigator.clipboard.writeText(addressText);

        alert("Address copied successfully!");

    } catch (error) {

        console.error("Copy Address Error:", error);

        alert("Unable to copy address. Check browser clipboard permissions.");
    }
}



// Register address button events
function registerAddressEvents() {

    console.log("Registering address events...");

    Object.entries(addressConfig).forEach(([type, config]) => {

        const editButton = document.getElementById(config.editButton);
        const saveButton = document.getElementById(config.saveButton);
        const cancelButton = document.getElementById(config.cancelButton);
        const copyButton = document.getElementById(config.copyButton);

        console.log(type, {
            editButton,
            saveButton,
            cancelButton,
            copyButton
        });

        editButton?.addEventListener("click", () => {
            console.log(type + " edit clicked");
            openAddressEditor(type);
        });

        saveButton?.addEventListener("click", () => saveAddress(type));

        cancelButton?.addEventListener("click", () => closeAddressEditor(type));

        copyButton?.addEventListener("click", () => copyAddress(type));
    });
}

// Your script is loaded at the bottom of the HTML,
// so the DOM is already available.
registerAddressEvents();





// ======================================
// UNIVERSAL COPY FUNCTIONALITY
// ======================================

// Copy text to clipboard
async function copyText(text) {
    if (!text || !text.trim()) {
        console.warn("No information available to copy.");
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        console.log("Copied successfully!");
    } catch (error) {
        console.error("Clipboard Error:", error);
    }
}


// Get text from an HTML element
function getFieldValue(id) {

    const element = document.getElementById(id);

    return element?.textContent.trim() || "—";
}


// ======================================
// COPY INDIVIDUAL FIELDS
// ======================================

document.addEventListener("click", async (event) => {

    const button = event.target.closest(".copy-field-btn");

    if (!button || button.classList.contains("edit-field-btn")) {
        return;
    }

    const container = button.closest(".input-display-box");

    const valueElement = container?.querySelector(".value-text");

    if (!valueElement) return;

    await copyText(
        valueElement.textContent.trim(),
        "Field copied successfully!"
    );
});


// ======================================
// COPY ALL ORDER INFORMATION
// ======================================

const copyAllBtn = document.getElementById("copyAllBtn");

if (copyAllBtn) {

    copyAllBtn.addEventListener("click", async () => {

        const ship = getAddressFromDisplay("ship");
        const bill = getAddressFromDisplay("bill");

        // Format addresses
        function formatAddress(address) {

            return [
                address.recipientName,
                address.addressLine1,
                address.addressLine2,
                [
                    address.city,
                    address.state,
                    address.postalCode
                ].filter(value => value && value !== "—").join(", "),
                address.country
            ]
                .filter(value => value && value !== "—")
                .join("\n");
        }

        // Format all products
        const productsText = currentOrderItems.length

            ? currentOrderItems.map((item, index) => {

                return [
                    `${index + 1}. ${item.productName}`,
                    `SKU: ${item.productSku}`,
                    `Quantity: ${item.quantity}`,
                    `Unit: ${item.unitOfMeasure}`,
                    `Unit Price: ${item.unitPrice}`,
                    `Discount: ${item.discountAmount}`,
                    `Line Total: ${item.lineTotal}`
                ].join("\n");

            }).join("\n\n")

            : "No products available.";

        // Complete order information
        const orderText = `
ORDER MANAGEMENT SYSTEM
========================================

PRIMARY ORDER DETAILS

Order Number: ${getFieldValue("displayOrderNumber")}
Account Number: ${getFieldValue("accNumber")}
PO Number: ${getFieldValue("poNumber")}
Invoice Number: ${getFieldValue("invoiceNumber")}
Quote Number: ${getFieldValue("quoteNumber")}
Customer Name: ${getFieldValue("custName")}
State: ${getFieldValue("orderState")}


ORDER STATUS

Order Status: ${getFieldValue("statusVal")}
Order Amount: $${getFieldValue("orderAmountVal")}
Order Date: ${getFieldValue("orderDateVal")}
Created At: ${getFieldValue("createdAtVal")}
Updated At: ${getFieldValue("updatedAtVal")}


PRODUCT INFORMATION

${productsText}


SHIP TO ADDRESS

${formatAddress(ship) || "Shipping address not available."}


BILL TO ADDRESS

${formatAddress(bill) || "Billing address not available."}


ORDER PRICE SUMMARY

Subtotal: ${getFieldValue("summarySubtotal")}
Discount: ${getFieldValue("summaryDiscount")}
Shipping Charges: ${getFieldValue("summaryShipping")}
Tax Amount: ${getFieldValue("summaryTax")}
Grand Total: ${getFieldValue("summaryGrandTotal")}

========================================
        `.trim();

        await copyText(
            orderText,
            "Complete order information copied successfully!"
        );
    });
}



    
});




