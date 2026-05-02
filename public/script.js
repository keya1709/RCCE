// ===================== OPENWEATHER CONFIG =====================
// Note: API Key is now handled securely on the backend in server.js

// Maps each Indian state dropdown value → a representative city for OpenWeather
const stateToCity = {
    'Jammu and Kashmir (JK)': 'Srinagar',
    'Himachal pradesh (HP)':  'Shimla',
    'Uttarakhand (UK)':       'Dehradun',
    'Sikkim (SK)':            'Gangtok',
    'West Bengal (WB)':       'Kolkata',
    'Arunachal Pradesh (AR)': 'Itanagar',
    'Nagaland (NL)':          'Kohima',
    'Manipur (MN)':           'Imphal',
    'Mizoram (MZ)':           'Aizawl',
    'Tripura (TR)':            'Agartala',
    'Meghalaya (ML)':         'Shillong',
    'Assam (AS)':             'Guwahati',
    'Ladakh (LA)':            'Leh',
    'Gujrat (GU)':            'Ahmedabad',
    'Chhattisgarh (CG)':      'Raipur',
    'Madhya Pradesh (MP)':    'Bhopal',
    'Haryana (HR)':           'Chandigarh',
    'Delhi (DL)':             'New Delhi',
    'Punjab (PB)':            'Chandigarh',
    'Bihar (BR)':             'Patna',
    'Goa (GA)':               'Panaji',
    'Lakshadweep (LD)':       'Kavaratti',
    'Pondicherry (PY)':       'Pondicherry',
    'Chandigarh (CH)':        'Chandigarh',
    'Andaman & Nicobar Islands (AN)': 'Port Blair',
    'Andhra Pradesh (AP)':    'Visakhapatnam',
    'Kerala (KL)':            'Thiruvananthapuram',
    'Jharkhand (JH)':         'Ranchi',
    'Uttar Pradesh (UP)':     'Lucknow',
    'Rajasthan (RJ)':         'Jaipur',
    'Tamil Nadu (TN)':        'Chennai',
    'Telangana (TG)':         'Hyderabad',
    'Odisha (OD)':            'Bhubaneswar',
    'Karnataka (KA)':         'Bangalore',
    'Maharashtra (MH)':       'Mumbai',
    'Default':                null
};

// Maps OpenWeather condition codes → display emoji
function weatherEmoji(code) {
    if (code >= 200 && code < 300) return '⛈️';   // Thunderstorm
    if (code >= 300 && code < 400) return '🌦️';   // Drizzle
    if (code >= 500 && code < 600) return '🌧️';   // Rain
    if (code >= 600 && code < 700) return '❄️';   // Snow
    if (code >= 700 && code < 800) return '🌫️';   // Atmosphere (fog/haze)
    if (code === 800)               return '☀️';   // Clear
    if (code === 801 || code === 802) return '🌤️'; // Few/scattered clouds
    return '☁️';                                    // Cloudy
}

// Computes a growth multiplier from live weather data
function computeWeatherMultiplier(temp, humidity, hasRain) {
    let multiplier = 1.0;

    // Temperature adjustment
    if (temp >= 20 && temp <= 30)      multiplier += 0.0;   // Ideal
    else if (temp > 30 && temp <= 38)  multiplier -= 0.05;  // Warm
    else if (temp > 38)                multiplier -= 0.15;  // Very hot
    else if (temp < 10)                multiplier -= 0.10;  // Cold
    else if (temp < 20)                multiplier -= 0.03;  // Cool

    // Humidity adjustment
    if (humidity >= 70)                multiplier += 0.10;  // Moist
    else if (humidity < 30)            multiplier -= 0.10;  // Dry

    // Rain bonus
    if (hasRain)                       multiplier += 0.05;

    // Clamp between 0.5 and 1.3
    return Math.min(1.3, Math.max(0.5, Math.round(multiplier * 100) / 100));
}

// Determines planting suitability text + badge class
function getSuitability(temp, humidity) {
    if (temp > 42)
        return { cls: 'danger',  text: '⚠️ Extreme heat detected — tree survival may be significantly reduced in these conditions.' };
    if (temp < 2)
        return { cls: 'danger',  text: '⚠️ Near-freezing temperatures — most species are unsuitable for this region right now.' };
    if (humidity < 25)
        return { cls: 'warning', text: '⚠️ Very dry conditions — high water stress risk. Consider drought-tolerant species.' };
    if (temp > 38 || humidity < 35)
        return { cls: 'warning', text: '⚠️ Challenging conditions — choose hardy, heat/drought-tolerant species for better survival.' };
    return { cls: 'good', text: '✅ Conditions are suitable for reforestation in this region.' };
}

