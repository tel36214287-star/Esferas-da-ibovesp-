export interface StockData {
  ticker: string;
  price: number;
  changePercent: number;
  name: string;
}

export interface PhysicsCircle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number; // Radius
  mass: number;
  data: StockData;
  element: HTMLDivElement | null;
  pulse: number; // Animation state (0 to 1) for collisions
}

export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  targetId: string | null;
}