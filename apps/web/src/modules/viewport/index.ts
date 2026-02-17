import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import type { Camera, Vec2, ViewportApi } from './contracts.ts';
import { INITIAL_CAMERA } from './contracts.ts';
import * as cam from './domain/camera.ts';

export const VIEWPORT_MODULE_ID = 'viewport';

type ViewportEvents = {
  cameraChanged: Camera;
};

export const viewportEvents = new EventBus<ViewportEvents>();

export const viewportModule: AppModule<ViewportApi> = {
  id: VIEWPORT_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<ViewportApi> {
    let camera: Camera = { ...INITIAL_CAMERA };

    const api: ViewportApi = {
      getCamera() {
        return { ...camera };
      },

      setCamera(next: Camera) {
        camera = { ...next, scale: cam.clampScale(next.scale) };
        viewportEvents.emit('cameraChanged', camera);
      },

      panBy(delta: Vec2) {
        camera = cam.panBy(camera, delta);
        viewportEvents.emit('cameraChanged', camera);
      },

      zoomAt(screen: Vec2, factor: number) {
        camera = cam.zoomAt(camera, screen, factor);
        viewportEvents.emit('cameraChanged', camera);
      },

      screenToWorld(screen: Vec2) {
        return cam.screenToWorld(camera, screen);
      },

      worldToScreen(world: Vec2) {
        return cam.worldToScreen(camera, world);
      },
    };

    return api;
  },

  async dispose() {
    // nothing to clean up
  },
};