// Fetches weather and renders the weather card; returns the computed multiplier
async function fetchWeatherForRegion(regionValue) {
    const weatherCard    = document.getElementById('weather-card');
    const weatherContent = document.getElementById('weather-content');

    const city = stateToCity[regionValue];

    // No city mapping for "All Regions" default
    if (!city) {
        weatherCard.classList.add('hidden');
        return 1.0; // Neutral multiplier
    }

    // Show card with spinner
    weatherCard.classList.remove('hidden');
    weatherContent.innerHTML = `
        <div class="weather-loading">
            <div class="spinner"></div>
            Fetching live climate data for <strong>${city}</strong>…
        </div>`;

    try {
        // Support both localhost and 127.0.0.1 for port detection (handles VS Code Live Server)
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const backendBase = (isLocal && window.location.port !== '3000') 
            ? 'http://localhost:3000' 
            : '';
            
        const url = `${backendBase}/api/weather?city=${encodeURIComponent(city)}`;
        const res  = await fetch(url);

        if (!res.ok) {
            weatherContent.innerHTML = `<p style="color:var(--light-text);font-size:0.9rem;">⚠️ Could not fetch weather data (${res.status}). Using default multiplier.</p>`;
            return 1.0;
        }

        const data = await res.json();

        const temp      = Math.round(data.main.temp);
        const humidity  = data.main.humidity;
        const hasRain   = !!data.rain;
        const rainfall  = hasRain ? ((data.rain['1h'] || data.rain['3h'] || 0).toFixed(1) + ' mm') : 'Dry';
        const condCode  = data.weather[0].id;
        const condDesc  = data.weather[0].description;
        const emoji     = weatherEmoji(condCode);
        const mult      = computeWeatherMultiplier(temp, humidity, hasRain);
        const suit      = getSuitability(temp, humidity);

        weatherContent.innerHTML = `
            <div class="weather-inner">
                <div class="weather-icon-block">
                    <div class="weather-emoji">${emoji}</div>
                    <div class="weather-desc">${condDesc}</div>
                </div>

                <div class="weather-stats">
                    <div class="weather-stat">
                        <div class="stat-label">Temp</div>
                        <div class="stat-value">${temp}°C</div>
                    </div>
                    <div class="weather-stat">
                        <div class="stat-label">Humidity</div>
                        <div class="stat-value">${humidity}%</div>
                    </div>
                    <div class="weather-stat">
                        <div class="stat-label">Rainfall</div>
                        <div class="stat-value" style="font-size:1rem;">${rainfall}</div>
                    </div>
                </div>

                <div class="weather-multiplier">
                    <div class="mult-label">Growth Multiplier</div>
                    <div class="mult-value">${mult.toFixed(2)}×</div>
                </div>
            </div>
            <div class="suitability-badge ${suit.cls}">${suit.text}</div>`;

        return mult;

    } catch (err) {
        console.error('Weather fetch error:', err);
        weatherContent.innerHTML = `<p style="color:var(--light-text);font-size:0.9rem;">⚠️ Weather unavailable. Using default multiplier.</p>`;
        return 1.0;
    }
}

// ===================== END WEATHER CONFIG =====================

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

// Store original states to rebuild dropdown
const originalStates = Array.from(regionSelect.options).map(opt => ({
    value: opt.value,
    text: opt.textContent
}));

// Mutual filtering flags to prevent infinite loops (though not strictly needed for basic dropdowns)
let isFiltering = false;

regionSelect.addEventListener('change', () => {
    if (isFiltering) return;
    isFiltering = true;
    
    // Filter the species dropdown for the newly selected region
    populateSpeciesDropdown(regionSelect.value);
    
    // Recalculate only if results are already showing
    if (!resultsSection.classList.contains('hidden')) {
        calculateBtn.click();
    }
    
    isFiltering = false;
});

treeSpeciesSelect.addEventListener('change', () => {
    if (isFiltering) return;
    isFiltering = true;

    // Get selected species name
    const selectedIndex = treeSpeciesSelect.value;
    const selectedSpeciesName = selectedIndex !== "" ? speciesData[selectedIndex].species : null;

    // Filter the region dropdown based on the selected species
    populateStateDropdown(selectedSpeciesName);

    // Recalculate only if results are already showing
    if (!resultsSection.classList.contains('hidden')) {
        calculateBtn.click();
    }

    isFiltering = false;
});

let speciesData = []; // Store the loaded JSON data

// Fetch species.json on load
fetch('species.json')
    .then(response => response.json())
    .then(data => {
        speciesData = data;
        // Populate dropdown filtered to the default region (All Regions = show all)
        populateSpeciesDropdown(regionSelect.value);
    })
    .catch(error => {
        console.error('Error loading species.json:', error);
        treeSpeciesSelect.innerHTML = '<option value="" disabled selected>Error loading species</option>';
    });

