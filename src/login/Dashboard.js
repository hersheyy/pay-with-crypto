import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

import './Dashboard.css';

const QUOTE_WINDOW_SECONDS = 15 * 60;

function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatCrypto(amount, precision = 8) {
  return `${amount.toFixed(Math.min(precision, 8)).replace(/\.?0+$/, '')}`;
}

function Dashboard() {
  const [selectedOption, setSelectedOption] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [cryptoOptions, setCryptoOptions] = useState([]);
  const [cryptoStatus, setCryptoStatus] = useState('idle');
  const [cryptoError, setCryptoError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [quote, setQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState('idle');
  const [quoteError, setQuoteError] = useState('');
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const parsedPaymentAmount = Number(paymentAmount);
  const validPaymentAmount = Number.isFinite(parsedPaymentAmount) && parsedPaymentAmount > 0;

  useEffect(() => {
    const controller = new AbortController();

    async function loadCryptoOptions() {
      setCryptoStatus('loading');
      setCryptoError('');

      try {
        const response = await fetch('https://bitpay.com/currencies', {
          headers: { 'X-Accept-Version': '2.0.0' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`BitPay returned ${response.status}`);

        const result = await response.json();
        const currencies = (result.data || [])
          .filter((currency) => currency.chain && currency.disabled !== true)
          .map((currency) => ({
            value: currency.code,
            rateBase: currency.parent || currency.displayCode || currency.code,
            precision: currency.precision || 8,
            label: `${currency.name} (${currency.displayCode || currency.code} on ${currency.chain})`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        setCryptoOptions(currencies);
        setCryptoStatus('loaded');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setCryptoError('Could not load BitPay-supported assets. Please try again.');
          setCryptoStatus('error');
        }
      }
    }

    loadCryptoOptions();
    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => {
    if (!selectedCrypto || !validPaymentAmount || selectedValue !== 'crypto') {
      setQuote(null);
      setQuoteStatus('idle');
      setQuoteError('');
      return undefined;
    }

    const controller = new AbortController();
    setQuote(null);
    setQuoteStatus('loading');
    setQuoteError('');

    async function loadRate() {
      try {
        const response = await fetch(
          `https://bitpay.com/rates/${encodeURIComponent(selectedCrypto.rateBase)}/USD`,
          {
            headers: { 'X-Accept-Version': '2.0.0' },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error('A live rate is not available for this asset.');

        const result = await response.json();
        const rate = Number(result.data && result.data.rate);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('BitPay did not return a usable USD rate.');

        const cryptoSubtotal = parsedPaymentAmount / rate;
        const scale = 10 ** Math.min(selectedCrypto.precision, 8);
        const roundedCryptoAmount = Math.ceil(cryptoSubtotal * scale) / scale;
        const expiresAt = Date.now() + QUOTE_WINDOW_SECONDS * 1000;

        setQuote({ rate, roundedCryptoAmount, expiresAt });
        setRemainingSeconds(QUOTE_WINDOW_SECONDS);
        setQuoteStatus('loaded');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setQuoteError('BitPay could not provide a live rate for this asset. Choose another asset or try again.');
          setQuoteStatus('error');
        }
      }
    }

    loadRate();
    return () => controller.abort();
  }, [selectedCrypto, parsedPaymentAmount, selectedValue, validPaymentAmount, quoteAttempt]);

  useEffect(() => {
    if (!quote) return undefined;
    const timer = window.setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((quote.expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [quote]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  const handlePaymentTypeChange = (event) => {
    setSelectedValue(event.target.value);
    setSelectedCrypto(null);
    setQuote(null);
    setPaymentComplete(false);
  };

  const handleAmountChange = (event) => {
    setSelectedOption(event.target.value);
    setPaymentAmount(event.target.value === 'otherBalance' ? '' : event.target.value);
    setPaymentComplete(false);
  };

  const handleCustomAmountChange = (event) => {
    setPaymentAmount(event.target.value);
    setPaymentComplete(false);
  };

  const handleCryptoChange = (option) => {
    setSelectedCrypto(option);
    setPaymentComplete(false);
  };

  const refreshQuote = () => setQuoteAttempt((attempt) => attempt + 1);

  if (paymentComplete && quote && selectedCrypto) {
    return (
      <main className="checkout-shell">
        <div className="prototype-notice">Prototype only: no cryptocurrency was transferred and no bill was paid.</div>
        <section className="confirmation-card" aria-live="polite">
          <div className="confirmation-icon" aria-hidden="true">✓</div>
          <p className="eyebrow">DEMO CONFIRMATION</p>
          <h1>Payment flow completed</h1>
          <p className="confirmation-copy">
            This is a simulated confirmation for the prototype. A real payment requires a BitPay invoice and a completed wallet transaction.
          </p>
          <dl className="summary-list">
            <div><dt>Bill amount</dt><dd>{formatMoney(parsedPaymentAmount)}</dd></div>
            <div><dt>Selected asset</dt><dd>{selectedCrypto.label}</dd></div>
            <div><dt>Estimated crypto subtotal</dt><dd>{formatCrypto(quote.roundedCryptoAmount, selectedCrypto.precision)} {selectedCrypto.value}</dd></div>
            <div><dt>Network / provider fees</dt><dd>Not included in this demo</dd></div>
            <div><dt>Transaction reference</dt><dd>Demo only · no transaction ID</dd></div>
          </dl>
          <button className="secondary-button" type="button" onClick={() => setPaymentComplete(false)}>
            Return to payment details
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-shell">
      <div className="prototype-notice">Prototype only: balances are examples; no payment is sent.</div>

      <section className="checkout-card">
        <div className="checkout-heading">
          <p className="eyebrow">PAYMENT SETUP</p>
          <h1>Pay your card bill</h1>
          <p>Choose an amount and payment method to preview the checkout.</p>
        </div>

        <fieldset className="amount-section">
          <legend>1. Select a bill amount</legend>
          <label className="amount-option">
            <input type="radio" value="1745.45" name="paymentAmount" checked={selectedOption === '1745.45'} onChange={handleAmountChange} />
            <span><strong>Current balance</strong><small>As of 04/30/2025</small></span>
            <b>$1,745.45</b>
          </label>
          <label className="amount-option">
            <input type="radio" value="435.11" name="paymentAmount" checked={selectedOption === '435.11'} onChange={handleAmountChange} />
            <span><strong>Statement balance</strong><small>As of 04/30/2025</small></span>
            <b>$435.11</b>
          </label>
          <label className="amount-option">
            <input type="radio" value="56.88" name="paymentAmount" checked={selectedOption === '56.88'} onChange={handleAmountChange} />
            <span><strong>Minimum payment due</strong><small>Due 04/30/2025</small></span>
            <b>$56.88</b>
          </label>
          <label className="amount-option other-amount-option">
            <input type="radio" value="otherBalance" name="paymentAmount" checked={selectedOption === 'otherBalance'} onChange={handleAmountChange} />
            <span><strong>Other amount</strong><small>Enter a custom bill amount</small></span>
            {selectedOption === 'otherBalance' ? (
              <input className="custom-amount" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={handleCustomAmountChange} placeholder="$0.00" aria-label="Custom payment amount in dollars" />
            ) : <b>—</b>}
          </label>
        </fieldset>

        <div className="payment-method-section">
          <label htmlFor="payment-type">2. Payment method</label>
          <select id="payment-type" value={selectedValue} onChange={handlePaymentTypeChange}>
            <option value="">Select a payment method</option>
            <option value="bankAccount">Bank account (demo)</option>
            <option value="crypto">Cryptocurrency</option>
          </select>
        </div>

        {selectedValue === 'crypto' && (
          <section className="crypto-section">
            <label htmlFor="crypto-select">3. Select cryptocurrency</label>
            <Select
              inputId="crypto-select"
              value={selectedCrypto}
              onChange={handleCryptoChange}
              options={cryptoOptions}
              isDisabled={cryptoStatus !== 'loaded'}
              isLoading={cryptoStatus === 'loading'}
              placeholder={cryptoStatus === 'loading' ? 'Loading BitPay assets…' : 'Choose an asset and network'}
              noOptionsMessage={() => 'No active assets available'}
            />
            {cryptoStatus === 'error' && <p className="inline-error" role="alert">{cryptoError} <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</button></p>}
          </section>
        )}

        {selectedValue === 'crypto' && selectedCrypto && (
          <section className="quote-card" aria-live="polite">
            <div className="quote-heading">
              <div><p className="eyebrow">ESTIMATED PAYMENT</p><h2>Review your quote</h2></div>
              {quote && <div className={`quote-timer ${remainingSeconds === 0 ? 'expired' : ''}`}><span>{remainingSeconds === 0 ? 'Quote window ended' : 'Quote window'}</span><strong>{formattedTime}</strong></div>}
            </div>

            {!validPaymentAmount && <p className="inline-error">Select a bill amount before requesting a quote.</p>}
            {quoteStatus === 'loading' && <p className="quote-message">Getting a current BitPay rate…</p>}
            {quoteStatus === 'error' && <p className="inline-error" role="alert">{quoteError} <button type="button" onClick={refreshQuote}>Try again</button></p>}
            {quote && (
              <>
                <dl className="summary-list quote-summary">
                  <div><dt>Bill amount</dt><dd>{formatMoney(parsedPaymentAmount)}</dd></div>
                  <div><dt>BitPay reference rate</dt><dd>1 {selectedCrypto.value} = {formatMoney(quote.rate)}</dd></div>
                  <div><dt>Estimated crypto for bill</dt><dd>{formatCrypto(quote.roundedCryptoAmount, selectedCrypto.precision)} {selectedCrypto.value}</dd></div>
                  <div className="fee-row"><dt>Network / provider fees</dt><dd>Not available in this preview</dd></div>
                </dl>
                <p className="quote-caveat">
                  This crypto amount covers the bill subtotal only; fees are excluded. A real BitPay invoice supplies the payment amount, applicable network cost, and an actual expiring rate lock. This countdown is only a demo timer.
                </p>
                {remainingSeconds === 0 ? (
                  <button className="primary-button" type="button" onClick={refreshQuote}>Refresh quote</button>
                ) : (
                  <button className="primary-button" type="button" onClick={() => setPaymentComplete(true)}>
                    Submit payment (simulate)
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
