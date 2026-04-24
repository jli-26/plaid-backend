const express = require('express');
require('dotenv').config();
const crypto = require('crypto'); 
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');
const PORT = process.env.PORT || 3000;



const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

const config = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
    }
  }
});

const plaidClient = new PlaidApi(config);

app.post('/create_link_token', async (req, res) => {
  try {
    const hashedUserId = crypto          
      .createHash('sha256')
      .update(req.body.userId)
      .digest('hex');
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: hashedUserId },
      client_name: 'My App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      android_package_name: 'com.example.myapplication'
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Plaid error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.post('/exchange_token', async (req, res) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: req.body.public_token
    });

    console.log('Access token:', response.data.access_token);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error exchanging token');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));