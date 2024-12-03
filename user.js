// File: scripts/user.js

let salesOptions = [];
let multipliers = [];
let selectedMultiplier = null;

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'; // Replace with your GAS Web App URL

/**
 * Initializes the UI by fetching sales options from the server.
 */
function initialize() {
  fetch(`${GAS_WEB_APP_URL}?action=getSalesOptions`)
    .then(response => response.json())
    .then(data => {
      salesOptions = data;
      loadSalesOptions(salesOptions);
    })
    .catch(error => {
      console.error('Error fetching sales options:', error);
      alert('Failed to load sales options. Please try again later.');
    });
}

/**
 * Populates the sales options table in the user interface.
 * @param {Array} salesOptionsData - Array of sales options objects.
 */
function loadSalesOptions(salesOptionsData) {
  const tableBody = document.getElementById('salesOptionsTable').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = ''; // Clear existing rows
  
  if (salesOptionsData.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'No sales options available. Please contact the administrator.';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }
  
  salesOptionsData.forEach(option => {
    addSalesOptionRow(option.number, option.name, option.cost, option.sellingPrice);
  });
}

/**
 * Adds a sales option row to the sales options table.
 * @param {number} number - The option number.
 * @param {string} name - The product name.
 * @param {number} cost - The cost of the product.
 * @param {number} sellingPrice - The selling price of the product.
 */
function addSalesOptionRow(number, name, cost, sellingPrice) {
  const tableBody = document.getElementById('salesOptionsTable').getElementsByTagName('tbody')[0];
  const tr = document.createElement('tr');
  
  // Select Checkbox
  const selectTd = document.createElement('td');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = 'selectedOptions';
  checkbox.value = number;
  selectTd.appendChild(checkbox);
  tr.appendChild(selectTd);
  
  // Option Number
  const numberTd = document.createElement('td');
  numberTd.textContent = number;
  tr.appendChild(numberTd);
  
  // Name
  const nameTd = document.createElement('td');
  nameTd.textContent = name;
  tr.appendChild(nameTd);
  
  // Selling Price
  const sellingPriceTd = document.createElement('td');
  sellingPriceTd.textContent = `$${sellingPrice.toFixed(2)}`;
  tr.appendChild(sellingPriceTd);
  
  // Quantity Input
  const quantityTd = document.createElement('td');
  const quantityInput = document.createElement('input');
  quantityInput.type = 'number';
  quantityInput.min = '1';
  quantityInput.step = '1';
  quantityInput.value = '1';
  quantityInput.disabled = true; // Disabled until checkbox is checked
  quantityInput.id = `quantity_${number}`;
  quantityTd.appendChild(quantityInput);
  tr.appendChild(quantityTd);
  
  // Enable quantity input when checkbox is checked
  checkbox.addEventListener('change', function() {
    quantityInput.disabled = !this.checked;
    if (!this.checked) {
      quantityInput.value = '1';
    }
  });
  
  tableBody.appendChild(tr);
}

/**
 * Generates the final price based on selected options and random multipliers.
 */
function generateFinalPrice() {
  const selectedCheckboxes = document.querySelectorAll('input[name="selectedOptions"]:checked');
  if (selectedCheckboxes.length === 0) {
    alert('Please select at least one sales option.');
    return;
  }
  
  const selectedOptions = [];
  selectedCheckboxes.forEach(checkbox => {
    const optionNumber = parseInt(checkbox.value, 10);
    const quantity = parseInt(document.getElementById(`quantity_${optionNumber}`).value, 10);
    if (isNaN(quantity) || quantity < 1) {
      alert(`Please enter a valid quantity for option ${optionNumber}.`);
      throw new Error(`Invalid quantity for option ${optionNumber}.`);
    }
    selectedOptions.push({ optionNumber, quantity });
  });
  
  // Show animation section
  document.getElementById('animationSection').style.display = 'block';
  document.getElementById('resultSection').style.display = 'none';
  
  // Start animation and generate final prices
  startMultiplierAnimation(selectedOptions);
}

/**
 * Starts the multiplier selection animation.
 * @param {Array} selectedOptions - Array of selected sales options with quantities.
 */
