# Stripe Test Mode Setup Guide (Free)

Follow these steps to set up Stripe in Test Mode to obtain your API keys, product prices, and webhook secrets.

---

## Step 1: Create a Free Stripe Account
1. Go to [stripe.com](https://stripe.com) and click **Sign Up**.
2. Complete the registration. You do **not** need to enter corporate registration details or business banking info to use Test Mode.

---

## Step 2: Enable Test Mode
1. Once logged into the Stripe Dashboard, look at the top right header.
2. Toggle on the **Test Mode** switch. All actions performed now are simulated and free.

---

## Step 3: Retrieve API Keys
1. Go to the Search bar at the top or navigate directly to **Developers > API Keys**.
2. Copy the **Secret Key** (starts with `sk_test_...`).
3. Add this key to your backend `.env` file:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   ```

---

## Step 4: Create Pricing Plans (Products)
You need to create the Pro and Enterprise subscription items to get their unique Price IDs:
1. Navigate to **Product Catalog** and click **Add Product** (or **Create Product**).
2. **Pro Plan**:
   * Name: `Pro Plan`
   * Price Type: `Recurring`
   * Billing Period: `Monthly`
   * Amount: `$29.00`
   * Click **Save Product**.
   * Copy the **API ID** for the price (starts with `price_...`).
3. **Enterprise Plan**:
   * Name: `Enterprise Plan`
   * Price Type: `Recurring`
   * Billing Period: `Monthly`
   * Amount: `$99.00`
   * Click **Save Product**.
   * Copy the **API ID** for the price (starts with `price_...`).
4. Paste both IDs into your backend `.env` file:
   ```env
   STRIPE_PRO_PRICE_ID=price_pro_price_id_here
   STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_price_id_here
   ```

---

## Step 5: Configure Local Webhooks (Stripe CLI)
To test webhook events (like successful payments updating quotas in real-time) locally:
1. Download and install the [Stripe CLI](https://docs.stripe.com/stripe-cli).
2. Open your terminal and run:
   ```bash
   stripe login
   ```
3. Follow the browser prompt to authenticate.
4. Start forwarding webhook events to your running FastAPI backend:
   ```bash
   stripe listen --forward-to localhost:8000/api/v1/billing/webhook
   ```
5. Copy the printed **Webhook Signing Secret** (starts with `whsec_...`) from the terminal.
6. Paste it into your backend `.env` file:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_signing_secret_here
   ```

---

## Summary of Backend `.env` Keys

Your updated `backend/.env` file will look like this:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```
*(Once these variables are set, Luminary will automatically switch from the mock upgrade flow to the actual Stripe Checkout forms).*
