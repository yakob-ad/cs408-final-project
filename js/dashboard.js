// BASE URL for API Gateway
const BASE_URL = "https://7yxsn0k61g.execute-api.us-east-2.amazonaws.com/";

// -------------------- LOAD ALL ORDERS --------------------
// Manual load triggered by "Retrieve Orders" button
document.getElementById("retrieveOrdersBtn").onclick = function () {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", BASE_URL + "/orders"); // GET all orders
    xhr.onload = function () {
        if (xhr.status === 200) {
            const orders = JSON.parse(xhr.response);
            populateOrdersTable(orders); // render into table
        } else {
            alert("Failed to load orders: " + xhr.status);
        }
    };
    xhr.send();
};

// -------------------- POPULATE TABLE --------------------
// Helper: render orders into <tbody>, keep <thead> intact
function populateOrdersTable(orders) {
  const tbody = document.querySelector("#orderTable tbody");
  tbody.innerHTML = ""; // clear existing rows

  orders.forEach(order => {
    const row = tbody.insertRow();

    // Basic order details
    row.insertCell(0).innerText = order.orderId;
    row.insertCell(1).innerText = order.tableNumber;
    row.insertCell(2).innerText = order.dishName;
    row.insertCell(3).innerText = order.dishType;
    row.insertCell(4).innerText = order.quantity;

    // Timestamp cell: human-readable + hidden epoch for sorting
    const tsCell = row.insertCell(5);
    tsCell.innerText = new Date(order.timestamp).toLocaleString();
    tsCell.dataset.sortValue = String(new Date(order.timestamp).getTime());

    // Action cell: Delete + Finish buttons
    const actionCell = row.insertCell(6);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete");
    deleteBtn.innerText = "Delete";
    deleteBtn.onclick = function () {
      deleteOrder(order.orderId, row);
    };
    actionCell.appendChild(deleteBtn);

    // Finish button
    const finishBtn = document.createElement("button");
    finishBtn.classList.add("finish");
    finishBtn.innerText = "Finish";
    finishBtn.onclick = function () {
      finishOrder(order, row);
    };
    actionCell.appendChild(finishBtn);
  });
}

// -------------------- DELETE ORDER --------------------
// DELETE /orders/{orderId} and remove row from table
function deleteOrder(orderId, row) {
    let xhr = new XMLHttpRequest();
    xhr.open("DELETE", BASE_URL + "/orders/" + orderId);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        if (xhr.status === 200) {
            row.remove(); // remove row from DOM
        } else {
            alert("Failed to delete order: " + xhr.status);
        }
    };
    xhr.send();
}

// -------------------- FINISH ORDER --------------------
// FINISH /orders/{orderId}
// Deletes the order AND decrements inventory based on its recipe
function finishOrder(order, row) {
  // Step 1: Delete the order itself
  let xhrDelete = new XMLHttpRequest();
  xhrDelete.open("DELETE", BASE_URL + "/orders/" + order.orderId);
  xhrDelete.setRequestHeader("Content-Type", "application/json");
  xhrDelete.onload = function () {
    if (xhrDelete.status === 200) {
      row.remove(); // remove row from table

      // Step 2: Fetch the recipe for this dish
      let xhrRecipe = new XMLHttpRequest();
      xhrRecipe.open("GET", BASE_URL + "/recipes/" + encodeURIComponent(generateRecipeId(order.dishName)));
      xhrRecipe.onload = function () {
        if (xhrRecipe.status === 200) {
          const recipe = JSON.parse(xhrRecipe.response);

          // Step 3: Loop through recipe ingredients
          recipe.ingredients.forEach((ingredientId, i) => {
            const amountNeeded = recipe.amounts[i] * order.quantity;
            const unit = recipe.units[i];

            // Step 4: Fetch current ingredient stock
            let xhrIngredient = new XMLHttpRequest();
            xhrIngredient.open("GET", BASE_URL + "/ingredients/" + encodeURIComponent(ingredientId));
            xhrIngredient.onload = function () {
              if (xhrIngredient.status === 200) {
                const ingredient = JSON.parse(xhrIngredient.response);

                // Step 5: Subtract the required amount
                const newQuantity = ingredient.quantity - amountNeeded;
                if (newQuantity < 0) {
                  alert("Warning: not enough " + ingredient.name + " in stock!");
                  return;
                }

                const updatedIngredient = {
                  ingredientId: ingredient.ingredientId,
                  name: ingredient.name,
                  quantity: newQuantity,
                  unit: unit,
                  lastUpdated: new Date().toISOString()
                };

                // Step 6: PUT updated ingredient back
                let xhrUpdate = new XMLHttpRequest();
                xhrUpdate.open("PUT", BASE_URL + "/ingredients");
                xhrUpdate.setRequestHeader("Content-Type", "application/json");
                xhrUpdate.onload = function () {
                  if (xhrUpdate.status !== 200) {
                    console.error("Failed to update ingredient:", xhrUpdate.status);
                  }
                };
                xhrUpdate.send(JSON.stringify(updatedIngredient));
              } else {
                console.error("Failed to fetch ingredient:", xhrIngredient.status);
              }
            };
            xhrIngredient.send();
          });
        } else {
          console.error("Failed to fetch recipe:", xhrRecipe.status);
        }
      };
      xhrRecipe.send();
    } else {
      alert("Failed to finish order: " + xhrDelete.status);
    }
  };
  xhrDelete.send();
}

