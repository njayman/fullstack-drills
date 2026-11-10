import express from "express";
import { createStore } from "./store.js";

// See README.md for the spec. Run `bun run test:watch` while you work.
export function createApp({ store = createStore() } = {}) {
  const app = express();
  app.use(express.json());
  // TODO
  return app;
}
