// See README.md for the spec. Run `bun run test:watch` while you work.
// Markup and data-testids are given. Add state, handlers and conditions.
import { MENU } from "./data.js";

export default function App() {
  return (
    <div className="layout">
      <section>
        <h2>Menu</h2>
        <ul>
          {MENU.map((m) => (
            <li key={m.id} data-testid={`menu-item-${m.id}`}>
              {m.name} <span>£0.00</span>
              <button data-testid={`add-${m.id}`}>Add</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Basket</h2>
        {/* Show when the basket is empty */}
        <p data-testid="empty-basket">Your basket is empty</p>

        {/* One <li> per basket line, in the order first added */}
        <ul>
          {[].map((line) => (
            <li key={line.id} data-testid={`line-${line.id}`}>
              <span>Item name</span>
              <button data-testid={`dec-${line.id}`}>-</button>
              <span data-testid={`qty-${line.id}`}>0</span>
              <button data-testid={`inc-${line.id}`}>+</button>
              <button data-testid={`remove-${line.id}`}>Remove</button>
            </li>
          ))}
        </ul>

        <div className="promo">
          <input data-testid="promo-input" placeholder="Promo code" />
          <button data-testid="promo-apply">Apply</button>
          {/* Show only when a code is applied */}
          <button data-testid="promo-remove">Remove code</button>
          <p data-testid="promo-message"></p>
        </div>

        <dl>
          <dt>Subtotal</dt><dd data-testid="subtotal">£0.00</dd>
          <dt>Discount</dt><dd data-testid="discount">-£0.00</dd>
          <dt>Delivery</dt><dd data-testid="delivery-fee">£0.00</dd>
          <dt>Service fee</dt><dd data-testid="service-fee">£0.00</dd>
          <dt>Total</dt><dd data-testid="total">£0.00</dd>
        </dl>

        {/* Show when basket is not empty and below the minimum order */}
        <p data-testid="min-order-msg">Minimum order £10.00</p>

        <button data-testid="checkout">Checkout</button>
        <button data-testid="undo">Undo</button>
      </section>
    </div>
  );
}
