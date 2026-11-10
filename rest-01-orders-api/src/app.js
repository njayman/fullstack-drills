import express from "express";

const orders = []

// See README.md for the spec. Run `bun run test:watch` while you work.
export function createApp(opts = {}) {
  const app = express();
  // TODO
  app.post("/orders", (req, res) => {
        const body = req.body;

        const totalAmount = body.orders.reduce((prev, cur) => prev + (cur.qty * cur.unitPrice), 0)

        const order = {
            id: `ord_${orders.length + 1}`
            customerId: body.customerId,
            items: body.items,
            status: "placed",
            total: totalAmount,
            version: 1,
            createdAt: new Date().toISOString()
        }

        res.status(201).json({
            ...order
        })
    })
  return app;
}
