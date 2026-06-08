document.addEventListener('DOMContentLoaded', function() {
    const itemsBody = document.getElementById('items-body');
    const addItemBtn = document.getElementById('add-item-btn');
    
    const chargesBody = document.getElementById('charges-body');
    const addChargeBtn = document.getElementById('add-charge-btn');
    
    const subtotalEl = document.getElementById('subtotal');
    const commissionPctEl = document.getElementById('commission_pct');
    const commissionAmtEl = document.getElementById('commission_amt');
    
    const chargesTotalAmtEl = document.getElementById('charges_total_amt');
    const netSubtotalEl = document.getElementById('net_subtotal');
    
    const taxEnabledEl = document.getElementById('tax_enabled');
    const taxPctEl = document.getElementById('tax_pct');
    const taxAmtEl = document.getElementById('tax_amt');
    
    const totalEl = document.getElementById('total');

    // Disable scroll wheel on number inputs to prevent accidental changes
    document.addEventListener('wheel', function(e) {
        if(document.activeElement.type === 'number'){
            e.preventDefault();
        }
    }, { passive: false });

    const userId = window.CURRENT_USER_ID || 'default';
    const customRatesKey = `customWoodRates_${userId}`;
    const deletedRatesKey = `deletedWoodRates_${userId}`;

    const customRates = JSON.parse(localStorage.getItem(customRatesKey)) || {};
    let deletedRates = JSON.parse(localStorage.getItem(deletedRatesKey)) || [];

    const defaultRates = {
        'BALLI': 1000,
        'SAFEDA': 1165,
        'MUDD': 430,
        'BALAN': 570,
        ...customRates
    };
    
    deletedRates.forEach(d => delete defaultRates[d]);
    
    let woodOptions = Object.keys(defaultRates);

    function setupDropdown(container) {
        const input = container.querySelector('.wood-category-input');
        let menu = container.querySelector('.custom-dropdown-menu');
        
        if (!menu) {
            menu = document.createElement('ul');
            menu.className = "custom-dropdown-menu absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm hidden";
            container.appendChild(menu);
        }
        
        function renderOptions(filterText = "") {
            menu.innerHTML = '';
            const filtered = woodOptions.filter(opt => opt.toLowerCase().includes(filterText.toLowerCase()));
            
            if (filtered.length === 0 && filterText.trim() === '') {
                menu.innerHTML = '<li class="text-gray-500 cursor-default select-none relative py-2 pl-3 pr-9 text-sm italic">No matching options</li>';
            } else {
                filtered.forEach(opt => {
                    const li = document.createElement('li');
                    li.className = "text-gray-900 cursor-pointer select-none relative py-2 pl-3 pr-3 hover:bg-indigo-600 hover:text-white flex justify-between items-center group";
                    
                    const span = document.createElement('span');
                    span.textContent = opt;
                    li.appendChild(span);
                    
                    const actionDiv = document.createElement('div');
                    actionDiv.className = "flex space-x-2 items-center ml-4";
                    
                    // Edit button
                    const editBtn = document.createElement('button');
                    editBtn.type = "button";
                    editBtn.className = "text-gray-400 hover:text-indigo-200 focus:outline-none p-1 z-10";
                    editBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`;
                    editBtn.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        currentEditingCategory = opt;
                        currentTargetInput = input;
                        document.getElementById('editCategoryInput').value = opt;
                        document.getElementById('editCategoryModal').classList.remove('hidden');
                        setTimeout(() => document.getElementById('editCategoryInput').focus(), 50);
                    });
                    
                    // Delete button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = "button";
                    deleteBtn.className = "text-gray-400 hover:text-red-300 focus:outline-none p-1 transition-colors";
                    deleteBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
                    deleteBtn.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        currentDeletingCategory = opt;
                        currentTargetInput = input;
                        document.getElementById('deleteCategoryName').textContent = opt;
                        document.getElementById('deleteCategoryModal').classList.remove('hidden');
                    });
                    
                    actionDiv.appendChild(editBtn);
                    actionDiv.appendChild(deleteBtn);
                    li.appendChild(actionDiv);
                    
                    li.addEventListener('mousedown', function(e) {
                        if (e.target.closest('button')) return; // ignore clicks on action buttons
                        e.preventDefault(); // Prevent blur
                        input.value = opt;
                        menu.classList.add('hidden');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    menu.appendChild(li);
                });
                
                // Add option to create a new category if it doesn't match perfectly
                const exactMatch = filtered.find(opt => opt.toLowerCase() === filterText.toLowerCase().trim());
                if (!exactMatch && filterText.trim() !== '') {
                    const addLi = document.createElement('li');
                    addLi.className = "text-indigo-600 font-medium cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 border-t border-gray-100";
                    addLi.innerHTML = `+ Add "${filterText.trim().toUpperCase()}"`;
                    addLi.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        const newCat = filterText.trim().toUpperCase();
                        
                        if (!woodOptions.includes(newCat)) {
                            woodOptions.push(newCat);
                            // Set initial 0 rate just so it exists
                            defaultRates[newCat] = 0;
                            customRates[newCat] = 0;
                            localStorage.setItem(customRatesKey, JSON.stringify(customRates));
                        }
                        
                        input.value = newCat;
                        menu.classList.add('hidden');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Automatically focus the rate input to encourage them to set the rate
                        const row = input.closest('.item-row');
                        if (row) {
                            const rateInput = row.querySelector('input[name="rate[]"]');
                            if (rateInput) setTimeout(() => rateInput.focus(), 10);
                        }
                    });
                    menu.appendChild(addLi);
                }
            }
        }
        
        input.addEventListener('focus', () => {
            renderOptions(input.value);
            menu.classList.remove('hidden');
        });
        
        input.addEventListener('input', () => {
            renderOptions(input.value);
            menu.classList.remove('hidden');
        });
        
        input.addEventListener('blur', () => {
            menu.classList.add('hidden');
        });
        
        // Hide dropdown if clicked outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
    }
    
    // Modal state logic
    window.closeEditCategoryModal = function() {
        document.getElementById('editCategoryModal').classList.add('hidden');
    };
    
    window.closeDeleteCategoryModal = function() {
        document.getElementById('deleteCategoryModal').classList.add('hidden');
    };

    let currentEditingCategory = null;
    let currentDeletingCategory = null;
    let currentTargetInput = null;

    document.getElementById('saveEditCategoryBtn').addEventListener('click', function() {
        const inputField = document.getElementById('editCategoryInput');
        const newName = inputField.value;
        const opt = currentEditingCategory;
        
        if (newName && newName.trim() !== '' && newName.toUpperCase() !== opt) {
            const newCat = newName.trim().toUpperCase();
            const rate = defaultRates[opt];
            
            delete defaultRates[opt];
            delete customRates[opt];
            if (!deletedRates.includes(opt)) deletedRates.push(opt);
            
            defaultRates[newCat] = rate;
            customRates[newCat] = rate;
            
            localStorage.setItem(customRatesKey, JSON.stringify(customRates));
            localStorage.setItem(deletedRatesKey, JSON.stringify(deletedRates));
            
            const index = woodOptions.indexOf(opt);
            if (index > -1) woodOptions[index] = newCat;
            else if (!woodOptions.includes(newCat)) woodOptions.push(newCat);
            
            closeEditCategoryModal();
            
            // Re-render
            const containers = document.querySelectorAll('.custom-dropdown-container');
            containers.forEach(c => {
                const input = c.querySelector('.wood-category-input');
                if (input.value === opt) {
                    input.value = newCat;
                }
            });
            
            if (currentTargetInput) {
                currentTargetInput.focus();
                currentTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else {
            closeEditCategoryModal();
        }
    });

    document.getElementById('confirmDeleteCategoryBtn').addEventListener('click', function() {
        const opt = currentDeletingCategory;
        if (opt) {
            delete defaultRates[opt];
            delete customRates[opt];
            if (!deletedRates.includes(opt)) deletedRates.push(opt);
            
            localStorage.setItem(customRatesKey, JSON.stringify(customRates));
            localStorage.setItem(deletedRatesKey, JSON.stringify(deletedRates));
            
            const index = woodOptions.indexOf(opt);
            if (index > -1) woodOptions.splice(index, 1);
            
            closeDeleteCategoryModal();
            
            if (currentTargetInput) {
                if (currentTargetInput.value === opt) {
                    currentTargetInput.value = '';
                }
                currentTargetInput.focus();
                currentTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });

    document.querySelectorAll('.custom-dropdown-container').forEach(setupDropdown);

    function updateRowNumbers() {
        const rows = itemsBody.querySelectorAll('.item-row');
        rows.forEach((row, index) => {
            const numInput = row.querySelector('.item-number-input');
            if (numInput) {
                numInput.value = index + 1;
            }
        });
        
        if (chargesBody) {
            const cRows = chargesBody.querySelectorAll('.charge-row');
            cRows.forEach((row, index) => {
                const numInput = row.querySelector('.charge-number-input');
                if (numInput) {
                    numInput.value = index + 1;
                }
            });
        }
    }

    function updateCalculations() {
        let subtotal = 0;
        
        // Calculate each row in Line Items
        const rows = itemsBody.querySelectorAll('.item-row');
        rows.forEach(row => {
            const weightInput = row.querySelector('input[name="gross_weight[]"]');
            const rateInput = row.querySelector('input[name="rate[]"]');
            const amountInput = row.querySelector('input[name="amount[]"]');
            
            const weight = parseFloat(weightInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;
            
            // Formula: Amount = (Gross Weight * Rate) / 100
            const amount = (weight * rate) / 100;
            amountInput.value = amount.toFixed(2);
            
            subtotal += amount;
        });
        
        subtotalEl.value = subtotal.toFixed(2);
        
        // Calculate Commission (DEDUCTION)
        const commissionPct = parseFloat(commissionPctEl.value) || 0;
        const commissionAmt = subtotal * (commissionPct / 100);
        commissionAmtEl.value = commissionAmt.toFixed(2);
        
        // Calculate Additional Charges (DEDUCTION)
        let chargesTotal = 0;
        if (chargesBody) {
            const cRows = chargesBody.querySelectorAll('.charge-row');
            cRows.forEach(row => {
                const rateInput = row.querySelector('input[name="charge_rate[]"]');
                const rate = parseFloat(rateInput.value) || 0;
                chargesTotal += rate;
            });
        }
        if (chargesTotalAmtEl) chargesTotalAmtEl.value = chargesTotal.toFixed(2);
        
        // Net Subtotal = Gross Subtotal - Commission - Charges
        const netSubtotal = subtotal - commissionAmt - chargesTotal;
        if (netSubtotalEl) netSubtotalEl.value = netSubtotal.toFixed(2);
        
        // Calculate Tax (Applied to Net Subtotal)
        let taxAmt = 0;
        if (taxEnabledEl.checked) {
            taxPctEl.disabled = false;
            taxPctEl.classList.remove('bg-slate-100');
            const taxPct = parseFloat(taxPctEl.value) || 0;
            taxAmt = netSubtotal * (taxPct / 100);
        } else {
            taxPctEl.disabled = true;
            taxPctEl.classList.add('bg-slate-100');
            // Reset to 0 when disabled
            taxAmt = 0;
        }
        taxAmtEl.value = taxAmt.toFixed(2);
        
        // Final Total = Net Subtotal + Tax
        const total = netSubtotal + taxAmt;
        totalEl.value = total.toFixed(2);
    }

    // Add new row
    addItemBtn.addEventListener('click', function() {
        const firstRow = itemsBody.querySelector('.item-row');
        const newRow = firstRow.cloneNode(true);
        
        // Clear values
        const inputs = newRow.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.name === 'amount[]') {
                input.value = '0.00';
            } else if (input.name !== 'item_desc[]') {
                input.value = '';
            }
        });
        
        // Enable remove button
        const removeBtn = newRow.querySelector('.remove-btn');
        removeBtn.disabled = false;
        
        // Initialize dropdown on new row
        const newDropdownContainer = newRow.querySelector('.custom-dropdown-container');
        if (newDropdownContainer) {
            setupDropdown(newDropdownContainer);
        }
        
        itemsBody.appendChild(newRow);
        attachRowEvents(newRow);
        updateCalculations();
        updateRemoveButtons();
        updateRowNumbers();
    });

    // Handle delegated events on the table body
    itemsBody.addEventListener('change', function(e) {
        if (e.target.classList.contains('wood-category-input')) {
            const row = e.target.closest('.item-row');
            const rateInput = row.querySelector('input[name="rate[]"]');
            const category = e.target.value.toUpperCase();
            
            // Auto-fill rate if it exists and input is empty or 0
            if (defaultRates[category] !== undefined && (!rateInput.value || rateInput.value == 0)) {
                rateInput.value = defaultRates[category];
            }
            updateCalculations();
        } else if (e.target.name === 'rate[]') {
            // Save the newly typed rate to localStorage for future use
            const row = e.target.closest('.item-row');
            const categoryInput = row.querySelector('.wood-category-input');
            const category = categoryInput.value.toUpperCase().trim();
            const newRate = parseFloat(e.target.value);
            
            if (category && !isNaN(newRate) && newRate > 0) {
                defaultRates[category] = newRate;
                customRates[category] = newRate;
                localStorage.setItem(customRatesKey, JSON.stringify(customRates));
                
                if (!woodOptions.includes(category)) {
                    woodOptions.push(category);
                }
            }
        }
    });

    // Remove row
    itemsBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-btn') && !e.target.disabled) {
            e.target.closest('tr').remove();
            updateCalculations();
            updateRemoveButtons();
            updateRowNumbers();
        }
    });

    function attachRowEvents(row) {
        const calcInputs = row.querySelectorAll('.calc-input');
        calcInputs.forEach(input => {
            input.addEventListener('input', updateCalculations);
        });
        
        const woodInput = row.querySelector('.wood-category-input');
        if (woodInput) {
            woodInput.addEventListener('input', function() {
                const category = this.value.toUpperCase().trim();
                if (defaultRates[category] !== undefined) {
                    const rateInput = row.querySelector('input[name="rate[]"]');
                    rateInput.value = defaultRates[category];
                    updateCalculations();
                }
            });
        }
    }

    function updateRemoveButtons() {
        const rows = itemsBody.querySelectorAll('.item-row');
        const btns = itemsBody.querySelectorAll('.remove-btn');
        if (rows.length === 1) {
            btns[0].disabled = true;
        } else {
            btns.forEach(btn => btn.disabled = false);
        }
    }
    
    // Additional Charges Logic
    const customChargeRatesKey = `customChargeRates_${userId}`;
    const customChargeRates = JSON.parse(localStorage.getItem(customChargeRatesKey)) || {};
    
    const defaultChargeRates = {
        'LABOR': 500,
        'TRANSPORT': 1000,
        ...customChargeRates
    };
    
    let chargeOptions = Object.keys(defaultChargeRates);
    
    function setupChargeDropdown(container) {
        const input = container.querySelector('.charge-name-input');
        let menu = container.querySelector('.custom-dropdown-menu');
        
        if (!menu) {
            menu = document.createElement('ul');
            menu.className = "custom-dropdown-menu absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm hidden";
            container.appendChild(menu);
        }
        
        function renderOptions(filterText = "") {
            menu.innerHTML = '';
            const filtered = chargeOptions.filter(opt => opt.toLowerCase().includes(filterText.toLowerCase()));
            
            if (filtered.length === 0 && filterText.trim() === '') {
                menu.innerHTML = '<li class="text-gray-500 cursor-default select-none relative py-2 pl-3 pr-9 text-sm italic">No matching options</li>';
            } else {
                filtered.forEach(opt => {
                    const li = document.createElement('li');
                    li.className = "text-gray-900 cursor-pointer select-none relative py-2 pl-3 pr-3 hover:bg-indigo-600 hover:text-white flex justify-between items-center";
                    
                    const span = document.createElement('span');
                    span.textContent = opt;
                    li.appendChild(span);
                    
                    li.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        input.value = opt;
                        menu.classList.add('hidden');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    menu.appendChild(li);
                });
                
                const exactMatch = filtered.find(opt => opt.toLowerCase() === filterText.toLowerCase().trim());
                if (!exactMatch && filterText.trim() !== '') {
                    const addLi = document.createElement('li');
                    addLi.className = "text-indigo-600 font-medium cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 border-t border-gray-100";
                    addLi.innerHTML = `+ Add "${filterText.trim().toUpperCase()}"`;
                    addLi.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        const newCat = filterText.trim().toUpperCase();
                        
                        if (!chargeOptions.includes(newCat)) {
                            chargeOptions.push(newCat);
                            defaultChargeRates[newCat] = 0;
                            customChargeRates[newCat] = 0;
                            localStorage.setItem(customChargeRatesKey, JSON.stringify(customChargeRates));
                        }
                        
                        input.value = newCat;
                        menu.classList.add('hidden');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        const row = input.closest('.charge-row');
                        if (row) {
                            const rateInput = row.querySelector('input[name="charge_rate[]"]');
                            if (rateInput) setTimeout(() => rateInput.focus(), 10);
                        }
                    });
                    menu.appendChild(addLi);
                }
            }
        }
        
        input.addEventListener('focus', () => { renderOptions(input.value); menu.classList.remove('hidden'); });
        input.addEventListener('input', () => { renderOptions(input.value); menu.classList.remove('hidden'); });
        input.addEventListener('blur', () => { menu.classList.add('hidden'); });
        document.addEventListener('click', (e) => { if (!container.contains(e.target)) menu.classList.add('hidden'); });
    }
    
    function createChargeRow() {
        const tr = document.createElement('tr');
        tr.className = 'charge-row';
        tr.innerHTML = `
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 w-16">
                <input type="text" class="charge-number-input bg-transparent border-0 w-8 text-center p-0 text-gray-500" readonly>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div class="custom-dropdown-container relative">
                    <input type="text" name="charge_name[]" required class="charge-name-input block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border" placeholder="Select or type charge" autocomplete="off">
                </div>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 w-32">
                <input type="number" step="0.01" name="charge_rate[]" required class="calc-input block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-right p-2 border">
            </td>
            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6 w-16">
                <button type="button" class="text-red-500 hover:text-red-700 remove-charge-btn p-1">
                    <svg class="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        `;
        return tr;
    }
    
    if (addChargeBtn) {
        addChargeBtn.addEventListener('click', function() {
            const row = createChargeRow();
            chargesBody.appendChild(row);
            
            const dropContainer = row.querySelector('.custom-dropdown-container');
            setupChargeDropdown(dropContainer);
            
            const rateInput = row.querySelector('input[name="charge_rate[]"]');
            rateInput.addEventListener('input', updateCalculations);
            
            updateRowNumbers();
        });
        
        chargesBody.addEventListener('change', function(e) {
            if (e.target.classList.contains('charge-name-input')) {
                const row = e.target.closest('.charge-row');
                const rateInput = row.querySelector('input[name="charge_rate[]"]');
                const category = e.target.value.toUpperCase();
                
                if (defaultChargeRates[category] !== undefined && (!rateInput.value || rateInput.value == 0)) {
                    rateInput.value = defaultChargeRates[category];
                }
                updateCalculations();
            } else if (e.target.name === 'charge_rate[]') {
                const row = e.target.closest('.charge-row');
                const nameInput = row.querySelector('.charge-name-input');
                const category = nameInput.value.toUpperCase().trim();
                const newRate = parseFloat(e.target.value);
                
                if (category && !isNaN(newRate) && newRate > 0) {
                    defaultChargeRates[category] = newRate;
                    customChargeRates[category] = newRate;
                    localStorage.setItem(customChargeRatesKey, JSON.stringify(customChargeRates));
                    if (!chargeOptions.includes(category)) chargeOptions.push(category);
                }
            }
        });
        
        chargesBody.addEventListener('click', function(e) {
            const btn = e.target.closest('.remove-charge-btn');
            if (btn) {
                btn.closest('tr').remove();
                updateCalculations();
                updateRowNumbers();
            }
        });
    }

    // Attach events to existing rows
    const existingRows = itemsBody.querySelectorAll('.item-row');
    existingRows.forEach(row => attachRowEvents(row));
    
    // Attach events to summary inputs
    commissionPctEl.addEventListener('input', updateCalculations);
    taxEnabledEl.addEventListener('change', updateCalculations);
    taxPctEl.addEventListener('input', updateCalculations);
    
    // Initialize
    updateCalculations();
    updateRemoveButtons();
    updateRowNumbers();
});
