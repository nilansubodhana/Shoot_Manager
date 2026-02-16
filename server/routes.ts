import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import {
  getShoots,
  getShootById,
  createShoot,
  updateShoot,
  deleteShoot,
  getEditedShoots,
  moveShootToEdited,
  updateEditedShoot,
  moveEditedShootBack,
  deleteEditedShoot,
} from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/shoots", (_req: Request, res: Response) => {
    res.json(getShoots());
  });

  app.get("/api/shoots/:id", (req: Request, res: Response) => {
    const shoot = getShootById(req.params.id);
    if (!shoot) return res.status(404).json({ message: "Shoot not found" });
    res.json(shoot);
  });

  app.post("/api/shoots", (req: Request, res: Response) => {
    const { modelName, salonName, date, price } = req.body;
    if (!modelName || !salonName || !date || price == null) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const shoot = createShoot({ modelName, salonName, date, price: Number(price) });
    res.status(201).json(shoot);
  });

  app.put("/api/shoots/:id", (req: Request, res: Response) => {
    const { modelName, salonName, date, price } = req.body;
    if (!modelName || !salonName || !date || price == null) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const shoot = updateShoot(req.params.id, { modelName, salonName, date, price: Number(price) });
    if (!shoot) return res.status(404).json({ message: "Shoot not found" });
    res.json(shoot);
  });

  app.delete("/api/shoots/:id", (req: Request, res: Response) => {
    if (!deleteShoot(req.params.id)) return res.status(404).json({ message: "Shoot not found" });
    res.json({ message: "Shoot deleted" });
  });

  app.post("/api/shoots/:id/move-to-edited", (req: Request, res: Response) => {
    const edited = moveShootToEdited(req.params.id);
    if (!edited) return res.status(404).json({ message: "Shoot not found" });
    res.status(201).json(edited);
  });

  app.get("/api/edited-shoots", (_req: Request, res: Response) => {
    res.json(getEditedShoots());
  });

  app.put("/api/edited-shoots/:id", (req: Request, res: Response) => {
    const { modelName, salonName, date, price } = req.body;
    if (!modelName || !salonName || !date || price == null) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const edited = updateEditedShoot(req.params.id, { modelName, salonName, date, price: Number(price) });
    if (!edited) return res.status(404).json({ message: "Edited shoot not found" });
    res.json(edited);
  });

  app.post("/api/edited-shoots/:id/move-back", (req: Request, res: Response) => {
    const shoot = moveEditedShootBack(req.params.id);
    if (!shoot) return res.status(404).json({ message: "Edited shoot not found" });
    res.status(201).json(shoot);
  });

  app.delete("/api/edited-shoots/:id", (req: Request, res: Response) => {
    if (!deleteEditedShoot(req.params.id)) return res.status(404).json({ message: "Edited shoot not found" });
    res.json({ message: "Edited shoot deleted" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
