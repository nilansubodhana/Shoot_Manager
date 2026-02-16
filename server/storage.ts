import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import type { Shoot, EditedShoot, ShootFormData } from "../shared/schema";

const DATA_FILE = path.resolve(process.cwd(), "data.json");

interface DataStore {
  shoots: Shoot[];
  editedShoots: EditedShoot[];
}

function readData(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading data file:", e);
  }
  return { shoots: [], editedShoots: [] };
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getShoots(): Shoot[] {
  return readData().shoots;
}

export function getShootById(id: string): Shoot | undefined {
  return readData().shoots.find((s) => s.id === id);
}

export function createShoot(form: ShootFormData): Shoot {
  const data = readData();
  const now = new Date().toISOString();
  const shoot: Shoot = {
    id: randomUUID(),
    ...form,
    createdAt: now,
    updatedAt: now,
  };
  data.shoots.push(shoot);
  writeData(data);
  return shoot;
}

export function updateShoot(id: string, form: ShootFormData): Shoot | null {
  const data = readData();
  const idx = data.shoots.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  data.shoots[idx] = {
    ...data.shoots[idx],
    ...form,
    updatedAt: new Date().toISOString(),
  };

  writeData(data);
  return data.shoots[idx];
}

export function deleteShoot(id: string): boolean {
  const data = readData();
  const idx = data.shoots.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  data.shoots.splice(idx, 1);
  writeData(data);
  return true;
}

export function moveShootToEdited(id: string): EditedShoot | null {
  const data = readData();
  const idx = data.shoots.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const shoot = data.shoots[idx];
  data.shoots.splice(idx, 1);

  const editedShoot: EditedShoot = {
    id: randomUUID(),
    originalShootId: shoot.id,
    modelName: shoot.modelName,
    salonName: shoot.salonName,
    date: shoot.date,
    price: shoot.price,
    createdAt: shoot.createdAt,
    editedAt: new Date().toISOString(),
  };
  data.editedShoots.push(editedShoot);
  writeData(data);
  return editedShoot;
}

export function getEditedShoots(): EditedShoot[] {
  return readData().editedShoots;
}

export function getEditedShootById(id: string): EditedShoot | undefined {
  return readData().editedShoots.find((s) => s.id === id);
}

export function updateEditedShoot(id: string, form: ShootFormData): EditedShoot | null {
  const data = readData();
  const idx = data.editedShoots.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  data.editedShoots[idx] = {
    ...data.editedShoots[idx],
    ...form,
    editedAt: new Date().toISOString(),
  };

  writeData(data);
  return data.editedShoots[idx];
}

export function moveEditedShootBack(id: string): Shoot | null {
  const data = readData();
  const idx = data.editedShoots.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const edited = data.editedShoots[idx];
  data.editedShoots.splice(idx, 1);

  const shoot: Shoot = {
    id: randomUUID(),
    modelName: edited.modelName,
    salonName: edited.salonName,
    date: edited.date,
    price: edited.price,
    createdAt: edited.createdAt,
    updatedAt: new Date().toISOString(),
  };
  data.shoots.push(shoot);
  writeData(data);
  return shoot;
}

export function deleteEditedShoot(id: string): boolean {
  const data = readData();
  const idx = data.editedShoots.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  data.editedShoots.splice(idx, 1);
  writeData(data);
  return true;
}