/**
 * Rebuilds the species dropdown filtered to only show species
 * that grow in the selected Indian state, using window.stateSpeciesMap.
 * Falls back to all species if no regional data is available.
 */
function populateSpeciesDropdown(region) {
    // Remember the currently selected index so we can try to restore it
    const previousSelection = treeSpeciesSelect.value;

    const allowedSpecies = (window.stateSpeciesMap && window.stateSpeciesMap[region])
        ? window.stateSpeciesMap[region]
        : null;

    // Decide which species to show
    let filtered;
    let placeholderText = 'Select a species';

    if (region === 'Default' || !allowedSpecies) {
        // "All Regions" selected or no map entry — show everything
        filtered = speciesData.map((item, index) => ({ item, index }));

    } else if (allowedSpecies.length === 0) {
        // Region exists in map but has an empty species list (e.g. Ladakh)
        filtered = speciesData.map((item, index) => ({ item, index }));
        placeholderText = '⚠️ No regional data — showing all species';

    } else {
        // Filter: keep only species whose name appears in the allowed list
        filtered = speciesData
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => allowedSpecies.includes(item.species));

        if (filtered.length === 0) {
            // Safety fallback — should not happen with correct data
            filtered = speciesData.map((item, index) => ({ item, index }));
            placeholderText = '⚠️ No match found — showing all species';
        }
    }

    // Rebuild the dropdown
    treeSpeciesSelect.innerHTML = `<option value="" disabled selected>${placeholderText}</option>`;
    filtered.forEach(({ item, index }) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${item.species} - ${item.ecosystem}`;
        treeSpeciesSelect.appendChild(option);
    });

    // Restore previous selection only if it is still in the filtered list
    const stillValid = filtered.some(({ index }) => String(index) === String(previousSelection));
    if (stillValid) {
        treeSpeciesSelect.value = previousSelection;
    }
    // If not valid, the dropdown resets to the placeholder, prompting the user to re-select
}

/**
 * Rebuilds the state dropdown filtered to only show regions
 * where the selected tree species can grow.
 */
function populateStateDropdown(selectedSpeciesName) {
    const previousRegion = regionSelect.value;
    
    let filteredStates;
    if (!selectedSpeciesName) {
        // No species selected - show all states
        filteredStates = originalStates;
    } else {
        // Filter states that contain the selected species
        filteredStates = originalStates.filter(state => {
            if (state.value === 'Default') return true; // Always keep "All Regions"
            
            const speciesInState = window.stateSpeciesMap[state.value];
            return speciesInState && speciesInState.includes(selectedSpeciesName);
        });
    }

    // Rebuild the dropdown
    regionSelect.innerHTML = '';
    filteredStates.forEach(state => {
        const option = document.createElement('option');
        option.value = state.value;
        option.textContent = state.text;
        regionSelect.appendChild(option);
    });

    // Restore previous region if it's still in the filtered list
    const stillValid = filteredStates.some(state => state.value === previousRegion);
    if (stillValid) {
        regionSelect.value = previousRegion;
    } else {
        regionSelect.value = 'Default';
    }
}

// Step 2: Update the survival rate badge live when the slider is moved
survivalRateInput.addEventListener('input', function() {
    survivalBadge.textContent = this.value + '%';
});

// Step 3: Handle the calculate button click (async to await weather fetch)
calculateBtn.addEventListener('click', async function() {
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
    if (projectDuration > 30) {
        alert("Project duration cannot exceed 30 years.\nThe species biomass data only covers 30 years of growth.");
        return;
    }

    // Retrieve the selected species data
    const selectedSpecies = speciesData[selectedSpeciesIndex];

    // 3c. Fetch live weather and compute the dynamic multiplier
    const region = regionSelect.value;
    const weatherMultiplier = await fetchWeatherForRegion(region);

    // Perform the calculations
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
        
        // Total CO2 in kg for all effective trees this year, scaled by weather multiplier
        const co2ThisYearKg = co2PerTreeTons * 1000 * effectiveTrees * weatherMultiplier;
        
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

    const regionLabel = region === 'Default' ? 'All Regions' : region;
    
    // Save for the database feature (includes live weather multiplier)
    lastCalculation = {
        trees_planted: treesPlanted,
        species_index: selectedSpeciesIndex,
        species_name: selectedSpecies.species,
        duration: projectDuration,
        survival_rate: survivalRate,
        region_name: regionLabel,
        region_multiplier: weatherMultiplier,
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
    // Also filter the state dropdown based on the saved species
    populateStateDropdown(est.species_name);

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
