// Step 1: Select all the elements we need from the HTML
const treesPlantedInput = document.getElementById('trees-planted');
const treeSpeciesSelect = document.getElementById('tree-species');
const projectDurationInput = document.getElementById('project-duration');
const survivalRateInput = document.getElementById('survival-rate');
const survivalBadge = document.getElementById('survival-badge');
const calculateBtn = document.getElementById('calculate-btn');

const resultsSection = document.getElementById('results-section');
const resEffectiveTrees = document.getElementById('res-effective-trees');
const resAnnualCo2 = document.getElementById('res-annual-co2');
const resTotalCo2 = document.getElementById('res-total-co2');
const resCarbonCredits = document.getElementById('res-carbon-credits');
const regionSelect = document.getElementById('project-region');
const regionMessage = document.getElementById('region-message');

// Variable to store our chart instance so we can destroy it before redrawing
let co2ChartInstance = null;

const regionMultipliers = {
    "Andhra Pradesh": 1.0, "Arunachal Pradesh": 1.1, "Assam": 1.2, "Bihar": 1.0,
    "Chhattisgarh": 1.1, "Goa": 1.1, "Gujarat": 0.8, "Haryana": 0.9,
    "Himachal Pradesh": 0.9, "Jharkhand": 1.0, "Karnataka": 1.1, "Kerala": 1.2,
    "Madhya Pradesh": 1.0, "Maharashtra": 1.0, "Manipur": 1.1, "Meghalaya": 1.2,
    "Mizoram": 1.2, "Nagaland": 1.1, "Odisha": 1.1, "Punjab": 0.9,
    "Rajasthan": 0.6, "Sikkim": 1.0, "Tamil Nadu": 1.0, "Telangana": 1.0,
    "Tripura": 1.1, "Uttar Pradesh": 1.0, "Uttarakhand": 1.0, "West Bengal": 1.1,
    "Default": 1.0
};

regionSelect.addEventListener('change', () => {
    // Only calculate if the results section is already visible (user has run it once)
    if (!resultsSection.classList.contains('hidden')) {
        calculateBtn.click();
    }
});
let speciesData = []; // Store the loaded JSON data

// Fetch species.json on load
fetch('species.json')
    .then(response => response.json())
    .then(data => {
        speciesData = data;
        
        // Clear loading message
        treeSpeciesSelect.innerHTML = '<option value="" disabled selected>Select a species</option>';
        
        // Populate the dropdown
        speciesData.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = index; // Use array index as the value for easy lookup
            option.textContent = `${item.species} - ${item.ecosystem}`;
            treeSpeciesSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading species.json:', error);
        treeSpeciesSelect.innerHTML = '<option value="" disabled selected>Error loading species</option>';
    });

// Step 2: Update the survival rate badge live when the slider is moved
survivalRateInput.addEventListener('input', function() {
    survivalBadge.textContent = this.value + '%';
});

