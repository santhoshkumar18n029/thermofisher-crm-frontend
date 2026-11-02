



// const BASE_URL = "http://localhost:8080";
// Production URL (use when testing deployed frontend):

const BASE_URL = "https://thermofisher-crm-backend.onrender.com";


// ==========================================
// 2. USER INFORMATION
// ==========================================

const loggedInUser = sessionStorage.getItem("username");
const userElement = document.getElementById("loggedInUser");

if (userElement) {
    userElement.textContent = loggedInUser || "User";
}


// ==========================================
// 3. DOM ELEMENTS
// ==========================================

const orderInput = document.getElementById("order-num");
const orderSearchForm = document.getElementById("orderSearchForm");

const loadingState = document.getElementById("loadingState");
const searchMessage = document.getElementById("searchMessage");
const multipleResults = document.getElementById("multipleResults");

// Autocomplete and search results share this container.
const suggestionPanel = multipleResults;

let suggestionTimer;


// ==========================================
// 4. ORDER NUMBER AUTOCOMPLETE
// ==========================================

orderInput.addEventListener("input", function () {

    const value = orderInput.value.trim();

    clearTimeout(suggestionTimer);

    suggestionPanel.innerHTML = "";
    suggestionPanel.style.display = "none";

    // Start searching after 4 characters.
    if (value.length < 4) {
        return;
    }

    // Debounce: wait 300ms before calling the backend.
    suggestionTimer = setTimeout(() => {

        fetch(
            `${BASE_URL}/api/orders/suggestions?orderNumber=${encodeURIComponent(value)}`,
            { credentials: "include" }
        )
        .then(response => {

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();
        })
        .then(data => {

            // Ignore outdated responses.
            if (orderInput.value.trim() !== value) {
                return;
            }

            suggestionPanel.innerHTML = "";

            if (!Array.isArray(data) || data.length === 0) {
                return;
            }

            const heading = document.createElement("h3");
            heading.textContent = "Matching Orders — Select an order";

            suggestionPanel.appendChild(heading);

            data.forEach(orderNumber => {

                const card = document.createElement("div");
                card.className = "order-result-card";

                const orderText = document.createElement("strong");
                orderText.textContent = orderNumber;

                card.appendChild(orderText);

                // Select an order from suggestions.
                card.addEventListener("click", function () {

                    orderInput.value = orderNumber;

                    suggestionPanel.innerHTML = "";
                    suggestionPanel.style.display = "none";

                });

                suggestionPanel.appendChild(card);
            });

            suggestionPanel.style.display = "block";

        })
        .catch(error => {
            console.error("Suggestion search failed:", error);
        });

    }, 300);

});


// ==========================================
// 5. FORM RESET
// ==========================================

orderSearchForm.addEventListener("reset", function () {

    clearTimeout(suggestionTimer);

    suggestionPanel.innerHTML = "";
    suggestionPanel.style.display = "none";

    searchMessage.textContent = "";
    searchMessage.style.display = "none";

    loadingState.style.display = "none";

});


// ==========================================
// 6. ORDER SEARCH
// ==========================================

orderSearchForm.addEventListener("submit", function (event) {

    event.preventDefault();

    clearTimeout(suggestionTimer);

    // Clear autocomplete suggestions.
    suggestionPanel.innerHTML = "";
    suggestionPanel.style.display = "none";

    // Collect search criteria.
    const searchCriteria = {

        orderNumber: orderInput.value.trim(),

        poNumber: document.getElementById("po-num").value.trim(),

        invoiceNumber: document.getElementById("inv-num").value.trim(),

        quoteNumber: document.getElementById("quote-num").value.trim(),

        accountNumber: document.getElementById("acc-num-search").value.trim(),

        state: document.getElementById("state").value.trim()

    };


    // Check whether at least one field has a value.
    const hasSearchValue = Object.values(searchCriteria)
        .some(value => value !== "");

    if (!hasSearchValue) {

        searchMessage.textContent = "Please enter valid order details.";
        searchMessage.style.display = "block";

        return;
    }


    // Clear previous messages and results.
    searchMessage.textContent = "";
    searchMessage.style.display = "none";

    multipleResults.innerHTML = "";
    multipleResults.style.display = "none";


    // Build API query parameters.
    const params = new URLSearchParams();

    Object.entries(searchCriteria).forEach(([key, value]) => {

        if (value) {
            params.append(key, value);
        }

    });


    // Show loading indicator.
    loadingState.style.display = "block";


    // Send search request to Spring Boot backend.
    fetch(`${BASE_URL}/api/orders/search?${params.toString()}`, {
        credentials: "include"
    })

    .then(response => {

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();

    })

    .then(data => {

        loadingState.style.display = "none";

        console.log("Search response:", data);


        // No matching orders.
        if (data.resultCount === 0) {

            searchMessage.textContent =
                "No orders found. Please check your order details.";

            searchMessage.style.display = "block";

            return;
        }


        // Multiple matching orders.
        if (data.matchType === "MULTIPLE_MATCHES") {

            multipleResults.innerHTML = "";
            multipleResults.style.display = "block";

            const heading = document.createElement("h3");

            heading.textContent =
                "Multiple orders found. Please select an order.";

            multipleResults.appendChild(heading);


            data.results.forEach(order => {

                const card = document.createElement("div");
                card.className = "order-result-card";

                const orderNumber = document.createElement("strong");
                orderNumber.textContent = order.orderNumber;

                const details = document.createElement("span");

                details.textContent =
                    `${order.customerName} · ${order.orderStatus} · $${order.orderAmount}`;

                card.appendChild(orderNumber);
                card.appendChild(details);


                // Open selected order details.
                card.addEventListener("click", function () {

                    window.location.href =
                        `ThermoResult.html?orderNumber=${encodeURIComponent(order.orderNumber)}`;

                });

                multipleResults.appendChild(card);

            });

            return;
        }


        // Single matching order.
        if (data.resultCount === 1) {

            const order = data.results[0];

            window.location.href =
                `ThermoResult.html?orderNumber=${encodeURIComponent(order.orderNumber)}`;

        }

    })

    .catch(error => {

        loadingState.style.display = "none";


        // Handle different HTTP errors.
        if (error.message === "HTTP 401") {

            searchMessage.textContent =
                "Your session has expired. Please log in again.";

        }
        else if (error.message === "HTTP 403") {

            searchMessage.textContent =
                "You do not have permission to perform this search.";

        }
        else if (error.message === "HTTP 404") {

            searchMessage.textContent =
                "Search service was not found.";

        }
        else if (error.message === "HTTP 500") {

            searchMessage.textContent =
                "Something went wrong on the server. Please try again.";

        }
        else {

            searchMessage.textContent =
                "Unable to connect to the server. Please try again.";

        }

        searchMessage.style.display = "block";

        console.error("Search failed:", error);

    });

});
