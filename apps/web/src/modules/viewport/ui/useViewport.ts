import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getModuleApi } from '../../../app/module-registry.ts';
import { viewportEvents, VIEWPORT_MODULE_ID } from '../index.ts';
import type { Camera, ViewportApi } from '../contracts.ts';
import { INITIAL_CAMERA, ZOOM_STEP } from '../contracts.ts';
import type Konva from 'konva';

function getApi(): ViewportApi {
  return getModuleApi<ViewportApi>(VIEWPORT_MODULE_ID);
}

export function useViewport() {
  const cameraRef = useRef<Camera>(getApi().getCamera());

  const subscribe = useCallback((onStoreChange: () => void) => {
    return viewportEvents.on('cameraChanged', (cam) => {
      cameraRef.current = cam;
      onStoreChange();
    });
  }, []);

  const getSnapshot = useCallback(() => cameraRef.current, []);

  const camera = useSyncExternalStore(subscribe, getSnapshot);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage || e.target !== stage) return;
    getApi().setCamera({
      x: stage.x(),
      y: stage.y(),
      scale: getApi().getCamera().scale,
    });
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

    getApi().zoomAt(pointer, factor);

    // Sync stage immediately so Konva renders the new transform this frame
    const cam = getApi().getCamera();
    stage.position({ x: cam.x, y: cam.y });
    stage.scale({ x: cam.scale, y: cam.scale });
  }, []);

  const resetView = useCallback(() => {
    getApi().setCamera(INITIAL_CAMERA);
  }, []);

  const stageProps = {
    x: camera.x,
    y: camera.y,
    scaleX: camera.scale,
    scaleY: camera.scale,
    draggable: true,
    onDragMove: handleDragMove,
    onWheel: handleWheel,
  };

  return { camera, stageProps, resetView };
}
