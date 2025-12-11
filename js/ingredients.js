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

// -------------------- ID GENERATION --------------------
// Generate a stable ingredient ID from the name
function generateIngredientId(name) {
  return "ing-" + name.trim().toLowerCase().replace(/\s+/g, "-");
}

// -------------------- LOAD ALL INGREDIENTS --------------------
// Retrieve all ingredients from backend and populate table + dropdown
document.getElementById("retrieveIngredientsBtn").onclick = function () {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "/ingredients"); // GET all ingredients
  xhr.onload = function () {
    if (xhr.status === 200) {
      const ingredients = JSON.parse(xhr.response);
      populateIngredientsTable(ingredients); // render into table
      populateIngredientDropdown(ingredients); // update ingredients dropdown
    } else {
      showMessage("Failed to load ingredients: " + xhr.status, "red");
    }
  };
  xhr.send();
};

document.getElementById("addIngredientForm").onsubmit = function (e) {
  e.preventDefault(); // prevent page reload

  const name = document.getElementById("ingredientNameInput").value.trim();
  const quantity = document.getElementById("ingredientQuantityInput").value;
  const unit = document.getElementById("ingredientUnitSelect").value;

  const newIngredient = {
    ingredientId: generateIngredientId(name),
    name: name,
    quantity: Number(quantity),
    unit: unit,
    lastUpdated: new Date().toISOString()
  };

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", BASE_URL + "/ingredients");
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onload = function () {
    if (xhr.status === 200) {
      showMessage("Ingredient \"" + newIngredient.name + "\" added successfully!", "green");
      e.target.reset(); // clears the form
      document.getElementById("retrieveIngredientsBtn").click();
    } else {
      showMessage("Failed to add ingredient: " + xhr.status, "red");
    }
  };
  xhr.send(JSON.stringify(newIngredient));
};

// -------------------- POPULATE INGREDIENTS TABLE --------------------
// Render ingredient list into table rows with delete buttons
function populateIngredientsTable(items) {
  const tbody = document.querySelector("#ingredientsTable tbody");
  tbody.innerHTML = "";

  items.forEach(item => {
    const row = tbody.insertRow();

    // Ingredient details
    row.insertCell(0).innerText = item.ingredientId;
    row.insertCell(1).innerText = item.name;
    row.insertCell(2).innerText = item.quantity;
    row.insertCell(3).innerText = item.unit;

    // Last Updated column: format ISO timestamp if present
    const lastUpdatedCell = row.insertCell(4);
    if (item.lastUpdated) {
      lastUpdatedCell.innerText = new Date(item.lastUpdated).toLocaleString();
      lastUpdatedCell.dataset.sortValue = String(new Date(item.lastUpdated).getTime());
    } else {
      lastUpdatedCell.innerText = "—"; // placeholder if missing
      lastUpdatedCell.dataset.sortValue = "0";
    }

    // Deletion
    const deleteCell = row.insertCell(5);
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "Delete";
    deleteBtn.classList.add("delete");
    deleteBtn.onclick = function () {
      deleteIngredient(item, row);
    };
    deleteCell.appendChild(deleteBtn);
  });
}

// -------------------- DELETE INGREDIENT --------------------
// Delete ingredient from backend and update table + dropdown
function deleteIngredient(ingredient, row) {
  let xhr = new XMLHttpRequest();
  xhr.open("DELETE", BASE_URL + "/ingredients/" + encodeURIComponent(ingredient.ingredientId));
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onload = function () {
    if (xhr.status === 200) {
      row.remove(); // remove row from DOM
      showMessage("Ingredient \"" + ingredient.name + "\" deleted successfully.", "green");
      
      // Remove from cache
      cachedIngredients = cachedIngredients.filter(i => i.ingredientId !== ingredient.ingredientId);

      // Refresh dropdown
      populateIngredientDropdown(cachedIngredients);
    } else {
      showMessage("Failed to delete ingredient: " + xhr.status, "red");
    }
  };
  xhr.send();
}

let currentIngredientSort = { column: null, type: null };

