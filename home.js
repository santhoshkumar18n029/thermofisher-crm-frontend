


const BASE_URL = "https://thermofisher-crm-backend.onrender.com";


// const BASE_URL = "http://localhost:8080";


const loggedInUser = sessionStorage.getItem("username");
const userElement = document.getElementById("loggedInUser");

if (userElement) {
    userElement.textContent = loggedInUser || "User";
}




const orderInput = document.getElementById("order-num");

orderInput.addEventListener("input", function () {

    const value = orderInput.value.trim();

    if (!value) {
        return;
    }

    fetch(`${BASE_URL}/api/orders/suggestions?orderNumber=${encodeURIComponent(value)}`, {
        credentials: "include"
    })
        .then(response => response.json())
        .then(data => {

            console.log("Suggestions:", data);

        })
        .catch(error => {
            console.error("Suggestion search failed:", error);
        });
});



const orderSearchForm = document.getElementById("orderSearchForm");
const loadingState = document.getElementById("loadingState");
const searchMessage = document.getElementById("searchMessage");
const multipleResults = document.getElementById("multipleResults");

orderSearchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const searchCriteria = {
        orderNumber: document.getElementById("order-num").value.trim(),
        poNumber: document.getElementById("po-num").value.trim(),
        invoiceNumber: document.getElementById("inv-num").value.trim(),
        quoteNumber: document.getElementById("quote-num").value.trim(),
        accountNumber: document.getElementById("acc-num-search").value.trim(),
        state: document.getElementById("state").value.trim()
    };

const hasSearchValue = Object.values(searchCriteria).some(value => value);

if (!hasSearchValue) {
    searchMessage.textContent = "Please enter valid order details";
    searchMessage.style.display = "block";
    return;
}

searchMessage.style.display = "none";

    const params = new URLSearchParams();

    Object.entries(searchCriteria).forEach(([key, value]) => {
        if (value) {
            params.append(key, value);
        }
    });

    multipleResults.style.display = "none";
    multipleResults.innerHTML = "";

    loadingState.style.display = "block";

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

            console.log(data);

            if (data.resultCount === 0) {
    searchMessage.textContent =
        "No orders found. Please check your order details.";
    searchMessage.style.display = "block";
    return;
} 



if (data.matchType === "MULTIPLE_MATCHES") {

    multipleResults.innerHTML = "";
    multipleResults.style.display = "block";

    const heading = document.createElement("h3");
    heading.textContent = "Multiple orders found. Please select an order.";

    multipleResults.appendChild(heading);

    data.results.forEach(order => {

        const card = document.createElement("div");
        card.className = "order-result-card";

        card.innerHTML = `
            <strong>${order.orderNumber}</strong>
            <span>
                ${order.customerName} · ${order.orderStatus} · $${order.orderAmount}
            </span>
        `;

        card.addEventListener("click", function () {

            window.location.href =
                `ThermoResult.html?orderNumber=${encodeURIComponent(order.orderNumber)}`;

        });

        multipleResults.appendChild(card);
    });

    return;
}

            if (data.resultCount === 1) {

                const order = data.results[0];

                window.location.href =
                    `ThermoResult.html?orderNumber=${encodeURIComponent(order.orderNumber)}`;

            }

        })
        .catch(error => {

    loadingState.style.display = "none";

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