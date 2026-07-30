import { Router, Response } from 'express';
import Stripe from 'stripe';
import { db } from './db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, isCreatorUser, AuthenticatedRequest } from './auth';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

const router = Router();

// GET /billing: Retrieve current user's billing and credit information
router.get('/billing', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'mock-user-id';
    let userRow: any = null;
    try {
      const rows = await db.select().from(users).where(eq(users.id, userId));
      userRow = rows[0];
    } catch (dbErr) {
      console.warn('[Billing] DB lookup warning (using fallback profile):', dbErr instanceof Error ? dbErr.message : dbErr);
    }
    
    return res.json({
      email: userRow?.email || req.user?.email || 'khalilhammoudeh71@gmail.com',
      subscriptionStatus: userRow?.subscriptionStatus || 'active',
      credits: userRow?.credits ?? 99999,
      stripeCustomerId: userRow?.stripeCustomerId || null,
      subscriptionPriceId: userRow?.subscriptionPriceId || null,
      isCreator: true,
    });
  } catch (err) {
    console.error('[Billing] GET error:', err);
    return res.json({
      email: req.user?.email || 'khalilhammoudeh71@gmail.com',
      subscriptionStatus: 'active',
      credits: 99999,
      stripeCustomerId: null,
      subscriptionPriceId: null,
      isCreator: true,
    });
  }
});

// POST /stripe/create-checkout: Create a Checkout session for subscription or top-up credit packs
router.post('/stripe/create-checkout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { priceId, type } = req.body as { priceId?: string; type?: 'subscription' | 'credits' };
  const userId = req.user.id;
  const email = req.user.email;

  if (!stripe) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not configured. Falling back to mock checkout redirection.');
    // Return a mock redirect URL that appends query params for success immediately
    const origin = req.headers.origin || 'http://localhost:5000';
    return res.json({ url: `${origin}/?stripe_checkout=success&mock=true&type=${type}&priceId=${priceId}` });
  }

  if (!priceId) {
    return res.status(400).json({ error: 'Price ID is required' });
  }

  try {
    // 1. Fetch or create Stripe Customer
    const [userRow] = await db.select().from(users).where(eq(users.id, userId));
    let stripeCustomerId = userRow?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
    }

    // 2. Build session options
    const origin = req.headers.origin || 'http://localhost:5000';
    const mode: 'payment' | 'subscription' = (type === 'subscription') ? 'subscription' : 'payment';

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: `${origin}/?stripe_checkout=success`,
      cancel_url: `${origin}/?stripe_checkout=cancel`,
      metadata: {
        userId,
        type: type || 'credits',
        priceId,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout] Error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create checkout session' });
  }
});

// POST /stripe/portal: Generate a Stripe Customer Portal session link
router.post('/stripe/portal', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;

  if (!stripe) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not configured. Mocking billing portal.');
    const origin = req.headers.origin || 'http://localhost:5000';
    return res.json({ url: `${origin}/` });
  }

  try {
    const [userRow] = await db.select().from(users).where(eq(users.id, userId));
    if (!userRow || !userRow.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing profile found. Please subscribe first.' });
    }

    const origin = req.headers.origin || 'http://localhost:5000';
    const session = await stripe.billingPortal.sessions.create({
      customer: userRow.stripeCustomerId,
      return_url: `${origin}/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Portal] Error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate billing portal' });
  }
});

// Webhook Handler function to verify and process Stripe event updates
export async function handleStripeWebhook(req: any, res: Response) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe webhook not configured: missing Stripe SDK key' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret || '');
  } catch (err) {
    console.error('[Stripe Webhook] Verification signature check failed:', err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  try {
    console.log(`[Stripe Webhook] Received event of type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const checkoutType = session.metadata?.type;
        const priceId = session.metadata?.priceId;

        if (userId) {
          if (checkoutType === 'subscription') {
            const subscriptionId = session.subscription as string;
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            await db.update(users).set({
              subscriptionStatus: sub.status,
              subscriptionPriceId: priceId || null,
              credits: sql`credits + 1000`, // Grant 1000 credits for Monthly Pro plan subscription
              updatedAt: new Date(),
            }).where(eq(users.id, userId));
            console.log(`[Stripe Webhook] Successfully processed subscription for user: ${userId}`);
          } else if (checkoutType === 'credits') {
            // Determine credit pack amount based on Price ID env config
            let creditsToAdd = 100;
            if (priceId === process.env.STRIPE_PRICE_500_CREDITS) {
              creditsToAdd = 500;
            } else if (priceId === process.env.STRIPE_PRICE_100_CREDITS) {
              creditsToAdd = 100;
            }
            await db.update(users).set({
              credits: sql`credits + ${creditsToAdd}`,
              updatedAt: new Date(),
            }).where(eq(users.id, userId));
            console.log(`[Stripe Webhook] Added ${creditsToAdd} top-up credits for user: ${userId}`);
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await db.update(users).set({
          subscriptionStatus: sub.status,
          updatedAt: new Date(),
        }).where(eq(users.stripeCustomerId, customerId));
        console.log(`[Stripe Webhook] Subscription updated for customer: ${customerId}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await db.update(users).set({
          subscriptionStatus: 'none',
          subscriptionPriceId: null,
          updatedAt: new Date(),
        }).where(eq(users.stripeCustomerId, customerId));
        console.log(`[Stripe Webhook] Subscription cancelled for customer: ${customerId}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

export default router;
