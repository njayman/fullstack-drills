# React 01: Basket pricing engine

Time box: 45 min. `bun install && bun run test` (watch: `bun run test:watch`).
Only edit `src/App.jsx` (add files if you like). Do not edit tests or `src/data.js`.

Build a basket for the menu in `src/data.js`. All money is integer pence. Display as `£12.34`.

## Menu
- Each item: `data-testid="menu-item-{id}"`, add button `add-{id}`.

## Basket lines
- Line `line-{id}`, quantity `qty-{id}` (just the number), buttons `inc-{id}`, `dec-{id}`, `remove-{id}`.
- Adding an item already in the basket increments it. Lines keep the order first added.
- Max 10 per item: `inc-{id}` disabled at 10, `add-{id}` does nothing at 10.
- `dec` at qty 1 removes the line.
- Empty basket: `empty-basket` with text `Your basket is empty`.

## Promo codes
- `promo-input`, `promo-apply`, `promo-message`, `promo-remove` (only shown when a code is applied).
- Codes are trimmed and case-insensitive. One code at a time; applying another replaces it.
- `SAVE10`: 10% off subtotal (`Math.round`). Needs subtotal >= £20.00.
  - Applying below the minimum: not applied, message `Minimum spend £20.00`.
  - Already applied and subtotal drops below: stays applied, discount becomes 0, message `Add £X.XX more to use SAVE10`. Back above: discount returns, message `SAVE10 applied`.
- `FRIES`: one free Fries per Burger, i.e. `min(burgerQty, friesQty) * friesPrice`. Message `FRIES applied`.
- `FREEDEL`: delivery fee 0. Message `FREEDEL applied`.
- Unknown: message `Invalid code`, previous code (if any) kept.

## Totals
- `subtotal`: sum of lines.
- `discount`: shown as `-£X.XX` (`-£0.00` when none).
- `delivery-fee`: £2.99. Free when (subtotal - discount) >= £25.00, or FREEDEL. 0 when empty.
- `service-fee`: 10% of (subtotal - discount), `Math.round`, clamped to [£0.50, £3.99]. 0 when empty.
- `total`: subtotal - discount + delivery + service.
- `checkout` disabled when empty or (subtotal - discount) < £10.00; then show `min-order-msg` `Minimum order £10.00` (not shown when empty).

## Undo
- `undo` reverts the last change (add, inc, dec, remove, promo apply, promo remove). Multi-level. Disabled when nothing to undo. Failed promo applies are not undo steps.

## Persistence
- Save `{ lines, promo }` to `localStorage["basket"]` as JSON on every change, where `lines` is `[{ id, qty }]` and `promo` is the code string or `null`. Restore on mount. Corrupt JSON: start empty, don't crash. Undo history is not persisted.