function startMultiplierAnimation(selectedOptions) {
  // Fetch multipliers for animation
  fetch(`${GAS_WEB_APP_URL}?action=getMultipliers`)
    .then(response => response.json())
    .then(settings => {
      multipliers = settings.multipliers.map((multiplier, index) => {
        return { multiplier: multiplier, probability: settings.probabilities[index] };
      });
      populateMultipliersListForAnimation(multipliers);
      
      // Generate final prices on the server
      return fetch(`${GAS_WEB_APP_URL}?action=generateFinalPrices&selectedOptions=${encodeURIComponent(JSON.stringify(selectedOptions))}`)
        .then(response => response.json())
        .then(result => {
          selectedMultiplier = result.selectedMultiplier;
          // Animate to the selected multiplier
          animateToSelectedMultiplier(selectedMultiplier, result, selectedOptions);
        });
    })
    .catch(error => {
      console.error('Error during multiplier animation:', error);
      alert('An error occurred while generating the price. Please try again.');
      document.getElementById('animationSection').style.display = 'none';
    });
}

/**
 * Populates the multipliers list in the animation section.
 * @param {Array} multipliersData - Array of multiplier objects.
 */
function populateMultipliersListForAnimation(multipliersData) {
  const multipliersList = document.getElementById('multipliersList');
  multipliersList.innerHTML = ''; // Clear existing multipliers
  
  multipliersData.forEach(multiplierObj => {
    const multiplierDiv = document.createElement('div');
    multiplierDiv.className = 'multiplier-item';
    multiplierDiv.textContent = `x${multiplierObj.multiplier}`;
    multipliersList.appendChild(multiplierDiv);
  });
}

/**
 * Animates the highlight cycling through multipliers and stops at the selected one.
 * @param {number} selectedMultiplier - The multiplier selected based on probability.
 * @param {Object} result - The result object containing final prices and summaries.
 * @param {Array} selectedOptions - The sales options selected by the user.
 */
function animateToSelectedMultiplier(selectedMultiplier, result, selectedOptions) {
  const multipliersList = document.getElementById('multipliersList');
  const multiplierItems = multipliersList.getElementsByClassName('multiplier-item');
  const totalItems = multiplierItems.length;
  let currentIndex = 0;
  let cycles = 0;
  const maxCycles = 5; // Number of full cycles before stopping
  
  const interval = setInterval(() => {
    // Remove highlight from all items
    for (let item of multiplierItems) {
      item.classList.remove('active');
    }
    
    // Highlight current item
    multiplierItems[currentIndex].classList.add('active');
    
    // Move to next item
    currentIndex = (currentIndex + 1) % totalItems;
    if (currentIndex === 0) {
      cycles++;
    }
    
    // After maxCycles, stop and highlight the selected multiplier
    if (cycles >= maxCycles) {
      clearInterval(interval);
      
      // Find the index of the selected multiplier
      let selectedIndex = multipliers.findIndex(m => m.multiplier === selectedMultiplier);
      if (selectedIndex === -1) selectedIndex = 0; // Fallback to first multiplier if not found
      
      // Highlight the selected multiplier
      for (let item of multiplierItems) {
        item.classList.remove('active');
      }
      multiplierItems[selectedIndex].classList.add('active');
      
      // Hide animation and show results after a short delay
      setTimeout(() => {
        document.getElementById('animationSection').style.display = 'none';
        displayResults(result);
      }, 1000);
    }
  }, 100); // Adjust the speed of the cycling here (milliseconds)
}

/**
 * Displays the generated results to the user.
 * @param {Object} result - The result object containing final prices and summaries.
 */
function displayResults(result) {
  document.getElementById('totalFinalPrice').textContent = result.totalFinalPrice.toFixed(2);
  document.getElementById('resultSection').style.display = 'block';
}

/**
 * Opens the Admin Modal.
 */
function openAdminModal() {
  const modal = document.getElementById('adminModal');
  modal.style.display = 'block';
}

/**
 * Closes the Admin Modal.
 */
function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  modal.style.display = 'none';
  resetAdminModal();
}

/**
 * Resets the Admin Modal to its initial state.
 */
function resetAdminModal() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('settingsSection').style.display = 'none';
  document.getElementById('adminError').style.display = 'none';
  document.getElementById('adminPassword').value = '';
  document.getElementById('multipliersTable').getElementsByTagName('tbody')[0].innerHTML = '';
  document.getElementById('salesOptionsTableAdmin').getElementsByTagName('tbody')[0].innerHTML = '';
  document.getElementById('successMessage').style.display = 'none';
}

/**
 * Validates the admin password.
 */
