import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "./App.jsx";

const DATA = [
  { id: 1, name: "Pizza Palace", cuisine: "Italian" },
  { id: 2, name: "Pizzeria Uno", cuisine: "Italian" },
  { id: 3, name: "Slice of PIZza", cuisine: "Italian" },
  { id: 4, name: "Pizza 4", cuisine: "Italian" },
  { id: 5, name: "Pizza 5", cuisine: "Italian" },
  { id: 6, name: "Pizza 6", cuisine: "Italian" },
  { id: 7, name: "Pizza 7", cuisine: "Italian" },
  { id: 8, name: "Pizza 8", cuisine: "Italian" },
  { id: 9, name: "Pizza 9", cuisine: "Italian" },
  { id: 10, name: "Pizza 10", cuisine: "Italian" },
];

let calls;
beforeEach(() => {
  vi.useFakeTimers();
  calls = [];
  globalThis.fetch = vi.fn((url, opts = {}) => new Promise((resolve, reject) => {
    const q = new URL(url, "http://x").searchParams.get("q");
    const call = {
      url, q, signal: opts.signal,
      ok: (results) => resolve({ ok: true, status: 200, json: async () => ({ results }) }),
      fail: (status = 500) => resolve({ ok: false, status, json: async () => ({}) }),
    };
    opts.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    calls.push(call);
  }));
});

const flush = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const input = () => screen.getByTestId("search-input");
const type = (v) => fireEvent.change(input(), { target: { value: v } });
const key = (k) => fireEvent.keyDown(input(), { key: k });
const respond = async (call, results) => { call.ok(results); await flush(); };

it("debounces 300ms and requests only the last query", async () => {
  render(<App />);
  type("p"); await flush(100);
  type("pi"); await flush(100);
  type("piz"); await flush(299);
  expect(fetch).not.toHaveBeenCalled();
  await flush(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(calls[0].url).toBe("/api/restaurants?q=piz");
  expect(calls[0].signal).toBeInstanceOf(AbortSignal);
});

it("encodes and trims the query", async () => {
  render(<App />);
  type("  fish & chips "); await flush(300);
  expect(calls[0].url).toBe("/api/restaurants?q=fish%20%26%20chips");
});

it("ignores short queries and hides results", async () => {
  render(<App />);
  type("pi"); await flush(300);
  await respond(calls[0], DATA.slice(0, 2));
  expect(screen.getByTestId("results")).toBeInTheDocument();
  type(" p "); await flush(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("results")).toBeNull();
  expect(input()).toHaveAttribute("aria-expanded", "false");
});

it("shows loading, then at most 8 options with aria wiring", async () => {
  render(<App />);
  type("pizza"); await flush(300);
  expect(screen.getByTestId("loading")).toBeInTheDocument();
  await respond(calls[0], DATA);
  expect(screen.queryByTestId("loading")).toBeNull();
  const list = screen.getByTestId("results");
  expect(list).toHaveAttribute("role", "listbox");
  expect(list).toHaveAttribute("id", "results");
  expect(screen.getAllByRole("option")).toHaveLength(8);
  expect(screen.getByTestId("result-1")).toHaveTextContent("Pizza Palace");
  expect(screen.getByTestId("result-1")).toHaveTextContent("Italian");
  expect(input()).toHaveAttribute("role", "combobox");
  expect(input()).toHaveAttribute("aria-controls", "results");
  expect(input()).toHaveAttribute("aria-expanded", "true");
  expect(input()).not.toHaveAttribute("aria-activedescendant");
});

it("highlights first match keeping original casing", async () => {
  render(<App />);
  type("piz"); await flush(300);
  await respond(calls[0], DATA.slice(0, 3));
  expect(screen.getByTestId("result-1").querySelector("mark").textContent).toBe("Piz");
  expect(screen.getByTestId("result-3").querySelector("mark").textContent).toBe("PIZ");
  expect(screen.getByTestId("result-3").querySelectorAll("mark")).toHaveLength(1);
});

it("aborts stale requests and never shows their results", async () => {
  render(<App />);
  type("pi"); await flush(300);
  type("piz"); await flush(300);
  expect(calls[0].signal.aborted).toBe(true);
  await respond(calls[1], [DATA[1]]);
  await respond(calls[0], [DATA[0]]);
  expect(screen.queryByTestId("result-1")).toBeNull();
  expect(screen.getByTestId("result-2")).toBeInTheDocument();
  expect(screen.queryByTestId("error")).toBeNull();
});

it("caches by normalised query", async () => {
  render(<App />);
  type("piz"); await flush(300);
  await respond(calls[0], [DATA[0]]);
  type("pizz"); await flush(300);
  await respond(calls[1], [DATA[1]]);
  type("PIZ "); await flush(300);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("result-1")).toBeInTheDocument();
  expect(screen.queryByTestId("result-2")).toBeNull();
});

it("shows error and retries immediately", async () => {
  render(<App />);
  type("sushi"); await flush(300);
  calls[0].fail(503); await flush();
  expect(screen.getByTestId("error")).toHaveTextContent("Something went wrong");
  fireEvent.click(screen.getByTestId("retry"));
  await flush();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(calls[1].q).toBe("sushi");
  await respond(calls[1], [{ id: 42, name: "Sushi Go", cuisine: "Japanese" }]);
  expect(screen.queryByTestId("error")).toBeNull();
  expect(screen.getByTestId("result-42")).toBeInTheDocument();
});

it("shows no-results message", async () => {
  render(<App />);
  type("zzz"); await flush(300);
  await respond(calls[0], []);
  expect(screen.getByTestId("no-results")).toHaveTextContent('No restaurants match "zzz"');
});

it("keyboard navigation wraps and Enter selects without searching", async () => {
  render(<App />);
  type("piz"); await flush(300);
  await respond(calls[0], DATA.slice(0, 3));
  key("ArrowUp");
  expect(input()).toHaveAttribute("aria-activedescendant", "option-3");
  key("ArrowDown");
  expect(input()).toHaveAttribute("aria-activedescendant", "option-1");
  expect(screen.getByTestId("result-1")).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("result-2")).toHaveAttribute("aria-selected", "false");
  key("ArrowDown");
  key("Enter");
  expect(screen.getByTestId("selected")).toHaveTextContent("Selected: Pizzeria Uno");
  expect(input()).toHaveValue("Pizzeria Uno");
  expect(screen.queryByTestId("results")).toBeNull();
  await flush(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("Escape closes without clearing; typing reopens", async () => {
  render(<App />);
  type("piz"); await flush(300);
  await respond(calls[0], DATA.slice(0, 2));
  key("ArrowDown");
  key("Escape");
  expect(screen.queryByTestId("results")).toBeNull();
  expect(input()).toHaveValue("piz");
  expect(input()).not.toHaveAttribute("aria-activedescendant");
  type("pizz"); await flush(300);
  await respond(calls[1], DATA.slice(0, 2));
  expect(screen.getByTestId("results")).toBeInTheDocument();
});

it("click selects an option", async () => {
  render(<App />);
  type("piz"); await flush(300);
  await respond(calls[0], DATA.slice(0, 2));
  fireEvent.click(screen.getByTestId("result-1"));
  expect(screen.getByTestId("selected")).toHaveTextContent("Selected: Pizza Palace");
  expect(input()).toHaveValue("Pizza Palace");
});
