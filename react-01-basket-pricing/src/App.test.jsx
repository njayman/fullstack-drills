import { render, screen, fireEvent, within } from "@testing-library/react";
import App from "./App.jsx";

const click = (id) => fireEvent.click(screen.getByTestId(id));
const text = (id) => screen.getByTestId(id).textContent.trim();
const add = (id, n = 1) => { for (let i = 0; i < n; i++) click(`add-${id}`); };
const applyPromo = (code) => {
  fireEvent.change(screen.getByTestId("promo-input"), { target: { value: code } });
  click("promo-apply");
};

describe("menu and lines", () => {
  it("shows the menu and an empty basket", () => {
    render(<App />);
    ["burger", "fries", "cola", "salad", "wrap"].forEach((id) =>
      expect(screen.getByTestId(`menu-item-${id}`)).toBeInTheDocument());
    expect(text("empty-basket")).toBe("Your basket is empty");
    expect(screen.getByTestId("checkout")).toBeDisabled();
    expect(screen.queryByTestId("min-order-msg")).toBeNull();
    expect(text("total")).toBe("£0.00");
  });

  it("adds, increments, keeps insertion order", () => {
    render(<App />);
    add("cola"); add("burger"); add("cola");
    const lines = screen.getAllByTestId(/^line-/).map((el) => el.dataset.testid);
    expect(lines).toEqual(["line-cola", "line-burger"]);
    expect(text("qty-cola")).toBe("2");
    expect(screen.queryByTestId("empty-basket")).toBeNull();
  });

  it("caps quantity at 10", () => {
    render(<App />);
    add("cola", 12);
    expect(text("qty-cola")).toBe("10");
    expect(screen.getByTestId("inc-cola")).toBeDisabled();
    click("dec-cola");
    expect(screen.getByTestId("inc-cola")).not.toBeDisabled();
  });

  it("dec at 1 removes, remove deletes line", () => {
    render(<App />);
    add("cola"); add("wrap", 3);
    click("dec-cola");
    expect(screen.queryByTestId("line-cola")).toBeNull();
    click("remove-wrap");
    expect(screen.getByTestId("empty-basket")).toBeInTheDocument();
  });
});

describe("pricing", () => {
  it("small order: min service fee, delivery, min order block", () => {
    render(<App />);
    add("cola"); // 199
    expect(text("subtotal")).toBe("£1.99");
    expect(text("discount")).toBe("-£0.00");
    expect(text("delivery-fee")).toBe("£2.99");
    expect(text("service-fee")).toBe("£0.50");
    expect(text("total")).toBe("£5.48");
    expect(screen.getByTestId("checkout")).toBeDisabled();
    expect(text("min-order-msg")).toBe("Minimum order £10.00");
  });

  it("mid order: rounded service fee", () => {
    render(<App />);
    add("burger"); add("fries"); add("cola"); // 1397
    expect(text("service-fee")).toBe("£1.40");
    expect(text("total")).toBe("£18.36");
    expect(screen.getByTestId("checkout")).not.toBeDisabled();
    expect(screen.queryByTestId("min-order-msg")).toBeNull();
  });

  it("free delivery at £25 and service fee cap", () => {
    render(<App />);
    add("burger", 5); // 4495
    expect(text("delivery-fee")).toBe("£0.00");
    expect(text("service-fee")).toBe("£3.99");
    expect(text("total")).toBe("£48.94");
  });
});

describe("promos", () => {
  it("SAVE10 rejected below minimum", () => {
    render(<App />);
    add("burger");
    applyPromo("save10");
    expect(text("promo-message")).toBe("Minimum spend £20.00");
    expect(screen.queryByTestId("promo-remove")).toBeNull();
    expect(text("discount")).toBe("-£0.00");
  });

  it("SAVE10 applies, then suspends and resumes as basket changes", () => {
    render(<App />);
    add("burger", 2); add("fries", 2); add("cola"); // 2595
    applyPromo("  Save10 ");
    expect(text("promo-message")).toBe("SAVE10 applied");
    expect(text("discount")).toBe("-£2.60");
    // after discount 2335 < 2500 so delivery is charged
    expect(text("delivery-fee")).toBe("£2.99");
    expect(text("service-fee")).toBe("£2.34");
    expect(text("total")).toBe("£28.68");
    click("dec-burger"); // 1696
    expect(text("discount")).toBe("-£0.00");
    expect(text("promo-message")).toBe("Add £3.04 more to use SAVE10");
    expect(screen.getByTestId("promo-remove")).toBeInTheDocument();
    click("inc-burger");
    expect(text("discount")).toBe("-£2.60");
    expect(text("promo-message")).toBe("SAVE10 applied");
  });

  it("FRIES gives one free fries per burger", () => {
    render(<App />);
    add("burger", 2); add("fries", 3);
    applyPromo("FRIES");
    expect(text("discount")).toBe("-£5.98");
    click("dec-burger");
    expect(text("discount")).toBe("-£2.99");
  });

  it("FREEDEL removes delivery; invalid code keeps previous", () => {
    render(<App />);
    add("salad", 2);
    applyPromo("FREEDEL");
    expect(text("delivery-fee")).toBe("£0.00");
    applyPromo("NOPE");
    expect(text("promo-message")).toBe("Invalid code");
    expect(text("delivery-fee")).toBe("£0.00");
  });

  it("new code replaces old, remove clears", () => {
    render(<App />);
    add("burger", 2); add("fries", 2); add("cola");
    applyPromo("SAVE10");
    applyPromo("FREEDEL");
    expect(text("discount")).toBe("-£0.00");
    expect(text("delivery-fee")).toBe("£0.00");
    click("promo-remove");
    expect(text("delivery-fee")).toBe("£0.00"); // 2595 >= 2500 anyway
    expect(screen.queryByTestId("promo-remove")).toBeNull();
  });

  it("empty basket has zero fees even with a promo", () => {
    render(<App />);
    add("burger", 3);
    applyPromo("SAVE10");
    click("remove-burger");
    expect(text("delivery-fee")).toBe("£0.00");
    expect(text("service-fee")).toBe("£0.00");
    expect(text("total")).toBe("£0.00");
  });
});

describe("undo", () => {
  it("multi-level undo across lines and promos", () => {
    render(<App />);
    expect(screen.getByTestId("undo")).toBeDisabled();
    add("burger", 3);
    applyPromo("SAVE10");
    applyPromo("BAD"); // not an undo step
    click("remove-burger");
    click("undo");
    expect(text("qty-burger")).toBe("3");
    expect(text("discount")).toBe("-£2.70");
    click("undo");
    expect(text("discount")).toBe("-£0.00");
    expect(screen.queryByTestId("promo-remove")).toBeNull();
    click("undo"); click("undo");
    expect(text("qty-burger")).toBe("1");
    click("undo");
    expect(screen.getByTestId("empty-basket")).toBeInTheDocument();
    expect(screen.getByTestId("undo")).toBeDisabled();
  });
});

describe("persistence", () => {
  it("saves and restores basket and promo", () => {
    const { unmount } = render(<App />);
    add("wrap", 4);
    applyPromo("save10");
    expect(JSON.parse(localStorage.getItem("basket"))).toEqual({
      lines: [{ id: "wrap", qty: 4 }],
      promo: "SAVE10",
    });
    unmount();
    render(<App />);
    expect(text("qty-wrap")).toBe("4");
    expect(text("discount")).toBe("-£2.80");
    expect(screen.getByTestId("undo")).toBeDisabled();
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("basket", "{oops");
    render(<App />);
    expect(screen.getByTestId("empty-basket")).toBeInTheDocument();
  });
});
