# Cryptocurrency Bill Payment Prototype

An educational React prototype that explores a possible flow for paying a credit-card bill with cryptocurrency. It demonstrates asset selection, an indicative crypto estimate, a countdown, and a simulated confirmation screen.

## Try it locally

Requirements: Node.js and npm.

```sh
npm install
npm start
```

The app opens at `http://localhost:3000`. If that port is already in use, Create React App will offer another available port.

## What the prototype does

- Displays sample credit-card balances and lets you choose a preset or custom amount.
- Loads active crypto assets and network variants from BitPay’s public [Currencies API](https://developer.bitpay.com/reference/retrieve-the-supported-currencies).
- Fetches a public BitPay reference rate for the selected asset when an estimate can be provided.
- Shows the estimated crypto amount for the bill subtotal and a 15-minute demo countdown.
- Opens a clearly labeled simulated confirmation when you select **Submit payment (simulate)**.

The currency and rate requests are read-only and use BitPay’s public API. No BitPay account or API key is configured in this prototype.

## Important limitations

This is a front-end demonstration, not a payment service. The balances and dates are sample data. The displayed rate is informational and may differ from an invoice quote. The countdown does not lock a rate, and the estimate excludes network and provider fees. Some listed assets may not have a rate available from BitPay’s public rates API.

Selecting the submit button only simulates the interface. It does not create an invoice, transfer cryptocurrency, contact a card issuer, or make a payment. A real payment flow would need a secure backend to create a BitPay invoice and obtain the actual payable amount, applicable fees, expiration time, and payment status. It would also need wallet integration and transaction monitoring.

Do not enter real financial, account, or wallet information into this prototype.

## Reuse

This repository does not currently include a license. Please contact the author before reusing or redistributing the code.
