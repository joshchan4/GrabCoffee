const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const supabase = require('../utils/supabaseClient');
const https = require('https');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to make HTTPS requests
function makeHttpsRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsedBody });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

router.post('/create-payment-intent', async (req, res) => {
  try {
    const { items, customerName, address, method, tax = 0, tip = 0 } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided.' });
    }

    // 1. Calculate subtotal and total (in cents)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + tax + tip;
    const totalAmountInCents = Math.round(total * 100);

    console.log('🔔 Creating PaymentIntent for:', totalAmountInCents, 'CAD');

    // 2. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountInCents,
      currency: 'cad',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ PaymentIntent:', paymentIntent.id);

    // 3. Insert order rows to Supabase (optional now, or defer until after confirmation)
    const rows = items.map((item, index) => ({
      name: customerName,
      drink_id: parseInt(item.drink_id),
      drink_name: item.name,
      sugar: item.sugar,
      milk: item.milkType,
      price: item.price,
      quantity: item.quantity,
      totalAmount: item.price * item.quantity,
      location: address,
      delivered: index === 0 ? 'f' : null,
      ready: index === 0 ? 'f' : null,
      method: method,
      paymentMethod: 'apple-pay', // or set dynamically later
      tax: index === 0 ? tax : null,
      tip: index === 0 ? tip : null,
    }));

    const { error: insertError } = await supabase.from('Orders').insert(rows);

    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // 4. Return clientSecret and total amount (in dollars) to frontend
    return res.json({
      clientSecret: paymentIntent.client_secret,
      amount: (totalAmountInCents / 100).toFixed(2) // string, e.g. "10.33"
    });

  } catch (err) {
    console.error('❌ Payment creation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// PayPal: Create Order
router.post('/create-paypal-order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required.' });

    // 1. Get PayPal access token
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await makeHttpsRequest('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'grant_type=client_credentials');
    
    const { access_token } = tokenRes.data;
    if (!access_token) return res.status(500).json({ error: 'Failed to get PayPal access token.' });

    // 2. Create PayPal order
    const orderRes = await makeHttpsRequest('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'CAD',
          value: amount
        }
      }],
      application_context: {
        return_url: 'https://example.com/paypal-success', // TODO: Replace with your real return URL
        cancel_url: 'https://example.com/paypal-cancel'   // TODO: Replace with your real cancel URL
      }
    }));
    
    const order = orderRes.data;
    const approvalUrl = order.links && order.links.find(l => l.rel === 'approve')?.href;
    if (!approvalUrl) return res.status(500).json({ error: 'Failed to get PayPal approval URL.' });
    res.json({ approvalUrl });
  } catch (err) {
    console.error('❌ PayPal order creation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
