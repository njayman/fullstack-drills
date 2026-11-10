# React 03: Checkout wizard

Time box: 50 min. `bun install && bun run test`. Only edit `src/App.jsx`.

A 3-step checkout. `App` props (give defaults so `main.jsx` works):
- `total`: basket total in pence.
- `now`: a `Date`, used for expiry checks.
- `generateKey()`: returns a new idempotency key.
- `submitOrder(payload, { idempotencyKey })`: returns a Promise.

`step-title` shows `Address`, `Payment` or `Review`. `next` / `back` buttons move between steps. Going back and forward keeps every value.

## Step 1: Address
Inputs `name`, `line1`, `postcode`. Validate on `next`. Errors (`error-{field}`) only appear after a `next` attempt.
- `name`: `Name is required` (trimmed).
- `line1`: `Address is required` (trimmed).
- `postcode`: `Enter a valid UK postcode`. Accept any case, with or without the space (e.g. `sw1a1aa`, `M1 1AE`, `CR2 6XH`, `DN55 1PT`). Normalise to uppercase with one space before the last 3 chars.

## Step 2: Payment
Inputs `card-number`, `expiry`, `cvc`.
- `card-number` formats as the user types: keep digits only, Amex (starts `34` or `37`) max 15 digits shown as `4-6-5`, others max 16 shown as `4-4-4-4`.
- `error-card`: `Invalid card number` unless the length is right (15 Amex, 16 others) and it passes Luhn.
- `error-expiry`: `MM/YY`. Bad format or month not 01 to 12: `Invalid expiry`. Last day of that month before `now`: `Card expired`.
- `error-cvc`: `CVC must be 3 digits` (`4` for Amex).

## Step 3: Review
- `review-address`: `Name, line1, POSTCODE` (normalised postcode).
- `review-card`: `•••• 1234` (last 4).
- `total`: `£23.50`.
- `place-order`: calls `submitOrder({ name, line1, postcode, cardLast4, expectedTotal }, { idempotencyKey })` with trimmed values and the normalised postcode.
  - While pending: disabled, text `Placing order…`. Never two calls in flight.

## Idempotency
- Retrying the exact same payload reuses the same key. A different payload gets a new key from `generateKey()`.

## Responses
- Resolves `{ orderId }`: show only `success` with `Order <orderId> placed`.
- Rejects `{ status: 422, fields: { <field>: message } }`: field names are the error keys above (`name`, `line1`, `postcode`, `card`, `expiry`, `cvc`). Go to the earliest step with an errored field and show the server messages in `error-{field}`. Editing that field clears its server error. A server error blocks `next` until the field is edited.
- Rejects `{ status: 409, total }`: stay on review. Show `price-changed` `Price changed to £X.XX`, and `total` shows the new total. `place-order` is hidden. `confirm-price` submits with the new `expectedTotal`.
- Anything else: `submit-error` `Could not place order. Try again.` and `place-order` works again.