// Generate a recipe ID from the name
function generateRecipeId(name) {
  return "rec-" + name.trim().toLowerCase().replace(/\s+/g, "-");
}

// -------------------- AUTO REFRESH --------------------
// Refresh orders every 15 seconds, respecting filters + sort
setInterval(() => {
  refreshOrders();
}, 15000);

let currentSort = { column: null, type: null };

// -------------------- SORTING --------------------
// Sort table rows by column index and type (string/number/date)
function sortTable(columnIndex, type) {
  currentSort = { column: columnIndex, type: type };

  const tbody = document.querySelector("#orderTable tbody");
  const rows = Array.from(tbody.rows);

  rows.sort((a, b) => {
    let valA = a.cells[columnIndex].innerText;
    let valB = b.cells[columnIndex].innerText;

    if (type === "number") return Number(valA) - Number(valB);
    if (type === "date") {
      const aEpoch = Number(a.cells[columnIndex].dataset.sortValue || 0);
      const bEpoch = Number(b.cells[columnIndex].dataset.sortValue || 0);
      return aEpoch - bEpoch;
    }
    return valA.localeCompare(valB);
  });

  // Rebuild tbody with sorted rows
  tbody.innerHTML = "";
  rows.forEach(row => tbody.appendChild(row));
}

// Helper: reapply last sort after refresh
function reapplySort() {
  if (currentSort.column !== null) {
    sortTable(currentSort.column, currentSort.type);
  }
}

// -------------------- FILTERING --------------------
// Apply filter when "Apply Filter" button is clicked
document.getElementById("applyFilterBtn").onclick = function () {
  const tableValue = document.getElementById("tableSelect").value;
  const dishTypeValue = document.getElementById("dishTypeSelect").value;
  let url = BASE_URL + "/orders";

  // Build query string based on selected filters
  const params = [];
  if (tableValue) {
    params.push("tableNumber=" + encodeURIComponent(tableValue));
  }
  if (dishTypeValue) {
    params.push("dishType=" + encodeURIComponent(dishTypeValue));
  }
  if (params.length > 0) {
    url += "?" + params.join("&");
  }

  // GET request with filters applied
  let xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.onload = function () {
    if (xhr.status === 200) {
      const orders = JSON.parse(xhr.response);
      populateOrdersTable(orders);
    } else {
      alert("Failed to load filtered orders: " + xhr.status);
    }
  };
  xhr.send();
};

// -------------------- LOAD DISH TYPES --------------------
// Populate dish type dropdown dynamically from existing orders
function loadDishTypes() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "/orders");
  xhr.onload = function () {
    if (xhr.status === 200) {
      const orders = JSON.parse(xhr.response);

      // Extract unique dish types
      const dishTypes = [...new Set(orders.map(o => o.dishType))];

      const dishTypeSelect = document.getElementById("dishTypeSelect");

      // Append dish type options dynamically
      dishTypes.forEach(type => {
        const opt = document.createElement("option");
        opt.value = type;       // value matches DB exactly
        opt.textContent = type;
        dishTypeSelect.appendChild(opt);
      });
    } else {
      console.error("Failed to load dish types:", xhr.status);
    }
  };
  xhr.send();
}

// -------------------- REFRESH WITH FILTERS --------------------
// Auto-refresh helper: respects current filters + reapplies sort
function refreshOrders() {
  const tableValue = document.getElementById("tableSelect").value;
  const dishTypeValue = document.getElementById("dishTypeSelect").value;
  let url = BASE_URL + "/orders";

  const params = [];
  if (tableValue) params.push("tableNumber=" + encodeURIComponent(tableValue));
  if (dishTypeValue) params.push("dishType=" + encodeURIComponent(dishTypeValue));
  if (params.length > 0) url += "?" + params.join("&");

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.onload = function () {
    if (xhr.status === 200) {
      const orders = JSON.parse(xhr.response);
      populateOrdersTable(orders);

      // Reapply current sort after refresh
      reapplySort();
    } else {
      console.error("Failed to refresh orders:", xhr.status);
    }
  };
  xhr.send();
}

// -------------------- INITIALIZATION --------------------
// Load dish types once when page loads
window.onload = function () {
  loadDishTypes();
  document.getElementById("retrieveOrdersBtn").click(); // auto-load orders table
};