// -------------------- SORTING --------------------
// Sort ingredients table rows by column index and type (string/number/date)
function sortIngredients(columnIndex, type) {
  currentIngredientSort = { column: columnIndex, type: type };

  const tbody = document.querySelector("#ingredientsTable tbody");
  const rows = Array.from(tbody.rows);

  rows.sort((a, b) => {
    let valA = a.cells[columnIndex].innerText;
    let valB = b.cells[columnIndex].innerText;

    if (type === "number") {
      return Number(valA) - Number(valB);
    }
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

// -------------------- REAPPLY SORT --------------------
// Helper: reapply last sort after refresh
function reapplyIngredientSort() {
  if (currentIngredientSort.column !== null) {
    sortIngredients(currentIngredientSort.column, currentIngredientSort.type);
  }
}

// -------------------- REFRESH INGREDIENTS --------------------
// Auto-refresh helper: reloads ingredients and reapplies current sort
function refreshIngredients() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "/ingredients");
  xhr.onload = function () {
    if (xhr.status === 200) {
      const ingredients = JSON.parse(xhr.response);
      populateIngredientsTable(ingredients);
      populateIngredientDropdown(ingredients);

      // Reapply current sort after refresh
      reapplyIngredientSort();
    } else {
      console.error("Failed to refresh ingredients:", xhr.status);
    }
  };
  xhr.send();
}

// -------------------- POPULATE UNITS DROPDOWN --------------------
// Populate unit select dropdown with available units
function populateUnitDropdown() {
  const unitSelect = document.getElementById("ingredientUnitSelect");
  unitSelect.innerHTML = ""; // clear existing options

  UNITS.forEach(unit => {
    const opt = document.createElement("option");
    opt.value = unit;
    opt.textContent = unit;
    unitSelect.appendChild(opt);
  });
}

// Keep a cached list for update lookups
let cachedIngredients = [];

// -------------------- INGREDIENT DROPDOWN --------------------
// Populate ingredient select dropdown for update form
function populateIngredientDropdown(items) {
  cachedIngredients = items; // store for later use in update form

  const select = document.getElementById("ingredientSelect");
  select.innerHTML = '<option value="">-- Select Ingredient --</option>';

  items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.ingredientId;   // backend ID
    opt.textContent = item.name;     // display name
    select.appendChild(opt);
  });
}


// -------------------- UPDATE INGREDIENT --------------------
// Update ingredient quantity (increase/decrease) with validation
document.getElementById("updateIngredientForm").onsubmit = function (e) {
  e.preventDefault();

  const ingredientId = document.getElementById("ingredientSelect").value;
  const amount = Number(document.getElementById("ingredientAdjustInput").value);

  if (!ingredientId || !amount) {
    showMessage("Please select an ingredient and enter an amount.", "blue");
    return;
  }

  // Which button was clicked (+ or -)
  const action = e.submitter.value; // "increase" or "decrease"
  const delta = action === "increase" ? amount : -amount;

  // Find ingredient in cache
  const ingredient = cachedIngredients.find(i => i.ingredientId === ingredientId);
  if (!ingredient) {
    showMessage("Ingredient not found.", "red");
    return;
  }

  // Prevent negative quantities
  const newQuantity = ingredient.quantity + delta;
  if (newQuantity < 0) {
    showMessage("Quantity cannot go below zero.", "red");
    return;
  }

  // Build updated object
  const updatedIngredient = {
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    quantity: newQuantity,
    unit: ingredient.unit,
    lastUpdated: new Date().toISOString()
  };

  // PUT request
  let xhr = new XMLHttpRequest();
  xhr.open("PUT", BASE_URL + "/ingredients");
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onload = function () {
    if (xhr.status === 200) {
      showMessage("Ingredient \"" + updatedIngredient.name + "\" updated successfully!", "green");
      e.target.reset(); // clear form
      document.getElementById("retrieveIngredientsBtn").click(); // refresh table + dropdown
    } else {
      showMessage("Failed to update ingredient: " + xhr.status, "red");
    }
  };
  xhr.send(JSON.stringify(updatedIngredient));
};

// -------------------- AUTO REFRESH --------------------
// Refresh ingredients every 15 seconds, respecting current sort
setInterval(() => {
  refreshIngredients();
}, 15000);

// -------------------- INITIALIZATION --------------------
// Populate unit dropdown and auto-load ingredients on page load
window.onload = function () {
  populateUnitDropdown();
  document.getElementById("retrieveIngredientsBtn").click(); // Auto-load ingredients
};

