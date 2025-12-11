// BASE URL for API Gateway
const BASE_URL = "https://7yxsn0k61g.execute-api.us-east-2.amazonaws.com/";

// -------------------- MESSAGE DISPLAY --------------------
// Helper: show status/info messages in <p id="message">
function showMessage(text, color = "black") {
  const msg = document.getElementById("message");
  msg.innerText = text;
  msg.style.color = color;

  // Clear this message after 5 seconds
  setTimeout(() => {
    msg.innerText = "";
  }, 5000);
}

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
        showMessage("Failed to load orders: " + xhr.status, "red");
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
        showMessage("Order " + orderId + " deleted successfully.", "green");
      } else {
        showMessage("Failed to delete order: " + xhr.status, "red");
      }
    };
    xhr.send();
}

// -------------------- FINISH ORDER --------------------
// FINISH /orders/{orderId}
// Deletes the order AND decrements inventory based on its recipe
function finishOrder(order, row) {
  // -------------------- STEP 1: Fetch recipe first --------------------
  let xhrRecipe = new XMLHttpRequest();
  xhrRecipe.open("GET", BASE_URL + "/recipes/" + encodeURIComponent(generateRecipeId(order.dishName)));
  xhrRecipe.onload = function () {
    if (xhrRecipe.status !== 200) {
      showMessage("Failed to fetch recipe: " + xhrRecipe.status, "red");
      return;
    }

    const recipe = JSON.parse(xhrRecipe.response);
    const stagedUpdates = [];   // store updates here
    let allGood = true;         // flag for validation
    let pending = recipe.ingredients.length; // counter for async checks

    // -------------------- STEP 2: Check all ingredients --------------------
    recipe.ingredients.forEach((ingredientId, i) => {
      const amountNeeded = recipe.amounts[i] * order.quantity;
      const unit = recipe.units[i];

      let xhrIngredient = new XMLHttpRequest();
      xhrIngredient.open("GET", BASE_URL + "/ingredients/" + encodeURIComponent(ingredientId));
      xhrIngredient.onload = function () {
        pending--;

        if (xhrIngredient.status === 200) {
          // Try to parse ingredient
          let ingredient;
          try {
            ingredient = JSON.parse(xhrIngredient.response);
          } catch (e) {
            showMessage("Ingredient " + ingredientId + " not found.", "red");
            allGood = false;
          }

          // Extra guard: ensure ingredient object is valid
          if (!ingredient || !ingredient.ingredientId) {
            showMessage("Ingredient " + ingredientId + " not found.", "red");
            allGood = false;
          } else {
            const newQuantity = ingredient.quantity - amountNeeded;

            if (newQuantity < 0) {
              showMessage("Not enough " + ingredient.name + " in stock!", "red");
              allGood = false;
            } else {
              stagedUpdates.push({
                ingredientId: ingredient.ingredientId,
                name: ingredient.name,
                quantity: newQuantity,
                unit: unit,
                lastUpdated: new Date().toISOString()
              });
            }
          }
        } else {
          showMessage("Ingredient " + ingredientId + " not found.", "red");
          allGood = false;
        }

        // -------------------- STEP 3: After all checks are done --------------------
        if (pending === 0) {
          if (!allGood) return; // abort if any failed

          // -------------------- STEP 4: Delete order --------------------
          let xhrDelete = new XMLHttpRequest();
          xhrDelete.open("DELETE", BASE_URL + "/orders/" + order.orderId);
          xhrDelete.onload = function () {
            if (xhrDelete.status === 200) {
              // -------------------- STEP 5: Apply staged updates --------------------
              stagedUpdates.forEach(upd => {
                let xhrUpdate = new XMLHttpRequest();
                xhrUpdate.open("PUT", BASE_URL + "/ingredients");
                xhrUpdate.setRequestHeader("Content-Type", "application/json");
                xhrUpdate.send(JSON.stringify(upd));
              });

              row.remove();
              showMessage("Order " + order.orderId + " finished and inventory updated.", "green");
            } else {
              showMessage("Failed to finish order: " + xhrDelete.status, "red");
            }
          };
          xhrDelete.send();
        }
      };
      xhrIngredient.send();
    });
  };
  xhrRecipe.send();
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
      showMessage("Failed to load filtered orders: " + xhr.status, "red");
    }
  };
  xhr.send();
};

// -------------------- UPDATE DISH TYPE DROPDOWN --------------------
// Refreshes the dish type <select> element based on the current list of orders
function updateDishTypeDropdown(orders) {
  // Extract unique dish types from orders
  const dishTypes = [...new Set(orders.map(o => o.dishType))];

  // Grab the <select> element
  const dishTypeSelect = document.getElementById("dishTypeSelect");

  // Clear existing options and restore the default placeholder
  dishTypeSelect.innerHTML = '<option value="">-- All Dish Types --</option>';

  // Add each unique dish type as an option
  dishTypes.forEach(type => {
    const opt = document.createElement("option");
    opt.value = type;       // backend value
    opt.textContent = type; // user-facing text
    dishTypeSelect.appendChild(opt);
  });
}

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

      // Refresh dish type dropdown
      updateDishTypeDropdown(orders);
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
