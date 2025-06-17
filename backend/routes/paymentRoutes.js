const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const supabase = require('../utils/supabaseClient');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      payment_method_types: ['card', 'apple_pay'],
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

    // 4. Return clientSecret to frontend
    return res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error('❌ Payment creation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
