import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "./App.jsx";

const r = (id, likes, liked = false) => ({ id, author: `Author ${id}`, text: `Review ${id}`, likes, liked });
const PAGE1 = { items: [r("r1", 10), r("r2", 5, true), r("r3", 7)], nextCursor: "c2" };
const PAGE2 = { items: [r("r3", 7), r("r4", 20), r("r5", 1)], nextCursor: null };

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

let pages, likes, api;
beforeEach(() => {
  vi.useFakeTimers();
  pages = []; likes = [];
  api = {
    fetchPage: vi.fn((cursor) => { const d = deferred(); pages.push({ cursor, ...d }); return d.promise; }),
    setLike: vi.fn((id, liked) => { const d = deferred(); likes.push({ id, liked, ...d }); return d.promise; }),
  };
});

const flush = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const text = (id) => screen.getByTestId(id).textContent.trim();
const pressed = (id) => screen.getByTestId(`like-${id}`).getAttribute("aria-pressed");
const order = () => screen.getAllByTestId(/^review-/).map((e) => e.dataset.testid.slice(7));
const like = (id) => fireEvent.click(screen.getByTestId(`like-${id}`));

async function loaded() {
  render(<App api={api} />);
  pages[0].resolve(PAGE1);
  await flush();
}

it("loads the first page", async () => {
  render(<App api={api} />);
  expect(screen.getByTestId("loading")).toBeInTheDocument();
  expect(api.fetchPage).toHaveBeenCalledWith(null);
  pages[0].resolve(PAGE1);
  await flush();
  expect(screen.queryByTestId("loading")).toBeNull();
  expect(order()).toEqual(["r1", "r2", "r3"]);
  expect(screen.getByTestId("review-r1")).toHaveTextContent("Author r1");
  expect(screen.getByTestId("review-r1")).toHaveTextContent("Review r1");
  expect(text("likes-r2")).toBe("5");
  expect(pressed("r2")).toBe("true");
  expect(pressed("r1")).toBe("false");
});

it("loads more once, dedupes, hides button at the end", async () => {
  await loaded();
  fireEvent.click(screen.getByTestId("load-more"));
  fireEvent.click(screen.getByTestId("load-more"));
  expect(api.fetchPage).toHaveBeenCalledTimes(2);
  expect(api.fetchPage).toHaveBeenLastCalledWith("c2");
  expect(screen.getByTestId("load-more")).toBeDisabled();
  pages[1].resolve(PAGE2);
  await flush();
  expect(order()).toEqual(["r1", "r2", "r3", "r4", "r5"]);
  expect(screen.queryByTestId("load-more")).toBeNull();
});

it("page error keeps items and retries same cursor", async () => {
  await loaded();
  fireEvent.click(screen.getByTestId("load-more"));
  pages[1].reject(new Error("500"));
  await flush();
  expect(text("feed-error")).toContain("Couldn't load reviews");
  expect(order()).toEqual(["r1", "r2", "r3"]);
  fireEvent.click(screen.getByTestId("retry"));
  expect(api.fetchPage).toHaveBeenLastCalledWith("c2");
  pages[2].resolve(PAGE2);
  await flush();
  expect(screen.queryByTestId("feed-error")).toBeNull();
  expect(order()).toHaveLength(5);
});

it("first page error can be retried", async () => {
  render(<App api={api} />);
  pages[0].reject(new Error("boom"));
  await flush();
  fireEvent.click(screen.getByTestId("retry"));
  expect(api.fetchPage).toHaveBeenLastCalledWith(null);
  pages[1].resolve(PAGE1);
  await flush();
  expect(order()).toEqual(["r1", "r2", "r3"]);
});

it("optimistic like then server value", async () => {
  await loaded();
  like("r1");
  expect(pressed("r1")).toBe("true");
  expect(text("likes-r1")).toBe("11");
  expect(api.setLike).toHaveBeenCalledWith("r1", true);
  likes[0].resolve({ likes: 14 });
  await flush();
  expect(text("likes-r1")).toBe("14");
  expect(pressed("r1")).toBe("true");
});

it("failure rolls back and shows toast for 3s", async () => {
  await loaded();
  like("r2"); // unlike
  expect(text("likes-r2")).toBe("4");
  likes[0].reject(new Error("nope"));
  await flush();
  expect(text("likes-r2")).toBe("5");
  expect(pressed("r2")).toBe("true");
  expect(text("toast")).toBe("Couldn't update like");
  await flush(2999);
  expect(screen.getByTestId("toast")).toBeInTheDocument();
  await flush(1);
  expect(screen.queryByTestId("toast")).toBeNull();
});

it("out-of-order responses: only the latest click wins", async () => {
  await loaded();
  like("r1"); // -> true, 11
  like("r1"); // -> false, 10
  expect(api.setLike.mock.calls).toEqual([["r1", true], ["r1", false]]);
  likes[1].resolve({ likes: 10 });
  await flush();
  likes[0].resolve({ likes: 11 });
  await flush();
  expect(pressed("r1")).toBe("false");
  expect(text("likes-r1")).toBe("10");
});

it("latest fails after an older success: roll back to the older confirmed state", async () => {
  await loaded();
  like("r1"); // true
  like("r1"); // false
  likes[0].resolve({ likes: 12 });
  await flush();
  expect(pressed("r1")).toBe("false"); // still showing latest optimistic
  expect(text("likes-r1")).toBe("10");
  likes[1].reject(new Error("x"));
  await flush();
  expect(pressed("r1")).toBe("true");
  expect(text("likes-r1")).toBe("12");
  expect(screen.getByTestId("toast")).toBeInTheDocument();
});

it("superseded failure is ignored", async () => {
  await loaded();
  like("r3"); like("r3"); like("r3"); // true, false, true
  likes[0].reject(new Error("x"));
  likes[1].reject(new Error("x"));
  await flush();
  expect(screen.queryByTestId("toast")).toBeNull();
  expect(pressed("r3")).toBe("true");
  expect(text("likes-r3")).toBe("8");
  likes[2].resolve({ likes: 9 });
  await flush();
  expect(text("likes-r3")).toBe("9");
});

it("older success does not overwrite newer confirmed state", async () => {
  await loaded();
  like("r1"); like("r1"); like("r1"); // true, false, true
  likes[1].resolve({ likes: 10 }); // confirms {false, 10}
  await flush();
  likes[0].resolve({ likes: 11 }); // older than confirmed, ignore
  await flush();
  likes[2].reject(new Error("x"));
  await flush();
  expect(pressed("r1")).toBe("false");
  expect(text("likes-r1")).toBe("10");
});

it("sorts by top using displayed likes, ties in server order", async () => {
  await loaded();
  fireEvent.change(screen.getByTestId("sort"), { target: { value: "top" } });
  expect(order()).toEqual(["r1", "r3", "r2"]);
  like("r3"); like("r2"); // r3 -> 8, r2 -> 4
  expect(order()).toEqual(["r1", "r3", "r2"]);
  fireEvent.click(screen.getByTestId("load-more"));
  pages[1].resolve({ items: [r("r6", 10)], nextCursor: null });
  await flush();
  expect(order()).toEqual(["r1", "r6", "r3", "r2"]);
  fireEvent.change(screen.getByTestId("sort"), { target: { value: "newest" } });
  expect(order()).toEqual(["r1", "r2", "r3", "r6"]);
});