function validateAdmin() {
  const password = document.getElementById('adminPassword').value;
  if (!password) {
    alert('Please enter the admin password.');
    return;
  }
  fetch(`${GAS_WEB_APP_URL}?action=validateAdminPassword&password=${encodeURIComponent(password)}`)
    .then(response => response.json())
    .then(data => {
      if (data.isValid) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('settingsSection').style.display = 'block';
        loadAdminSettings();
      } else {
        document.getElementById('adminError').style.display = 'block';
      }
    })
    .catch(error => {
      console.error('Error validating admin password:', error);
      alert('An error occurred during authentication. Please try again.');
    });
}

/**
 * Loads existing multipliers and sales options and populates the tables in Admin Panel.
 */
function loadAdminSettings() {
  fetch(`${GAS_WEB_APP_URL}?action=getFullSetup`)
    .then(response => response.json())
    .then(settings => {
      loadMultipliers(settings.multipliers, settings.probabilities);
      loadSalesOptionsAdmin(settings.salesOptions);
    })
    .catch(error => {
      console.error('Error loading admin settings:', error);
      alert('Failed to load admin settings. Please try again later.');
    });
}

/**
 * Loads multipliers into the multipliers table in Admin Panel.
 * @param {Array} multipliersData - Array of multipliers.
 * @param {Array} probabilitiesData - Array of probabilities corresponding to the multipliers.
 */
function loadMultipliers(multipliersData, probabilitiesData) {
  const tableBody = document.getElementById('multipliersTable').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = ''; // Clear existing rows
  
  for (let i = 0; i < multipliersData.length; i++) {
    addMultiplierRow(multipliersData[i], probabilitiesData[i]);
  }
}

/**
 * Loads sales options into the sales options table in Admin Panel.
 * @param {Array} salesOptionsData - Array of sales options.
 */
function loadSalesOptionsAdmin(salesOptionsData) {
  const tableBody = document.getElementById('salesOptionsTableAdmin').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = ''; // Clear existing rows
  
  salesOptionsData.forEach(option => {
    addSalesOptionRowAdmin(option.number, option.name, option.cost, option.sellingPrice);
  });
}

/**
 * Adds a multiplier row to the multipliers table in Admin Panel.
 * @param {number} multiplier - The multiplier value.
 * @param {number} probability - The probability percentage.
 */
function addMultiplierRow(multiplier, probability) {
  const tableBody = document.getElementById('multipliersTable').getElementsByTagName('tbody')[0];
  const tr = document.createElement('tr');
  
  // Multiplier Cell
  const multiplierTd = document.createElement('td');
  multiplierTd.textContent = multiplier;
  tr.appendChild(multiplierTd);
  
  // Probability Cell
  const probabilityTd = document.createElement('td');
  probabilityTd.textContent = probability;
  tr.appendChild(probabilityTd);
  
  // Actions Cell
  const actionsTd = document.createElement('td');
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = function() {
    if (confirm('Are you sure you want to delete this multiplier?')) {
      tableBody.removeChild(tr);
    }
  };
  actionsTd.appendChild(deleteBtn);
  tr.appendChild(actionsTd);
  
  tableBody.appendChild(tr);
}

/**
 * Adds a sales option row to the sales options table in Admin Panel.
 * @param {number} number - The option number.
 * @param {string} name - The product name.
 * @param {number} cost - The cost of the product.
 * @param {number} sellingPrice - The selling price of the product.
 */
function addSalesOptionRowAdmin(number, name, cost, sellingPrice) {
  const tableBody = document.getElementById('salesOptionsTableAdmin').getElementsByTagName('tbody')[0];
  const tr = document.createElement('tr');
  
  // Number Cell
  const numberTd = document.createElement('td');
  numberTd.textContent = number;
  tr.appendChild(numberTd);
  
  // Name Cell
  const nameTd = document.createElement('td');
  nameTd.textContent = name;
  tr.appendChild(nameTd);
  
  // Cost Cell
  const costTd = document.createElement('td');
  costTd.textContent = cost;
  tr.appendChild(costTd);
  
  // Selling Price Cell
  const sellingPriceTd = document.createElement('td');
  sellingPriceTd.textContent = sellingPrice;
  tr.appendChild(sellingPriceTd);
  
  // Actions Cell
  const actionsTd = document.createElement('td');
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = function() {
    if (confirm('Are you sure you want to delete this sales option?')) {
      tableBody.removeChild(tr);
    }
  };
  actionsTd.appendChild(deleteBtn);
  tr.appendChild(actionsTd);
  
  tableBody.appendChild(tr);
}

/**
 * Adds a multiplier row to the multipliers table in Admin Panel.
 * @param {number} multiplier - The multiplier value.
 * @param {number} probability - The probability percentage.
 */
