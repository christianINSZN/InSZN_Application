const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { Clerk } = require('@clerk/clerk-sdk-node');

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const clerkUserId = subscription.customer.metadata.clerkUserId;
      const plan = subscription.items.data[0].price.id === "price_1SIGOHF6OYpAGuKxF2bIISDL" ? 'pro' : 'premium';
      const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });
      await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { subscriptionPlan: plan },
      });
      console.log(`Updated user ${clerkUserId} with subscriptionPlan: ${plan}`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;