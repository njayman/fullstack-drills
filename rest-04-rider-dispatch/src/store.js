// Given. Do not edit. A fake async database: every call waits a few ms and
// returns copies, so read-modify-write sequences can race like a real DB.
const clone = (v) => (v === undefined ? undefined : structuredClone(v));

export function createStore({ latency = () => Math.random() * 4 } = {}) {
  const riders = new Map();
  const orders = new Map();
  const tick = () => new Promise((r) => setTimeout(r, latency()));
  return {
    async getRider(id) { await tick(); return clone(riders.get(id)); },
    async putRider(rider) { await tick(); riders.set(rider.id, clone(rider)); },
    async listRiders() { await tick(); return [...riders.values()].map(clone); },
    async getOrder(id) { await tick(); return clone(orders.get(id)); },
    async putOrder(order) { await tick(); orders.set(order.id, clone(order)); },
  };
}
