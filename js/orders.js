// BASE URL for API Gateway
const BASE_URL = "https://7yxsn0k61g.execute-api.us-east-2.amazonaws.com/";

// PUT /orders --> add new order
document.getElementById("orderForm").addEventListener("submit", function(event) {
    event.preventDefault(); // prevent page reload

    // Collect form values
    const tableNumber = document.getElementById("tableNumber").value;
    const dishName = document.getElementById("dishName").value;
    const dishType = document.getElementById("dishType").value;
    const quantity = document.getElementById("quantity").value;

    //Build order object
    const order = {
        orderId: "order-" + Date.now(), // Unique order ID
        tableNumber: parseInt(tableNumber, 10),
        dishName: dishName,
        dishType: dishType,
        quantity: parseInt(quantity, 10),
        timestamp: new Date().toISOString()
    };

    // Send PUT request to add order
    let xhr = new XMLHttpRequest();
    xhr.open("PUT", BASE_URL + "/orders");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = function() {
        document.getElementById("message").innerText = 
            "Server response: " + xhr.responseText;
    };

    xhr.onerror = function() {
        document.getElementById("message").innerText = 
            "Error sending request";
    }

    xhr.send(JSON.stringify(order));
})
