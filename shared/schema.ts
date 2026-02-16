export interface Shoot {
  id: string;
  modelName: string;
  salonName: string;
  date: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface EditedShoot {
  id: string;
  originalShootId: string;
  modelName: string;
  salonName: string;
  date: string;
  price: number;
  createdAt: string;
  editedAt: string;
}

export interface ShootFormData {
  modelName: string;
  salonName: string;
  date: string;
  price: number;
}

export interface MonthlyStats {
  month: string;
  year: number;
  monthNumber: number;
  shootCount: number;
  totalEarnings: number;
}
