// See README.md for the spec. Run `bun run test:watch` while you work.
// Markup and data-testids are given. Add state, validation, handlers and conditions.

export default function App({
  total = 2350,
  now = new Date(),
  generateKey = () => crypto.randomUUID(),
  submitOrder = async () => ({ orderId: "DEMO-1" }),
}) {
  return (
    <div className="checkout">
      {/* After a successful order, render ONLY this */}
      <p data-testid="success">Order ORD-1 placed</p>

      <h2 data-testid="step-title">Address</h2>

      {/* ---- Step 1: Address ---- */}
      <label>
        Name
        <input data-testid="name" />
        <span data-testid="error-name" className="error">Name is required</span>
      </label>
      <label>
        Address line 1
        <input data-testid="line1" />
        <span data-testid="error-line1" className="error">Address is required</span>
      </label>
      <label>
        Postcode
        <input data-testid="postcode" />
        <span data-testid="error-postcode" className="error">Enter a valid UK postcode</span>
      </label>

      {/* ---- Step 2: Payment ---- */}
      <label>
        Card number
        <input data-testid="card-number" inputMode="numeric" />
        <span data-testid="error-card" className="error">Invalid card number</span>
      </label>
      <label>
        Expiry (MM/YY)
        <input data-testid="expiry" placeholder="MM/YY" />
        <span data-testid="error-expiry" className="error">Invalid expiry</span>
      </label>
      <label>
        CVC
        <input data-testid="cvc" inputMode="numeric" />
        <span data-testid="error-cvc" className="error">CVC must be 3 digits</span>
      </label>

      {/* ---- Step 3: Review ---- */}
      <p data-testid="review-address">Name, line1, POSTCODE</p>
      <p data-testid="review-card">•••• 0000</p>
      <p data-testid="total">£0.00</p>

      {/* Show after a 409 instead of place-order */}
      <p data-testid="price-changed">Price changed to £0.00</p>
      <button data-testid="confirm-price">Confirm new price</button>

      <button data-testid="place-order">Place order</button>
      <p data-testid="submit-error">Could not place order. Try again.</p>

      {/* ---- Navigation ---- */}
      <button data-testid="back">Back</button>
      <button data-testid="next">Next</button>
    </div>
  );
}
