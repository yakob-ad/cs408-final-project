// BASE URL for API Gateway
const BASE_URL = "https://7yxsn0k61g.execute-api.us-east-2.amazonaws.com/";

// PUT /orders --> add new order
document.getElementById("orderForm").addEventListener("submit", function(event) {
    event.preventDefault(); // prevent page reload

    // Collect form values
    const tableNumber = document.getElementById("tableNumber").value;
    const dishSelect = document.getElementById("dishNameSelect");
    const dishName = dishSelect.value;
    const dishType = dishSelect.options[dishSelect.selectedIndex].dataset.type;
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
            "New Order for \"" + dishName + "\" Submitted";

        // Clear Form after successful submission
        document.getElementById("orderForm").reset();
    };

    xhr.onerror = function() {
        document.getElementById("message").innerText = 
            "Error sending request";
    }

    xhr.send(JSON.stringify(order));
})


function loadDishNames() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "/recipes");
  xhr.onload = function () {
    if (xhr.status === 200) {
      const recipes = JSON.parse(xhr.response);
      const dishSelect = document.getElementById("dishNameSelect");

      recipes.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.dishName;
        opt.textContent = r.dishName;
        opt.dataset.type = r.dishType; // store dishType for later
        dishSelect.appendChild(opt);
      });
    } else {
      console.error("Failed to load recipes:", xhr.status);
    }
  };
  xhr.send();
}

window.onload = function () {
  loadDishNames();
};
