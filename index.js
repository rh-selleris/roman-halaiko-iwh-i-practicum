require('dotenv').config();
const path = require('node:path');
const express = require('express');
const axios = require('axios');
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

const fields = ['item_name', 'price', 'category'];
const objectType = process.env.HUBSPOT_OBJECT_TYPE || '2-254835852';
const hubspot = axios.create({
    baseURL: 'https://api.hubapi.com',
    timeout: 15000,
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN || ''}` }
});
const objectPath = `/crm/v3/objects/${encodeURIComponent(objectType)}`;

function requireToken() {
    if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
        const error = new Error('Set HUBSPOT_PRIVATE_APP_TOKEN in your local .env file.');
        error.status = 503;
        throw error;
    }
}

app.get('/update-cobj', (req, res) => {
    res.render('updates', {
        title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
        values: {}, error: null
    });
});

if (require.main === module) {
    app.listen(process.env.PORT || 3000, () => console.log('Listening on http://localhost:' + (process.env.PORT || 3000)));
}
module.exports = { app, hubspot };
