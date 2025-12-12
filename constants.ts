export const PHYSICS = {
  FRICTION: 1.0, // No friction as requested
  VELOCITY_LIMIT: 4, // Reduced from 8 to 4 for slower, smoother movement
  COLLISION_SLACK: 0.001,
  IMPULSE_MULTIPLIER: 40, // Tuned for React delta time
  RADIUS_BASE: 30,
  RADIUS_SCALE_FACTOR: 0.1, // Scale bubble size by price slightly
};