// Step 3: Handle the calculate button click
calculateBtn.addEventListener('click', function() {
    // 3a. Get values from inputs
    const treesPlanted = parseInt(treesPlantedInput.value);
    const selectedSpeciesIndex = treeSpeciesSelect.value;
    const projectDuration = parseInt(projectDurationInput.value);
    const survivalRate = parseInt(survivalRateInput.value);

    // 3b. Validate inputs
    if (!treesPlanted || treesPlanted <= 0 || isNaN(treesPlanted)) {
        alert("Please enter a valid number of trees planted.");
        return;
    }
    if (selectedSpeciesIndex === "") {
        alert("Please select a tree species.");
        return;
    }
    if (!projectDuration || projectDuration <= 0 || isNaN(projectDuration)) {
        alert("Please enter a valid project duration in years.");
        return;
    }

    // Retrieve the selected species data
    const selectedSpecies = speciesData[selectedSpeciesIndex];

    // 3c. Perform the calculations
    const effectiveTrees = Math.round(treesPlanted * (survivalRate / 100));
    
    // We assume a standard planting density of 1000 trees per hectare to convert t/ha to kg/tree
    const assumedTreesPerHectare = 1000;
    
    let totalCo2Kg = 0;
    let yearlyCo2Data = [];

    // The JSON provides up to 30 years of data. If duration > 30, we use the year 30 value for subsequent years.
    for (let year = 0; year < projectDuration; year++) {
        const index = Math.min(year, selectedSpecies.biomass_accumulation_t_ha_year.length - 1);
        const biomass_t_ha = selectedSpecies.biomass_accumulation_t_ha_year[index];
        
        // Biomass per tree in tons
        const biomassPerTreeTons = biomass_t_ha / assumedTreesPerHectare;
        
        // Carbon per tree in tons
        const carbonPerTreeTons = biomassPerTreeTons * selectedSpecies.carbon_fraction;
        
        // CO2 per tree in tons (Carbon * 44/12 ratio)
        const co2PerTreeTons = carbonPerTreeTons * 3.667;
        
        // Total CO2 in kg for all effective trees this year
        const co2ThisYearKg = co2PerTreeTons * 1000 * effectiveTrees;
        
        yearlyCo2Data.push(co2ThisYearKg);
        totalCo2Kg += co2ThisYearKg;
    }

    const averageAnnualCo2Kg = totalCo2Kg / projectDuration;
    const totalCo2Tons = totalCo2Kg / 1000;
    const carbonCredits = totalCo2Tons;

    // 3d. Update the UI with the calculated values
    resEffectiveTrees.textContent = effectiveTrees.toLocaleString();
    
    const formatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    
    resAnnualCo2.textContent = averageAnnualCo2Kg.toLocaleString(undefined, formatOptions);
    resTotalCo2.textContent = totalCo2Tons.toLocaleString(undefined, formatOptions);
    resCarbonCredits.textContent = carbonCredits.toLocaleString(undefined, formatOptions);

    // 3e. Show the results section
    resultsSection.classList.remove('hidden');

    // 3f. Draw the chart
    drawChart(projectDuration, yearlyCo2Data);

    const region = regionSelect.value;
    const regionLabel = region === 'Default' ? 'All Regions' : region;
    
    // Save for the database feature
    lastCalculation = {
        trees_planted: treesPlanted,
        species_index: selectedSpeciesIndex,
        species_name: selectedSpecies.species,
        duration: projectDuration,
        survival_rate: survivalRate,
        region_name: regionLabel,
        region_multiplier: 1.0,
        effective_trees: effectiveTrees,
        annual_co2: averageAnnualCo2Kg,
        total_co2: totalCo2Tons,
        carbon_credits: carbonCredits
    };
});

// Step 4: Function to draw the bar chart using Chart.js
function drawChart(years, yearlyCo2Data) {
    const ctx = document.getElementById('co2Chart').getContext('2d');

    if (co2ChartInstance) {
        co2ChartInstance.destroy();
    }

    const labels = [];
    const data = [];
    
    let cumulativeCo2 = 0;
    for (let i = 0; i < years; i++) {
        labels.push('Year ' + (i + 1));
        cumulativeCo2 += yearlyCo2Data[i];
        data.push((cumulativeCo2 / 1000).toFixed(2));
    }

    co2ChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative CO₂ Absorbed (Tons)',
                data: data,
                backgroundColor: 'rgba(76, 175, 80, 0.6)', 
                borderColor: 'rgba(46, 125, 50, 1)',      
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Tons of CO₂'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Estimated Cumulative CO₂ Absorption Over Time',
                    font: {
                        size: 16,
                        family: "'Inter', sans-serif"
                    }
                }
            }
        }
    });
}

// --- Database Integration ---
let lastCalculation = null;
let currentEditId = null;
let allFetchedEstimations = [];
const saveBtn = document.getElementById('save-estimation-btn');
const pastEstimationsSection = document.getElementById('past-estimations-section');
const pastEstimationsList = document.getElementById('past-estimations-list');

if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        if (!lastCalculation) {
            alert("Please calculate an impact first!");
            return;
        }
        if (!window.currentUserEmail) {
            alert("You must be logged in to save estimations.");
            return;
        }

        const payload = {
            user_email: window.currentUserEmail,
            ...lastCalculation
        };

        try {
            saveBtn.disabled = true;
            saveBtn.innerText = currentEditId ? "Updating..." : "Saving...";
            
            const url = currentEditId ? `http://localhost:3000/api/estimations/${currentEditId}` : 'http://localhost:3000/api/estimations';
            const method = currentEditId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert(currentEditId ? "Estimation updated successfully!" : "Estimation saved successfully!");
                resetEditMode();
                loadPastEstimations();
            } else {
                const err = await res.json();
                alert("Failed to save: " + err.error);
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred while saving.");
        } finally {
            saveBtn.disabled = false;
            if (!currentEditId) saveBtn.innerText = "Save Estimation";
        }
    });
}

