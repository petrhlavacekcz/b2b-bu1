const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment variables
const API_TOKEN = process.env.API_TOKEN;
const PORT = process.env.PORT || 3000;

// Proxy endpoint for Baselinker API
app.post('/api/baselinker', async (req, res) => {
    try {
        const { method, parameters } = req.body;

        const response = await axios.post('https://api.baselinker.com/connector.php', 
            new URLSearchParams({
                method: method,
                parameters: JSON.stringify(parameters)
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-BLToken': API_TOKEN
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error calling Baselinker API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error calling Baselinker API', details: error.message });
    }
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.use(express.static('public', { 
    setHeaders: (res, path, stat) => {
      if (path.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
      }
    }
  }));