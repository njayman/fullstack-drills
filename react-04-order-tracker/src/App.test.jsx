import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "./App.jsx";

let visibility = "visible";
Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
const setVisible = (v) => act(() => { visibility = v ? "visible" : "hidden"; document.dispatchEvent(new Event("visibilitychange")); });

const flush = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const text = (id) => screen.getByTestId(id).textContent.trim();
const state = (s) => screen.getByTestId(`step-${s}`).dataset.state;

// fetchStatus returns values from a script. A function entry is called, an Error rejects.
function script(...items) {
  const queue = [...items];
  return vi.fn(async () => {
    const item = queue.length > 1 ? queue.shift() : queue[0];
    const v = typeof item === "function" ? await item() : item;
    if (v instanceof Error) throw v;
    return v;
  });
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

beforeEach(() => { vi.useFakeTimers(); visibility = "visible"; });

it("polls on mount, then 5s after each response, never overlapping", async () => {
  const d = deferred();
  const fetchStatus = script(() => d.promise, { status: "accepted" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  expect(screen.getByTestId("loading")).toBeInTheDocument();
  expect(fetchStatus).toHaveBeenCalledWith("o1");
  await flush(20000);
  expect(fetchStatus).toHaveBeenCalledTimes(1);
  d.resolve({ status: "placed" });
  await flush();
  expect(screen.queryByTestId("loading")).toBeNull();
  await flush(4999);
  expect(fetchStatus).toHaveBeenCalledTimes(1);
  await flush(1);
  expect(fetchStatus).toHaveBeenCalledTimes(2);
  await flush(5000);
  expect(fetchStatus).toHaveBeenCalledTimes(3);
});

it("renders timeline states", async () => {
  render(<App orderId="o1" fetchStatus={script({ status: "preparing" })} />);
  await flush();
  expect(state("placed")).toBe("done");
  expect(state("accepted")).toBe("done");
  expect(state("preparing")).toBe("current");
  expect(state("picked_up")).toBe("todo");
  expect(state("delivered")).toBe("todo");
});

it("stops polling when delivered", async () => {
  const fetchStatus = script({ status: "picked_up", etaSeconds: 90 }, { status: "delivered" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush(5000);
  expect(state("delivered")).toBe("current");
  expect(screen.queryByTestId("eta")).toBeNull();
  await flush(60000);
  expect(fetchStatus).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("refresh")).toBeDisabled();
});

it("cancelled shows banner and stops", async () => {
  const fetchStatus = script({ status: "accepted" }, { status: "cancelled" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush(5000);
  expect(text("cancelled-banner")).toBe("Order cancelled");
  expect(screen.queryByTestId("step-placed")).toBeNull();
  await flush(60000);
  expect(fetchStatus).toHaveBeenCalledTimes(2);
});

it("backs off 1s, 2s, 4s, 8s, 8s and shows reconnecting after 3 failures", async () => {
  const err = new Error("down");
  const fetchStatus = script({ status: "placed" }, err, err, err, err, err, err, { status: "accepted" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush(); // ok
  await flush(5000); // fail 1
  expect(fetchStatus).toHaveBeenCalledTimes(2);
  await flush(999); expect(fetchStatus).toHaveBeenCalledTimes(2);
  await flush(1); expect(fetchStatus).toHaveBeenCalledTimes(3); // fail 2
  expect(screen.queryByTestId("connection-lost")).toBeNull();
  await flush(2000); expect(fetchStatus).toHaveBeenCalledTimes(4); // fail 3
  expect(text("connection-lost")).toBe("Reconnecting…");
  await flush(3999); expect(fetchStatus).toHaveBeenCalledTimes(4);
  await flush(1); expect(fetchStatus).toHaveBeenCalledTimes(5); // fail 4
  await flush(8000); expect(fetchStatus).toHaveBeenCalledTimes(6); // fail 5
  await flush(8000); expect(fetchStatus).toHaveBeenCalledTimes(7); // fail 6
  await flush(8000); expect(fetchStatus).toHaveBeenCalledTimes(8); // ok
  expect(screen.queryByTestId("connection-lost")).toBeNull();
  expect(state("accepted")).toBe("current");
  await flush(5000); expect(fetchStatus).toHaveBeenCalledTimes(9);
});

it("never goes backwards", async () => {
  const fetchStatus = script({ status: "preparing" }, { status: "accepted" }, { status: "picked_up" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush();
  await flush(5000);
  expect(state("preparing")).toBe("current");
  await flush(5000);
  expect(state("picked_up")).toBe("current");
});

it("ETA counts down, resyncs on each response, then says any minute", async () => {
  const fetchStatus = script({ status: "preparing", etaSeconds: 65 }, { status: "preparing", etaSeconds: 3 }, { status: "preparing" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush();
  expect(text("eta")).toBe("01:05");
  await flush(1000);
  expect(text("eta")).toBe("01:04");
  await flush(4000);
  expect(text("eta")).toBe("00:03");
  await flush(3000);
  expect(text("eta")).toBe("Any minute now");
  await flush(10000);
  expect(text("eta")).toBe("Any minute now");
});

it("pauses when hidden and polls immediately when visible", async () => {
  const fetchStatus = script({ status: "accepted" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush();
  setVisible(false);
  await flush(30000);
  expect(fetchStatus).toHaveBeenCalledTimes(1);
  setVisible(true);
  await flush();
  expect(fetchStatus).toHaveBeenCalledTimes(2);
  await flush(5000);
  expect(fetchStatus).toHaveBeenCalledTimes(3);
});

it("refresh polls now, reschedules, and is disabled in flight", async () => {
  const d = deferred();
  const fetchStatus = script({ status: "placed" }, () => d.promise, { status: "preparing" });
  render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush(3000);
  fireEvent.click(screen.getByTestId("refresh"));
  expect(fetchStatus).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("refresh")).toBeDisabled();
  await flush(10000);
  expect(fetchStatus).toHaveBeenCalledTimes(2);
  d.resolve({ status: "accepted" });
  await flush();
  expect(screen.getByTestId("refresh")).not.toBeDisabled();
  await flush(4999);
  expect(fetchStatus).toHaveBeenCalledTimes(2);
  await flush(1);
  expect(fetchStatus).toHaveBeenCalledTimes(3);
});

it("unmount stops everything", async () => {
  const fetchStatus = script({ status: "placed", etaSeconds: 100 });
  const { unmount } = render(<App orderId="o1" fetchStatus={fetchStatus} />);
  await flush();
  unmount();
  await flush(60000);
  expect(fetchStatus).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
