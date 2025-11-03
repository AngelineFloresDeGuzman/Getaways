# PayPal Sandbox Setup Guide

This guide will help you set up a PayPal sandbox environment for testing payments in your Getaways application.

## Step 1: Create a PayPal Developer Account

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Click **"Log In"** in the top right corner
3. If you don't have a PayPal account:
   - Click **"Sign Up"** to create a new PayPal account
   - Fill in your details and verify your email
4. Log in with your PayPal credentials

## Step 2: Navigate to Developer Dashboard

1. After logging in, you'll see the **Developer Dashboard**
2. Click on **"Dashboard"** or navigate to: https://developer.paypal.com/dashboard

## Step 3: Create a Sandbox App

1. In the left sidebar, click on **"My Apps & Credentials"**
2. You'll see two sections:
   - **REST API apps** (for production)
   - **Sandbox** (for testing) ← Use this one first

3. Under the **Sandbox** section:
   - Click **"Create App"** button
   - Or if you see existing apps, you can use one of them

4. Fill in the app details:
   - **App Name**: `Getaways - Sandbox` (or any name you prefer)
   - **Merchant**: Select your sandbox business account (you may need to create one first)
   - **Features**: Make sure **"Accept Payments"** is enabled

5. Click **"Create App"**

## Step 4: Get Your Sandbox Client ID

1. After creating the app, you'll see your app details
2. Look for **"Client ID"** and **"Secret"**
3. **Important**: Copy the **Client ID** (not the Secret for frontend use)
   - It will look something like: `AeA1QIZXiflr1_-vKBUwSDHZJY...`
4. Keep this page open or save the Client ID somewhere safe

## Step 5: Create Sandbox Test Accounts (Optional but Recommended)

1. In the left sidebar, click on **"Accounts"** under **Sandbox** section
2. You'll see default sandbox accounts:
   - **Personal Account** (buyer/test user)
   - **Business Account** (merchant/you)

3. To create custom test accounts:
   - Click **"Create Account"**
   - Choose account type (Personal or Business)
   - Fill in details (email, password, etc.)
   - Click **"Create"**

4. **Test Account Credentials**:
   - Use these accounts to test payments
   - You can log into these accounts at: https://www.sandbox.paypal.com

## Step 6: Add Client ID to Your Project

1. In your project root directory, create a file named `.env` (if it doesn't exist)
2. Add the following line:
   ```
   VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
   ```
   Replace `your_sandbox_client_id_here` with the actual Client ID from Step 4

3. Example:
   ```
   VITE_PAYPAL_CLIENT_ID=AeA1QIZXiflr1_-vKBUwSDHZJY123456789
   ```

4. **Important**: 
   - Make sure `.env` is in your `.gitignore` file (don't commit credentials)
   - Never commit your Client ID or Secret to version control

## Step 7: Restart Your Development Server

1. Stop your current dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```
   Or:
   ```bash
   vite
   ```

3. Environment variables are loaded when the server starts, so you need to restart

## Step 8: Test the Integration

1. Navigate to your Payment page in your app
2. Click **"Connect PayPal Account"**
3. Enter a test PayPal email (you can use any email format, like `test@example.com`)
4. Accept the Policy & Compliance checkboxes
5. Click the PayPal button to test payment

### Testing Payments

When you click the PayPal payment button:
1. It will open PayPal's sandbox checkout (in a popup or redirect)
2. Log in with your **Sandbox Personal Account** credentials
3. Complete the payment flow
4. The payment will be processed in sandbox mode (no real money)

## Step 9: View Sandbox Transactions

There are **two ways** to view your sandbox transactions:

### Method 1: PayPal Developer Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
2. In the left sidebar, click on **"Sandbox"**
3. Click on **"Transactions"** (or **"Activity"** in some versions)
4. You'll see a list of all your test transactions here
5. Click on any transaction to see details (amount, payer, status, etc.)

### Method 2: PayPal Sandbox Site (Recommended)

1. Go to [PayPal Sandbox Login](https://www.sandbox.paypal.com)
2. Log in with your **Sandbox Business Account** credentials
   - If you haven't created one, go to Dashboard → Sandbox → Accounts → Create Account
3. Once logged in, you'll see the PayPal dashboard
4. Click on **"Activity"** or **"Transactions"** in the top menu
5. Here you can see:
   - All incoming payments
   - Payment status (Completed, Pending, Failed, etc.)
   - Transaction IDs
   - Payer details
   - Full payment history

### What to Look For:

- **Transaction ID**: Unique ID for each payment (saved to Firebase)
- **Status**: Should show "Completed" for successful payments
- **Amount**: The payment amount you charged
- **Payer Email**: The PayPal email used for payment
- **Date/Time**: When the transaction occurred

### Note:
- Transactions may take a few seconds to appear
- Refresh the page if you don't see recent transactions immediately
- All transactions in sandbox are test transactions (no real money)

## Common Issues & Solutions

### Issue: "PayPal button not showing"
- **Solution**: Check browser console for errors
- Make sure your Client ID is correct in `.env`
- Verify the `.env` file is in the project root
- Restart your dev server after adding `.env`

### Issue: "Invalid Client ID"
- **Solution**: Double-check the Client ID is correct
- Make sure there are no extra spaces in `.env` file
- Verify you're using the **Sandbox** Client ID (not production)

### Issue: "PayPal window not opening"
- **Solution**: Check browser popup blocker settings
- Try allowing popups for your localhost domain

## Production Setup (Later)

When you're ready for production:

1. Go back to **"My Apps & Credentials"**
2. Create a new app under **"REST API apps"** (not Sandbox)
3. Get the **Production Client ID**
4. Update your `.env` file (or use environment variables in your hosting platform)
5. Test thoroughly in sandbox before going live!

## Important Notes

- ✅ **Sandbox is FREE** - Use it as much as you want for testing
- ✅ **No real money** - All transactions in sandbox are fake
- ✅ **Test accounts** - Use sandbox accounts to test the full flow
- ⚠️ **Never commit** `.env` file to git
- ⚠️ **Keep secrets safe** - Don't share your Client ID publicly

## Next Steps

After setting up sandbox:
1. Test the payment flow end-to-end
2. Test error scenarios (canceled payments, failed payments)
3. Verify data is saved correctly to Firebase
4. Once everything works, you can set up production credentials

## Helpful Links

- [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
- [PayPal Sandbox Login](https://www.sandbox.paypal.com)
- [PayPal API Documentation](https://developer.paypal.com/docs/api-basics/)
- [PayPal Buttons Integration Guide](https://developer.paypal.com/docs/checkout/standard/integrate/)

---

**Questions?** Check the PayPal Developer Community or their support documentation.

