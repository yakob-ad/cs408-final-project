// BASE URL for API Gateway
const BASE_URL = "https://7yxsn0k61g.execute-api.us-east-2.amazonaws.com/";

// GET /orders --> load and populate table
document.getElementById("retrieveOrdersBtn").onclick = function () {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", BASE_URL + "/orders");
    xhr.onload = function () {
        if (xhr.status === 200) {
            const orders = JSON.parse(xhr.response);
            populateOrdersTable(orders);
        } else {
            alert("Failed to load orders: " + xhr.status);
        }
    };
    xhr.send();
};

// Helper: populate table rows
function populateOrdersTable(orders) {
  const tbody = document.querySelector("#orderTable tbody");
  tbody.innerHTML = ""; // keep THEAD, only clear rows

  orders.forEach(order => {
    const row = tbody.insertRow();

    row.insertCell(0).innerText = order.orderId;
    row.insertCell(1).innerText = order.tableNumber;
    row.insertCell(2).innerText = order.dishName;
    row.insertCell(3).innerText = order.dishType;
    row.insertCell(4).innerText = order.quantity;

    // Timestamp cell: display friendly text, keep sortable epoch in a data attribute
    const tsCell = row.insertCell(5);
    tsCell.innerText = new Date(order.timestamp).toLocaleString();
    tsCell.dataset.sortValue = String(new Date(order.timestamp).getTime());

    // Action cell with Delete button
    const actionCell = row.insertCell(6);
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "Delete";
    deleteBtn.onclick = function () {
      deleteOrder(order.orderId, row);
    };
    actionCell.appendChild(deleteBtn);
  });
}


// DELETE /orders/{orderId}
function deleteOrder(orderId, row) {
    let xhr = new XMLHttpRequest();
    xhr.open("DELETE", BASE_URL + "/orders/" + orderId);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        if (xhr.status === 200) {
            row.remove(); // remove row from table
        } else {
            alert("Failed to delete order: " + xhr.status);
        }
    };
    xhr.send();
}

// Refresh orders every 10 seconds
// setInterval(() => {
//   let xhr = new XMLHttpRequest();
//   xhr.open("GET", BASE_URL + "/orders");
//   xhr.onload = function () {
//     if (xhr.status === 200) {
//       const orders = JSON.parse(xhr.response);
//       populateOrdersTable(orders);
//     }
//   };
//   xhr.send();
// }, 10000); // 10,000 ms = 10 seconds

// Sort table of orders by column
function sortTable(columnIndex, type) {
  const tbody = document.querySelector("#orderTable tbody");
  const rows = Array.from(tbody.rows);

  rows.sort((a, b) => {
    let valA = a.cells[columnIndex].innerText;
    let valB = b.cells[columnIndex].innerText;

    if (type === "number") {
      return Number(valA) - Number(valB);
    } else if (type === "date") {
      const aEpoch = Number(a.cells[columnIndex].dataset.sortValue || 0);
      const bEpoch = Number(b.cells[columnIndex].dataset.sortValue || 0);
      return aEpoch - bEpoch;
    } else {
      return valA.localeCompare(valB);
    }
  });

  tbody.innerHTML = "";
  rows.forEach(row => tbody.appendChild(row));
}