async function loadPastEstimations() {
    if (!window.currentUserEmail) return;

    try {
        const res = await fetch(`http://localhost:3000/api/estimations/${window.currentUserEmail}`);
        if (res.ok) {
            const result = await res.json();
            const estimations = result.data;
            allFetchedEstimations = estimations;

            if (estimations.length > 0) {
                pastEstimationsSection.classList.remove('hidden');
                pastEstimationsList.innerHTML = '';
                
                estimations.forEach(est => {
                    const el = document.createElement('div');
                    el.style.padding = '1rem';
                    el.style.background = 'var(--card-bg)';
                    el.style.border = '1px solid var(--card-border)';
                    el.style.borderRadius = '8px';
                    
                    const date = new Date(est.created_at).toLocaleDateString();
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; gap: 1rem;">
                            <strong style="flex: 1; font-size: 1.05rem;">${est.trees_planted} x ${est.species_name}</strong>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <button onclick="editEstimation(${est.id})" style="background: var(--light-green); border: 1px solid var(--primary-green); border-radius: 6px; padding: 0.3rem 0.6rem; color: var(--primary-green-hover); cursor: pointer; font-size: 0.85rem; font-weight: 600; width: auto; box-shadow: none;" onmouseover="this.style.background='var(--primary-green)'; this.style.color='white'" onmouseout="this.style.background='var(--light-green)'; this.style.color='var(--primary-green-hover)'">✏️ Edit</button>
                                <button onclick="deleteEstimation(${est.id})" style="background: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 0.3rem 0.6rem; color: #dc2626; cursor: pointer; font-size: 0.85rem; font-weight: 600; width: auto; box-shadow: none;" onmouseover="this.style.background='#ef4444'; this.style.color='white'" onmouseout="this.style.background='#fee2e2'; this.style.color='#dc2626'">🗑️ Delete</button>
                            </div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.9rem; color: var(--light-text); align-items: center;">
                            <span style="background: rgba(0,0,0,0.05); padding: 0.2rem 0.5rem; border-radius: 4px;">📅 ${date}</span>
                            <span>⏳ ${est.duration} yrs</span>
                            <span>🌱 ${est.survival_rate}%</span>
                            <span style="color: var(--primary-green); font-weight: bold; margin-left: auto;">Total CO₂: ${est.total_co2.toFixed(2)} tons</span>
                        </div>
                    `;
                    pastEstimationsList.appendChild(el);
                });
            } else {
                pastEstimationsSection.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error("Failed to load past estimations", e);
    }
}

window.addEventListener('authReady', () => {
    loadPastEstimations();
});

window.editEstimation = function(id) {
    const est = allFetchedEstimations.find(e => e.id === id);
    if (!est) return;

    currentEditId = id;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Populate the form
    if (est.region_name && est.region_name !== 'All Regions') {
        regionSelect.value = est.region_name;
    } else {
        regionSelect.value = 'Default';
    }
    populateSpeciesDropdown(regionSelect.value);

    // Other inputs
    treesPlantedInput.value = est.trees_planted;
    treeSpeciesSelect.value = est.species_index;
    projectDurationInput.value = est.duration;
    survivalRateInput.value = est.survival_rate;
    
    // Update badge and run calculation
    survivalBadge.textContent = est.survival_rate + '%';
    calculateBtn.click();

    // Change button state
    saveBtn.innerText = "Update Estimation";
    saveBtn.style.backgroundColor = "var(--primary-dark)";
};

window.deleteEstimation = async function(id) {
    if (!confirm("Are you sure you want to delete this estimation?")) return;
    try {
        const res = await fetch(`http://localhost:3000/api/estimations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadPastEstimations();
            if (currentEditId === id) {
                resetEditMode();
            }
        } else {
            alert("Failed to delete.");
        }
    } catch(e) {
        console.error(e);
        alert("An error occurred.");
    }
};

function resetEditMode() {
    currentEditId = null;
    saveBtn.innerText = "Save Estimation";
    saveBtn.style.backgroundColor = ""; // back to normal
}
