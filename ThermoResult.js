const BASE_URL = "https://thermofisher-crm-backend.onrender.com";


// const BASE_URL = "http://localhost:8080";



function formatDate(value, includeTime = false) {
    if (!value) return "—";

    // Read the backend's date/time components without shifting timezones.
   
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



document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);
    const orderNumber = params.get("orderNumber");

    console.log("Order Number:", orderNumber);

  fetch(`${BASE_URL}/api/orders/search?orderNumber=${encodeURIComponent(orderNumber)}`, {
    credentials: "include"
})
        .then(response => {
            console.log("HTTP Status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Backend Response:", JSON.stringify(data, null, 2));

            const order = data.results[0];


            document.getElementById("headerCustomerName").textContent =
    order.customerName;

         const productTableBody = document.getElementById("productTableBody");
const itemsCountBadge = document.getElementById("itemsCountBadge");

productTableBody.innerHTML = "";

if (order.orderItems && order.orderItems.length > 0) {

    itemsCountBadge.textContent = `${order.orderItems.length} Items`;

    order.orderItems.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.productName}</td>
            <td>${item.productSku}</td>
            <td>${item.quantity}</td>
            <td>${item.unitOfMeasure}</td>
            <td>${item.unitPrice}</td>
            <td>${item.discountAmount}</td>
            <td>${item.lineTotal}</td>
        `;

        productTableBody.appendChild(row);
    });

} else {

    itemsCountBadge.textContent = "0 Items";

    productTableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center;">
                No products available for this order.
            </td>
        </tr>
    `;
}
    


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
// order summary section    


document.getElementById("summarySubtotal").textContent =
    order.subtotal ?? "—";

document.getElementById("summaryDiscount").textContent =
    order.discountAmount ?? "—";

document.getElementById("summaryShipping").textContent =
    order.shippingCharges ?? "—";

document.getElementById("summaryTax").textContent =
    order.taxAmount ?? "—";

document.getElementById("summaryGrandTotal").textContent =
    order.grandTotal ?? "—";



   
    document.getElementById("displayOrderNumber").textContent = order.orderNumber;
    order.orderNumber ?? "—";

    document.getElementById("accNumber").textContent = order.accountNumber;
    order.accountNumber ?? "—";
    document.getElementById("poNumber").textContent = order.poNumber;
    order.poNumber ?? "—";
    document.getElementById("invoiceNumber").textContent = order.invoiceNumber;
     order.invoiceNumber ?? "—";
    document.getElementById("quoteNumber").textContent = order.quoteNumber;
    order.quoteNumber ?? "—";
    document.getElementById("custName").textContent = order.customerName;
        order.customerName ?? "—";
    document.getElementById("orderState").textContent = order.state;
    order.state ?? "—";

    document.getElementById("boxStatusBadge").textContent = order.orderStatus;
    order.orderStatus ?? "—";
    document.getElementById("statusVal").textContent = order.orderStatus;
    order.orderStatus ?? "—";
    document.getElementById("orderStatusPill").textContent = order.orderStatus;
    order.orderStatus ?? "—";

    document.getElementById("orderAmountVal").textContent = order.orderAmount;
    order.orderAmount ?? "—";

document.getElementById("orderDateVal").textContent =
    formatDate(order.orderDate);

document.getElementById("createdAtVal").textContent =
    formatDate(order.createdAt, true);

document.getElementById("updatedAtVal").textContent =
    formatDate(order.updatedAt, true);

           
        })

        
        .catch(error => {
            console.error("API Error:", error);
        });

});