const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'C:\\Users\\nehak\\Dropbox\\My PC (LAPTOP-2JGJBJKB)\\Downloads\\Appendix-B.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Headers are in row 1 (index 1)
    const headers = data[1];
    
    // States start at index 4
    const states = headers.slice(4).map(h => {
        // Clean up "Jammu and Kashmir (JK)" to "Jammu and Kashmir" if needed, but let's keep original for now or map to our list
        return h.trim();
    });

    // Species to look for based on species.json
    const searchTerms = [
        { name: 'Teak (Tectona grandis)', query: 'Tectona grandis' },
        { name: 'Eucalyptus', query: 'Eucalyptus' },
        { name: 'Bamboo (Dendrocalamus)', query: 'Dendrocalamus' },
        { name: 'Neem (Azadirachta indica)', query: 'Azadirachta indica' },
        { name: 'Mango (Mangifera indica)', query: 'Mangifera indica' },
        { name: 'Peepal (Ficus religiosa)', query: 'Ficus religiosa' },
        { name: 'Pine (Pinus roxburghii)', query: 'Pinus roxburghii' },
        { name: 'Silver Oak (Grevillea robusta)', query: 'Grevillea robusta' },
        { name: 'Casuarina', query: 'Casuarina' },
        { name: 'Moringa (Drumstick)', query: 'Moringa' }
    ];

    const stateSpeciesMap = {};
    states.forEach(state => stateSpeciesMap[state] = []);

    // Find rows
    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const acceptedName = row[0].toString().toLowerCase();

        for (const term of searchTerms) {
            if (acceptedName.includes(term.query.toLowerCase())) {
                // Found a match
                console.log(`Found match for ${term.name}: ${row[0]}`);
                // Map to states
                for (let s = 0; s < states.length; s++) {
                    const isPresent = row[4 + s] == 1;
                    if (isPresent) {
                        if (!stateSpeciesMap[states[s]].includes(term.name)) {
                            stateSpeciesMap[states[s]].push(term.name);
                        }
                    }
                }
            }
        }
    }

    console.log('\n--- State Species Mapping ---');
    // Just print the first 3 states as an example
    for(let i=0; i<3; i++) {
        console.log(states[i], stateSpeciesMap[states[i]]);
    }
    
    // Save to a JSON file to inspect
    fs.writeFileSync('state_species_map.json', JSON.stringify(stateSpeciesMap, null, 2));
    console.log('Saved full map to state_species_map.json');

} catch (e) {
    console.error('Error reading file:', e);
}
