export interface Vec2 {
  x: number;
  y: number;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface ViewportApi {
  getCamera(): Camera;
  setCamera(camera: Camera): void;
  panBy(delta: Vec2): void;
  zoomAt(screen: Vec2, factor: number): void;
  screenToWorld(screen: Vec2): Vec2;
  worldToScreen(world: Vec2): Vec2;
  zoomIn(): void;
  zoomOut(): void;
  fitContent(objects: Array<{x: number, y: number, width: number, height: number}>, viewportWidth: number, viewportHeight: number): void;
}

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 5;
export const ZOOM_STEP = 1.05;
export const GRID_STEP = 50;

export const INITIAL_CAMERA: Camera = { x: 0, y: 0, scale: 1 };