function addMultiplierRow(multiplier = '', probability = '') {
  const tableBody = document.getElementById('multipliersTable').getElementsByTagName('tbody')[0];
  const newRow = tableBody.insertRow();
  
  // Multiplier Cell
  const multiplierCell = newRow.insertCell(0);
  const multiplierInput = document.createElement('input');
  multiplierInput.type = 'number';
  multiplierInput.min = '0.1';
  multiplierInput.step = '0.1';
  multiplierInput.placeholder = 'e.g., 1.0';
  multiplierInput.value = multiplier;
  multiplierCell.appendChild(multiplierInput);
  
  // Probability Cell
  const probabilityCell = newRow.insertCell(1);
  const probabilityInput = document.createElement('input');
  probabilityInput.type = 'number';
  probabilityInput.min = '0';
  probabilityInput.max = '100';
  probabilityInput.step = '1';
  probabilityInput.placeholder = 'e.g., 50';
  probabilityInput.value = probability;
  probabilityCell.appendChild(probabilityInput);
  
  // Actions Cell
  const actionsCell = newRow.insertCell(2);
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = function() {
    if (confirm('Are you sure you want to delete this multiplier?')) {
      tableBody.removeChild(newRow);
    }
  };
  actionsCell.appendChild(deleteBtn);
  
  tableBody.appendChild(newRow);
}

/**
 * Adds a sales option row to the sales options table in Admin Panel.
 * @param {number} number - The option number.
 * @param {string} name - The product name.
 * @param {number} cost - The cost of the product.
 * @param {number} sellingPrice - The selling price of the product.
 */
function addSalesOptionRowAdmin(number = '', name = '', cost = '', sellingPrice = '') {
  const tableBody = document.getElementById('salesOptionsTableAdmin').getElementsByTagName('tbody')[0];
  const newRow = tableBody.insertRow();
  
  // Number Cell
  const numberCell = newRow.insertCell(0);
  const numberInput = document.createElement('input');
  numberInput.type = 'number';
  numberInput.min = '1';
  numberInput.step = '1';
  numberInput.placeholder = 'e.g., 1';
  numberInput.value = number;
  numberCell.appendChild(numberInput);
  
  // Name Cell
  const nameCell = newRow.insertCell(1);
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g., Product A';
  nameInput.value = name;
  nameCell.appendChild(nameInput);
  
  // Cost Cell
  const costCell = newRow.insertCell(2);
  const costInput = document.createElement('input');
  costInput.type = 'number';
  costInput.min = '0';
  costInput.step = '0.01';
  costInput.placeholder = 'e.g., 50.00';
  costInput.value = cost;
  costCell.appendChild(costInput);
  
  // Selling Price Cell
  const sellingPriceCell = newRow.insertCell(3);
  const sellingPriceInput = document.createElement('input');
  sellingPriceInput.type = 'number';
  sellingPriceInput.min = '0';
  sellingPriceInput.step = '0.01';
  sellingPriceInput.placeholder = 'e.g., 100.00';
  sellingPriceInput.value = sellingPrice;
  sellingPriceCell.appendChild(sellingPriceInput);
  
  // Actions Cell
  const actionsCell = newRow.insertCell(4);
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = function() {
    if (confirm('Are you sure you want to delete this sales option?')) {
      tableBody.removeChild(newRow);
    }
  };
  actionsCell.appendChild(deleteBtn);
  
  tableBody.appendChild(newRow);
}

/**
 * Saves multipliers to the server and provides feedback.
 */
function saveMultipliers() {
  // Collect multipliers and probabilities
  const multipliersTable = document.getElementById('multipliersTable');
  const multiplierRows = multipliersTable.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
  const multipliers = [];
  const probabilities = [];
  
  for (let i = 0; i < multiplierRows.length; i++) {
    const multiplier = parseFloat(multiplierRows[i].cells[0].getElementsByTagName('input')[0].value);
    const probability = parseFloat(multiplierRows[i].cells[1].getElementsByTagName('input')[0].value);
    
    if (isNaN(multiplier) || multiplier <= 0) {
      alert(`Invalid multiplier in row ${i + 1}. Please enter a number greater than 0.`);
      return;
    }
    if (isNaN(probability) || probability < 0) {
      alert(`Invalid probability in row ${i + 1}. Please enter a non-negative number.`);
      return;
    }
    
    multipliers.push(multiplier);
    probabilities.push(probability);
  }
  
  // Check if total probability sums to 100
  const totalProb = probabilities.reduce((sum, p) => sum + p, 0);
  if (totalProb !== 100) {
    alert(`Total probability must sum to 100%. Currently, it sums to ${totalProb}%.`);
    return;
  }
  
  // Save multipliers to server
  const params = new URLSearchParams();
  params.append('action', 'saveMultipliers');
  params.append('multipliers', JSON.stringify(multipliers));
  params.append('probabilities', JSON.stringify(probabilities));
  
  fetch(GAS_WEB_APP_URL, {
    method: 'GET', // Change to 'POST' if you handle doPost
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      document.getElementById('successMessage').textContent = 'Multipliers saved successfully!';
      document.getElementById('successMessage').style.display = 'block';
      setTimeout(() => {
        document.getElementById('successMessage').style.display = 'none';
      }, 3000);
    } else {
      alert('Failed to save multipliers. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error saving multipliers:', error);
    alert('An error occurred while saving multipliers. Please try again.');
  });
}

