// BASE URL for API Gateway
const BASE_URL = "https://7yxsn0k61g.execute-api.us-east-2.amazonaws.com/";

// -------------------- MESSAGE DISPLAY --------------------
// Helper: show status/info messages in <p id="message">
function showMessage(text, color = "black") {
    const msg = document.getElementById("recipeMessage");
    msg.innerText = text;
    msg.style.color = color;

    // Clear this message after 5 seconds
    setTimeout(() => {
    msg.innerText = "";
    }, 5000);
}

// -------------------- RECIPE ID GENERATOR --------------------
// Creates a unique recipeId string from the dish name.
// Example: "Caesar Salad" -> "rec-caesar-salad"
function generateRecipeId(dishName) {
    return "rec-" + dishName.trim().toLowerCase().replace(/\s+/g, "-");
}

// -------------------- ADD RECIPE FORM HANDLER --------------------
// Handles submission of the Add Recipe form.
// Builds a recipe object from form inputs and sends it to the backend API.
document.getElementById("addRecipeForm").onsubmit = function(e) {
    e.preventDefault();

    const recipe = {
        // recipeId: document.getElementById("recipeIdInput").value.trim(),
        recipeId: generateRecipeId(document.getElementById("dishNameInput").value.trim()),
        dishName: document.getElementById("dishNameInput").value.trim(),
        dishType: document.getElementById("dishTypeInput").value.trim(),
        ingredients: document.getElementById("ingredientsInput").value.split(",").map(s => s.trim()),
        amounts: document.getElementById("amountsInput").value.split(",").map(Number),
        units: document.getElementById("unitsInput").value.split(",").map(s => s.trim())
    };

    // Send PUT request to backend with recipe data
    let xhr = new XMLHttpRequest();
    xhr.open("PUT", BASE_URL + "/recipes");
    xhr.setRequestHeader("Content-Type", "application/json");

    // Success/failure handling
    xhr.onload = function() {
    if (xhr.status === 200) {
        showMessage("Recipe added successfully!", "green");
        e.target.reset();
    } else {
        showMessage("Failed to add recipe: " + xhr.status, "red");
    }
    };

    // Send recipe object as JSON
    xhr.send(JSON.stringify(recipe));
};


