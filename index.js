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

app.post('/update-cobj', async (req, res, next) => {
    const values = Object.fromEntries(fields.map(field => [field,
        typeof req.body?.[field] === 'string' ? req.body[field].trim() : ''
    ]));
    const price = Number(values.price);
    if (!values.item_name || !values.category || values.item_name.length > 200 ||
        values.category.length > 200 || !values.price || !Number.isFinite(price) ||
        price < 0 || !/^\d+(\.\d{1,2})?$/.test(values.price)) {
        return res.status(400).render('updates', {
            title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
            values, error: 'Enter an item name, category, and non-negative price with up to two decimal places.'
        });
    }
    try {
        requireToken();
        await hubspot.post(objectPath, { properties: values });
        res.redirect(303, '/');
    } catch (error) {
        next(error);
    }
});

app.get('/', async (req, res, next) => {
    try {
        requireToken();
        const data = [];
        let after;
        do {
            const response = await hubspot.get(objectPath, {
                params: { properties: fields.join(','), limit: 100, after }
            });
            data.push(...response.data.results);
            after = response.data.paging?.next?.after;
        } while (after !== undefined && after !== null);
        res.render('homepage', { title: 'Restaurant Menu Items | Integrating With HubSpot I Practicum', data });
    } catch (error) {
        next(error);
    }
});

if (require.main === module) {
    app.listen(process.env.PORT || 3000, () => console.log('Listening on http://localhost:' + (process.env.PORT || 3000)));
}
module.exports = { app, hubspot };