/**
 * Saves sales options to the server and provides feedback.
 */
function saveSalesOptions() {
  // Collect sales options
  const salesOptionsTable = document.getElementById('salesOptionsTableAdmin');
  const salesOptionRows = salesOptionsTable.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
  const numbers = [];
  const names = [];
  const costs = [];
  const sellingPrices = [];
  
  for (let i = 0; i < salesOptionRows.length; i++) {
    const number = parseInt(salesOptionRows[i].cells[0].getElementsByTagName('input')[0].value, 10);
    const name = salesOptionRows[i].cells[1].getElementsByTagName('input')[0].value.trim();
    const cost = parseFloat(salesOptionRows[i].cells[2].getElementsByTagName('input')[0].value);
    const sellingPrice = parseFloat(salesOptionRows[i].cells[3].getElementsByTagName('input')[0].value);
    
    if (isNaN(number) || number <= 0) {
      alert(`Invalid number in Sales Option row ${i + 1}. Please enter a positive integer.`);
      return;
    }
    if (!name) {
      alert(`Invalid name in Sales Option row ${i + 1}. Please enter a non-empty name.`);
      return;
    }
    if (isNaN(cost) || cost < 0) {
      alert(`Invalid cost in Sales Option row ${i + 1}. Please enter a non-negative number.`);
      return;
    }
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      alert(`Invalid selling price in Sales Option row ${i + 1}. Please enter a non-negative number.`);
      return;
    }
    
    numbers.push(number);
    names.push(name);
    costs.push(cost);
    sellingPrices.push(sellingPrice);
  }
  
  // Save sales options to server
  const params = new URLSearchParams();
  params.append('action', 'saveSalesOptions');
  params.append('settings', JSON.stringify({ numbers, names, costs, sellingPrices }));
  
  fetch(GAS_WEB_APP_URL, {
    method: 'GET', // Change to 'POST' if you handle doPost
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      document.getElementById('successMessage').textContent = 'Sales Options saved successfully!';
      document.getElementById('successMessage').style.display = 'block';
      setTimeout(() => {
        document.getElementById('successMessage').style.display = 'none';
      }, 3000);
    } else {
      alert('Failed to save sales options. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error saving sales options:', error);
    alert('An error occurred while saving sales options. Please try again.');
  });
}

/**
 * Opens the Admin Modal.
 */
function openAdminModal() {
  const modal = document.getElementById('adminModal');
  modal.style.display = 'block';
}

/**
 * Closes the Admin Modal.
 */
function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  modal.style.display = 'none';
  resetAdminModal();
}

/**
 * Resets the Admin Modal to its initial state.
 */
function resetAdminModal() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('settingsSection').style.display = 'none';
  document.getElementById('adminError').style.display = 'none';
  document.getElementById('adminPassword').value = '';
  document.getElementById('multipliersTable').getElementsByTagName('tbody')[0].innerHTML = '';
  document.getElementById('salesOptionsTableAdmin').getElementsByTagName('tbody')[0].innerHTML = '';
  document.getElementById('successMessage').style.display = 'none';
}

/**
 * Handles the keyboard shortcut for opening the Admin Modal.
 * Changed from Ctrl + B to Ctrl + Shift + B to avoid browser conflicts.
 */
document.addEventListener('keydown', function (event) {
  // Use Ctrl + Shift + B instead of Ctrl + B
  if (event.ctrlKey && event.shiftKey && (event.key === 'B' || event.key === 'b')) {
    event.preventDefault();
    openAdminModal();
    console.log('Admin Modal opened via Ctrl + Shift + B');
    // Optional: Alert for debugging purposes (remove in production)
    // alert('Admin Modal Opened');
  }
});

// Initialize the interface on page load
window.onload = initialize;
