import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "./App.jsx";

const NOW = new Date(2026, 10, 9); // 9 Nov 2026
const VISA = "4242424242424242";
const AMEX = "378282246310005";

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

let pending, submitOrder, generateKey;
function setup(total = 2350) {
  pending = [];
  let n = 0;
  generateKey = vi.fn(() => `key-${++n}`);
  submitOrder = vi.fn(() => { const d = deferred(); pending.push(d); return d.promise; });
  render(<App total={total} now={NOW} generateKey={generateKey} submitOrder={submitOrder} />);
}

const set = (id, value) => fireEvent.change(screen.getByTestId(id), { target: { value } });
const click = (id) => fireEvent.click(screen.getByTestId(id));
const text = (id) => screen.getByTestId(id).textContent.trim();
const settle = () => act(async () => {});

function fillAddress(pc = "sw1a1aa") {
  set("name", " Ada Lovelace "); set("line1", "1 High St"); set("postcode", pc);
  click("next");
}
function fillPayment(card = VISA, exp = "11/26", cvc = "123") {
  set("card-number", card); set("expiry", exp); set("cvc", cvc);
  click("next");
}

describe("address step", () => {
  it("validates only after next", () => {
    setup();
    expect(text("step-title")).toBe("Address");
    expect(screen.queryByTestId("error-name")).toBeNull();
    set("name", "   ");
    click("next");
    expect(text("error-name")).toBe("Name is required");
    expect(text("error-line1")).toBe("Address is required");
    expect(text("error-postcode")).toBe("Enter a valid UK postcode");
    expect(text("step-title")).toBe("Address");
  });

  it.each(["SW1A 1AA", "sw1a1aa", "M1 1AE", "cr26xh", "DN55 1PT"])("accepts %s", (pc) => {
    setup();
    fillAddress(pc);
    expect(text("step-title")).toBe("Payment");
  });

  it.each(["", "12345", "SW1A 1A", "QQQ 1AA", "SW1A 1AAA"])("rejects %j", (pc) => {
    setup();
    fillAddress(pc);
    expect(text("error-postcode")).toBe("Enter a valid UK postcode");
  });
});

describe("payment step", () => {
  it("formats visa and amex card numbers", () => {
    setup(); fillAddress();
    set("card-number", "4242-4242 4242 42424 999");
    expect(screen.getByTestId("card-number")).toHaveValue("4242 4242 4242 4242");
    set("card-number", AMEX + "99");
    expect(screen.getByTestId("card-number")).toHaveValue("3782 822463 10005");
  });

  it("rejects Luhn failures and wrong lengths", () => {
    setup(); fillAddress();
    fillPayment("4242424242424241");
    expect(text("error-card")).toBe("Invalid card number");
    fillPayment("424242424242");
    expect(text("error-card")).toBe("Invalid card number");
    expect(text("step-title")).toBe("Payment");
  });

  it("checks expiry against now", () => {
    setup(); fillAddress();
    fillPayment(VISA, "10/26");
    expect(text("error-expiry")).toBe("Card expired");
    fillPayment(VISA, "13/27");
    expect(text("error-expiry")).toBe("Invalid expiry");
    fillPayment(VISA, "1/27");
    expect(text("error-expiry")).toBe("Invalid expiry");
    fillPayment(VISA, "11/26");
    expect(text("step-title")).toBe("Review");
  });

  it("amex needs 4 digit cvc", () => {
    setup(); fillAddress();
    fillPayment(AMEX, "01/27", "123");
    expect(text("error-cvc")).toBe("CVC must be 4 digits");
    fillPayment(AMEX, "01/27", "1234");
    expect(text("step-title")).toBe("Review");
  });

  it("back keeps values in both directions", () => {
    setup(); fillAddress();
    set("card-number", VISA);
    click("back");
    expect(screen.getByTestId("name")).toHaveValue(" Ada Lovelace ");
    click("next");
    expect(screen.getByTestId("card-number")).toHaveValue("4242 4242 4242 4242");
  });
});

describe("review and submit", () => {
  const toReview = (total) => { setup(total); fillAddress(); fillPayment(); };

  it("shows a summary", () => {
    toReview();
    expect(text("review-address")).toBe("Ada Lovelace, 1 High St, SW1A 1AA");
    expect(text("review-card")).toBe("•••• 4242");
    expect(text("total")).toBe("£23.50");
  });

  it("submits once while pending and shows success", async () => {
    toReview();
    click("place-order");
    click("place-order");
    expect(submitOrder).toHaveBeenCalledTimes(1);
    expect(submitOrder).toHaveBeenCalledWith(
      { name: "Ada Lovelace", line1: "1 High St", postcode: "SW1A 1AA", cardLast4: "4242", expectedTotal: 2350 },
      { idempotencyKey: "key-1" },
    );
    expect(screen.getByTestId("place-order")).toBeDisabled();
    expect(text("place-order")).toBe("Placing order…");
    pending[0].resolve({ orderId: "ORD-1" });
    await settle();
    expect(text("success")).toBe("Order ORD-1 placed");
    expect(screen.queryByTestId("step-title")).toBeNull();
  });

  it("network failure: retry reuses the same key", async () => {
    toReview();
    click("place-order");
    pending[0].reject(new Error("offline"));
    await settle();
    expect(text("submit-error")).toBe("Could not place order. Try again.");
    click("place-order");
    expect(submitOrder).toHaveBeenCalledTimes(2);
    expect(submitOrder.mock.calls[1][1]).toEqual({ idempotencyKey: "key-1" });
  });

  it("409: shows new price, confirm resubmits with new total and new key", async () => {
    toReview();
    click("place-order");
    pending[0].reject({ status: 409, total: 2599 });
    await settle();
    expect(text("price-changed")).toBe("Price changed to £25.99");
    expect(text("total")).toBe("£25.99");
    expect(screen.queryByTestId("place-order")).toBeNull();
    click("confirm-price");
    expect(submitOrder).toHaveBeenCalledTimes(2);
    expect(submitOrder.mock.calls[1][0].expectedTotal).toBe(2599);
    expect(submitOrder.mock.calls[1][1].idempotencyKey).toBe("key-2");
    pending[1].resolve({ orderId: "ORD-9" });
    await settle();
    expect(text("success")).toBe("Order ORD-9 placed");
  });

  it("422: jumps to earliest errored step with server messages", async () => {
    toReview();
    click("place-order");
    pending[0].reject({ status: 422, fields: { cvc: "CVC rejected", postcode: "We don't deliver to SW1A 1AA" } });
    await settle();
    expect(text("step-title")).toBe("Address");
    expect(text("error-postcode")).toBe("We don't deliver to SW1A 1AA");
    expect(screen.queryByTestId("error-name")).toBeNull();
    set("postcode", "M1 1AE");
    expect(screen.queryByTestId("error-postcode")).toBeNull();
    click("next");
    expect(text("step-title")).toBe("Payment");
    expect(text("error-cvc")).toBe("CVC rejected");
    click("next");
    expect(text("step-title")).toBe("Payment");
    set("cvc", "999");
    click("next");
    click("place-order");
    expect(submitOrder.mock.calls[1][0].postcode).toBe("M1 1AE");
    expect(submitOrder.mock.calls[1][1].idempotencyKey).toBe("key-2");
  });
});
