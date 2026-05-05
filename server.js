const express = require('express');
require('dotenv').config();
const crypto = require('crypto');
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const app = express();  
app.use(express.json());
app.use(require('cors')());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
console.log("Plaid Products transactions")
console.log(Products.Transactions)
app.post('/create_link_token', async (req, res) => {
    
  try {
    const hashedUserId = crypto.createHash('sha256').update(req.body.userId).digest('hex');
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: hashedUserId },
      client_name: 'My App',
      products: [Products.Transactions],
      account_filters: {
        depository: {
            account_subtypes: ["checking", "savings"]
        }
      },
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
    const { public_token, userId } = req.body;
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = response.data.access_token;

    await supabase.from('Users').update({ access_token: accessToken }).eq('email', userId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error exchanging token');
  }
});

app.post('/transactions', async (req, res) => {
  try {
    const { userId } = req.body;
    const { data: userData, error } = await supabase
      .from('Users').select('access_token').eq('email', userId).single();

    if (error || !userData?.access_token) {
      return res.status(404).json({ error: 'No linked bank account found' });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const response = await plaidClient.transactionsGet({
      access_token: userData.access_token,
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });

    const transactions = response.data.transactions.map(tx => ({
      transaction_id: tx.transaction_id,
      name: tx.name,
      amount: tx.amount,  
      date: tx.date
    }));

    res.json({ 
        transactions : transactions,
        num_transactions: transactions.length
    });
  } catch (err) {
    console.error('Transactions error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.post('/trigger_random_plaid_expenses', async (req, res) => {
  try {
    const { userId } = req.body;


    const { data: userData, error } = await supabase
      .from('Users')
      .select('access_token')
      .eq('email', userId)
      .single();

    if (error || !userData?.access_token) {
      return res.status(404).json({ error: 'User or access token not found' });
    }

    const merchants = [
      "Starbucks",
      "Amazon",
      "Uber",
      "McDonald's",
      "Target",
      "Netflix",
      "Whole Foods",
      "Chipotle",
      "Spotify",
      "Apple Store"
    ];

    const randomMerchant = merchants[Math.floor(Math.random() * merchants.length)];
    const randomAmount = parseFloat((Math.random() * 100 + 5).toFixed(2));
    console.log(randomMerchant + " " + randomAmount)
    const today = new Date();
    const date = new Date();
    date.setDate(today.getDate());

    const isoDate = date.toISOString().split('T')[0];

    const plaidResponse = await plaidClient.sandboxTransactionsCreate({
      access_token: userData.access_token,
      transactions: [
        {
          amount: randomAmount,
          date_posted: isoDate,
          date_transacted: isoDate,
          description: randomMerchant,
          iso_currency_code: "USD"
        }
      ]
    });

    res.json({
      success: true,
      plaid: plaidResponse.data
    });

  } catch (err) {
    console.error("Plaid sandbox error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.post('/categories', async(req, res) =>{
    
    const plaidResponse = await plaidClient.personal
    res.json({
        sucess: true,
        categories: plaidResponse.data.categories
    })

});

app.post('/trigger_random_plaid_income', async (req, res) => {
  try {
    const { userId } = req.body;


    const { data: userData, error } = await supabase
      .from('Users')
      .select('access_token')
      .eq('email', userId)
      .single();

    if (error || !userData?.access_token) {
      return res.status(404).json({ error: 'User or access token not found' });
    }

    const incomeSources = [
    "Employer Payroll",
    "Direct Deposit",
    "Salary",
    "Hourly Wages",
    "Freelance Payment",
    "Contract Work",
    "Consulting Income",
    "Gig Work",
    "Uber Driver Earnings",
    "DoorDash Earnings",
    "Tips",
    "Bonus Payment",
    "Commission",
    "Refund",
    "Cashback Reward",
    "Interest Income",
    "Dividend Payment",
    "Investment Withdrawal",
    "Venmo Payment Received",
    "Zelle Payment Received",
    "PayPal Transfer",
    "Tax Refund",
    "Government Benefit",
    "Scholarship",
    "Grant Disbursement",
    "Financial Aid Refund",
    "Family Transfer"
    ];

    const randomMerchant = incomeSources[Math.floor(Math.random() * merchants.length)];
    const randomAmount = parseFloat((Math.random() * 1800 + 500).toFixed(2));
    console.log(randomMerchant + " " + randomAmount)
    const today = new Date();
    const date = new Date();
    date.setDate(today.getDate());

    const isoDate = date.toISOString().split('T')[0];

    const plaidResponse = await plaidClient.sandboxTransactionsCreate({
      access_token: userData.access_token,
      transactions: [
        {
          amount: -randomAmount, // negative is income
          date_posted: isoDate,
          date_transacted: isoDate,
          description: randomMerchant,
          iso_currency_code: "USD"
        }
      ]
    });

    res.json({
      success: true,
      plaid: plaidResponse.data
    });

  } catch (err) {
    console.error("Plaid sandbox error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.post('/categories', async(req, res) =>{
    
    const plaidResponse = await plaidClient.personal
    res.json({
        sucess: true,
        categories: plaidResponse.data.categories
    })

});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));