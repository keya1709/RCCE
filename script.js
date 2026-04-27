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

// Variable to store our chart instance so we can destroy it before redrawing
let co2ChartInstance = null;
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
