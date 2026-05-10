import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: "2023-10-16",
});

const db = admin.firestore();

// Price IDs — set these via: firebase functions:config:set stripe.monthly_price_id="price_xxx" etc.
function getPriceIds() {
  const config = functions.config().stripe;
  return {
    monthly: config.monthly_price_id,
    yearly: config.yearly_price_id,
    lifetime: config.lifetime_price_id,
  };
}

/**
 * Create a Stripe customer linked to Firebase UID.
 * Called once when user first signs in.
 */
export const createCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email || data.email;

  // Check if customer already exists
  const userDoc = await db.collection("stripe_customers").doc(uid).get();
  if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
    return { customerId: userDoc.data()?.stripeCustomerId };
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { firebaseUID: uid },
  });

  await db.collection("stripe_customers").doc(uid).set({
    stripeCustomerId: customer.id,
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { customerId: customer.id };
});

/**
 * Create a subscription (monthly or yearly).
 * Returns a client secret for the PaymentSheet.
 */
export const createSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = context.auth.uid;
  const { planType } = data as { planType: "monthly" | "yearly" };

  if (!planType || !["monthly", "yearly"].includes(planType)) {
    throw new functions.https.HttpsError("invalid-argument", "planType must be 'monthly' or 'yearly'");
  }

  const userDoc = await db.collection("stripe_customers").doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "No Stripe customer found. Call createCustomer first.");
  }

  const customerId = userDoc.data()!.stripeCustomerId;
  const priceIds = getPriceIds();
  const priceId = planType === "monthly" ? priceIds.monthly : priceIds.yearly;

  // Create the subscription with payment_behavior to collect payment
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: { firebaseUID: uid, planType },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  // Create ephemeral key for PaymentSheet
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2023-10-16" }
  );

  return {
    subscriptionId: subscription.id,
    clientSecret: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
  };
});

/**
 * Create a one-time payment intent for lifetime access.
 */
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = context.auth.uid;

  const userDoc = await db.collection("stripe_customers").doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "No Stripe customer found. Call createCustomer first.");
  }

  const customerId = userDoc.data()!.stripeCustomerId;
  const priceIds = getPriceIds();

  // Get the price amount from Stripe
  const price = await stripe.prices.retrieve(priceIds.lifetime);
  const amount = price.unit_amount!;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    customer: customerId,
    metadata: { firebaseUID: uid, planType: "lifetime" },
  });

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2023-10-16" }
  );

  return {
    clientSecret: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
  };
});

/**
 * Cancel an active subscription.
 */
export const cancelSubscription = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = context.auth.uid;

  const subDoc = await db.collection("subscriptions").doc(uid).get();
  if (!subDoc.exists || !subDoc.data()?.stripeSubscriptionId) {
    throw new functions.https.HttpsError("not-found", "No active subscription found");
  }

  const subscriptionId = subDoc.data()!.stripeSubscriptionId;

  // Cancel at period end so user keeps access until current period ends
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  await db.collection("subscriptions").doc(uid).update({
    cancelAtPeriodEnd: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

/**
 * Get current subscription status for authenticated user.
 */
export const getSubscriptionStatus = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = context.auth.uid;
  const subDoc = await db.collection("subscriptions").doc(uid).get();

  if (!subDoc.exists) {
    return {
      status: "free",
      planType: null,
      expiryDate: null,
      cancelAtPeriodEnd: false,
    };
  }

  const data = subDoc.data()!;
  return {
    status: data.status || "free",
    planType: data.planType || null,
    expiryDate: data.currentPeriodEnd?.toDate?.()?.toISOString() || null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
  };
});

/**
 * Stripe webhook handler.
 * Set webhook URL in Stripe Dashboard: https://<region>-<project>.cloudfunctions.net/stripeWebhook
 * Required events: invoice.payment_succeeded, customer.subscription.updated,
 *   customer.subscription.deleted, payment_intent.succeeded
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = functions.config().stripe.webhook_secret;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const uid = subscription.metadata.firebaseUID;
        if (uid) {
          await db.collection("subscriptions").doc(uid).set({
            stripeSubscriptionId: subscription.id,
            status: "active",
            planType: subscription.metadata.planType || "monthly",
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(
              new Date(subscription.current_period_end * 1000)
            ),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = subscription.metadata.firebaseUID;
      if (uid) {
        const status = subscription.status === "active" ? "active" : subscription.status;
        await db.collection("subscriptions").doc(uid).set({
          stripeSubscriptionId: subscription.id,
          status,
          planType: subscription.metadata.planType || "monthly",
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(
            new Date(subscription.current_period_end * 1000)
          ),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = subscription.metadata.firebaseUID;
      if (uid) {
        await db.collection("subscriptions").doc(uid).set({
          stripeSubscriptionId: null,
          status: "free",
          planType: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const uid = paymentIntent.metadata.firebaseUID;
      const planType = paymentIntent.metadata.planType;

      // Handle lifetime one-time payment
      if (uid && planType === "lifetime") {
        await db.collection("subscriptions").doc(uid).set({
          status: "active",
          planType: "lifetime",
          currentPeriodEnd: null, // lifetime has no expiry
          cancelAtPeriodEnd: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      break;
    }
  }

  res.json({ received: true });
});
