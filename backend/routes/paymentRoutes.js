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
    console.log('Received save_payment_method:', req.body.save_payment_method);
    const { items, customerName, address, method, tax = 0, tip = 0, order_time, paymentMethodId, userId, amountInCents } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided.' });
    }

    // Validate required fields
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (method === 'delivery' && (!address || !address.trim())) {
      return res.status(400).json({ error: 'Delivery address is required.' });
    }

    // Validate amountInCents
    if (!amountInCents || amountInCents <= 0) {
      // Fallback: calculate from items if amountInCents is missing
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const calculatedTotal = subtotal + tax + tip;
      const calculatedAmountInCents = Math.round(calculatedTotal * 100);
      
      console.log('⚠️ amountInCents missing, calculating fallback:', {
        subtotal,
        tax,
        tip,
        calculatedTotal,
        calculatedAmountInCents
      });
      
      if (calculatedAmountInCents <= 0) {
        console.error('❌ Invalid calculated amount:', calculatedAmountInCents);
        return res.status(400).json({ error: 'Missing required param: amount.' });
      }
      
      totalAmountInCents = calculatedAmountInCents;
    } else {
      totalAmountInCents = amountInCents;
    }

    // Calculate ETA based on method
    const DEFAULT_PICKUP_ETA_MINUTES = 15;
    const DEFAULT_DELIVERY_ETA_MINUTES = 30;
    const etaMinutes = method === 'pickup' ? DEFAULT_PICKUP_ETA_MINUTES : DEFAULT_DELIVERY_ETA_MINUTES;

    // Calculate subtotal for later use in order creation
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    console.log('🔔 Creating PaymentIntent for:', totalAmountInCents, 'cents (CAD)');

    // 2. Handle customer creation/retrieval for logged-in users
    let customerId = null;
    if (userId) {
      try {
        // Check if user already has a Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        if (profile?.stripe_customer_id) {
          customerId = profile.stripe_customer_id;
        } else {
          // Create new Stripe customer
          const customer = await stripe.customers.create({
            name: customerName,
            metadata: {
              supabase_user_id: userId
            }
          });
          customerId = customer.id;

          // Save Stripe customer ID to user profile
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);
        }
      } catch (error) {
        console.error('Error handling customer:', error);
      }
    }

    // 3. Create Stripe PaymentIntent with setup for future usage
    const paymentIntentData = {
      amount: totalAmountInCents,
      currency: 'cad',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        save_payment_method: req.body.save_payment_method !== false ? 'true' : 'false',
      },
    };

    // Add customer if available
    if (customerId) {
      paymentIntentData.customer = customerId;
      paymentIntentData.setup_future_usage = 'off_session'; // Save card for future use
    }

    // Add payment method if provided (for saved cards)
    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
      paymentIntentData.off_session = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    console.log('PaymentIntent metadata:', paymentIntent.metadata);

    // 4. Insert order rows to Supabase (optional now, or defer until after confirmation)
    const rows = items.map((item, index) => {
      const itemSubtotal = item.price * item.quantity;
      const taxShare = subtotal > 0 ? (itemSubtotal / subtotal) * tax : 0;
      const tipShare = subtotal > 0 ? (itemSubtotal / subtotal) * tip : 0;
      return {
        name: customerName,
        drink_id: parseInt(item.drink_id),
        drink_name: item.name,
        sugar: item.sugar,
        milk: item.milkType,
        extra_shot: item.extraShot,
        price: item.price,
        quantity: item.quantity,
        totalAmount: itemSubtotal + taxShare + tipShare,
        location: address,
        delivered: index === 0 ? false : null,
        ready: index === 0 ? false : null,
        method: method,
        paymentMethod: 'apple-pay', // or set dynamically later
        tax: index === 0 ? tax : null,
        tip: index === 0 ? tip : null,
        eta: index === 0 ? etaMinutes : null, // Only set on first row
        order_time: order_time,
        user_id: userId || null, // Add user_id to track orders
        stripe_payment_method_id: paymentMethodId || null, // <-- Add this line
      };
    });

    const { data: orderData, error: insertError } = await supabase.from('Orders').insert(rows).select('id');

    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // 5. Return clientSecret, total amount, and order ID to frontend
    return res.json({
      clientSecret: paymentIntent.client_secret,
      amount: (totalAmountInCents / 100).toFixed(2), // string, e.g. "10.33"
      orderId: orderData?.[0]?.id
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
    const tokenRes = await makeHttpsRequest('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'grant_type=client_credentials');
    
    const { access_token } = tokenRes.data;
    if (!access_token) return res.status(500).json({ error: 'Failed to get PayPal access token.' });

    // 2. Create PayPal order
    const orderRes = await makeHttpsRequest('https://api-m.paypal.com/v2/checkout/orders', {
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
        return_url: 'https://grab-coffee-global.onrender.com/paypal-success',
        cancel_url: 'https://grab-coffee-global.onrender.com/paypal-cancel'
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

// --- CHARGE TIP ENDPOINT ---
router.post('/charge-tip', async (req, res) => {
  try {
    const { amount, customerId, paymentMethodId, orderId } = req.body;
    if (!amount || !customerId || !paymentMethodId) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // amount in cents
      currency: 'cad',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: { orderId, type: 'tip' }
    });
    res.json({ success: true, paymentIntent });
  } catch (err) {
    console.error('❌ Tip charge error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Stripe Webhook Handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📦 Webhook event received:', event.type);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      console.log('❌ Payment failed:', event.data.object.last_payment_error?.message);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log('Webhook PaymentIntent metadata:', paymentIntent.metadata);
    if (paymentIntent.metadata && paymentIntent.metadata.save_payment_method === 'false') {
      console.log('User opted not to save payment method. Deleting if present.');
      await supabase
        .from('payment_methods')
        .delete()
        .eq('stripe_payment_method_id', paymentIntent.payment_method);
      return;
    }

    const paymentMethodId = paymentIntent.payment_method;
    const customerId = paymentIntent.customer;

    if (!paymentMethodId || !customerId) {
      console.log('⚠️ No payment method or customer ID found');
      return;
    }

    // Fetch payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod.card) {
      console.log('⚠️ Payment method is not a card');
      return;
    }

    // Find user by Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profileError || !profile) {
      console.log('⚠️ No user found for customer ID:', customerId);
      return;
    }

    // Check for duplicate payment method
    const { data: existingMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', profile.id)
      .eq('card_type', paymentMethod.card.brand)
      .eq('last4', paymentMethod.card.last4)
      .eq('exp_month', paymentMethod.card.exp_month)
      .eq('exp_year', paymentMethod.card.exp_year)
      .eq('brand', paymentMethod.card.brand)
      .eq('name', paymentMethod.billing_details.name || profile.full_name || '')
      .eq('type', 'card')
      .single();

    if (existingMethod) {
      console.log('ℹ️ Payment method already exists for this user');
      return;
    }

    // Save payment method to Supabase
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: profile.id,
        stripe_payment_method_id: paymentMethod.id,
        card_type: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
        brand: paymentMethod.card.brand,
        name: paymentMethod.billing_details.name || profile.full_name || '',
        type: 'card',
        is_default: false // Will be set to true if it's the first method
      })
      .select();

    if (error) {
      console.error('❌ Error saving payment method:', error);
      return;
    }

    // Set as default if it's the first payment method
    const { count } = await supabase
      .from('payment_methods')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    if (count === 1) {
      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', data[0].id);
    }

    console.log('✅ Payment method saved successfully');

  } catch (error) {
    console.error('❌ Error handling payment intent succeeded:', error);
  }
}

module.exports = router;
