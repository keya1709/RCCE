require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins for local dev
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint: Save a new estimation
app.post('/api/estimations', (req, res) => {
    const { 
        user_email, 
        trees_planted, 
        species_index, 
        species_name, 
        duration, 
        survival_rate,
        region_name,
        region_multiplier,
        effective_trees,
        annual_co2,
        total_co2,
        carbon_credits
    } = req.body;

    if (!user_email) {
        return res.status(400).json({ error: 'user_email is required' });
    }

    const sql = `INSERT INTO estimations (
        user_email, trees_planted, species_index, species_name, duration, survival_rate, region_name, region_multiplier, effective_trees, annual_co2, total_co2, carbon_credits
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        user_email, trees_planted, species_index, species_name, duration, survival_rate, region_name, region_multiplier, effective_trees, annual_co2, total_co2, carbon_credits
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error inserting estimation:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            id: this.lastID
        });
    });
});

// API Endpoint: Get all estimations for a user
app.get('/api/estimations/:email', (req, res) => {
    const sql = `SELECT * FROM estimations WHERE user_email = ? ORDER BY created_at DESC`;
    const params = [req.params.email];
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// API Endpoint: Update an estimation
app.put('/api/estimations/:id', (req, res) => {
    const { 
        trees_planted, species_index, species_name, duration, survival_rate,
        region_name, region_multiplier, effective_trees, annual_co2, total_co2, carbon_credits
    } = req.body;

    const sql = `UPDATE estimations SET 
        trees_planted = ?, species_index = ?, species_name = ?, duration = ?, survival_rate = ?, 
        region_name = ?, region_multiplier = ?, effective_trees = ?, annual_co2 = ?, total_co2 = ?, carbon_credits = ?
        WHERE id = ?`;
    
    const params = [
        trees_planted, species_index, species_name, duration, survival_rate, 
        region_name, region_multiplier, effective_trees, annual_co2, total_co2, carbon_credits, req.params.id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error updating estimation:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', changes: this.changes });
    });
});

// API Endpoint: Delete an estimation
// API Endpoint: Proxy for OpenWeather API (keeps key secure on backend)
app.get('/api/weather', async (req, res) => {
    const { city } = req.query;
    console.log(`[Weather API] Request received for city: ${city}`);
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!city) {
        return res.status(400).json({ error: 'City is required' });
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            console.error(`[Weather API] OpenWeather error for ${city}:`, data);
            return res.status(response.status).json(data);
        }
        
        console.log(`[Weather API] Successfully fetched weather for ${city}`);
        res.json(data);
    } catch (error) {
        console.error(`[Weather API] Fetch failed for ${city}:`, error);
        res.status(500).json({ error: 'Internal server error fetching weather' });
    }
});

app.delete('/api/estimations/:id', (req, res) => {
    const sql = `DELETE FROM estimations WHERE id = ?`;
    db.run(sql, req.params.id, function(err) {
        if (err) {
            console.error('Error deleting estimation:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', changes: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
