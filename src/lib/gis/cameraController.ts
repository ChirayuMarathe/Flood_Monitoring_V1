import * as Cesium from "cesium";

// ---- Default camera views per city (tune these once, reuse everywhere) ----
export const CITY_CAMERA_VIEWS: Record<
  string,
  { lng: number; lat: number; altitude: number; heading: number; pitch: number }
> = {
  mumbai: { lng: 72.8777, lat: 19.0760, altitude: 12000, heading: 0, pitch: -35 },
  pune: { lng: 73.8567, lat: 18.5204, altitude: 14000, heading: 0, pitch: -40 }, // Higher altitude, steeper pitch for Pune hills
  navi_mumbai: { lng: 73.0297, lat: 19.0330, altitude: 11000, heading: 0, pitch: -30 }, // Flatter layout
};

// Closer default for flying into an individual ward
const WARD_ALTITUDE = 900;
const WARD_PITCH = -40;

export function flyToCity(viewer: Cesium.Viewer, cityKey: string, duration = 2.5) {
  const view = CITY_CAMERA_VIEWS[cityKey];
  if (!view) {
    console.warn(`[camera] No camera preset for city: ${cityKey}`);
    return;
  }

  // Check if viewer is destroyed to avoid scene errors
  if (viewer.isDestroyed()) return;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(view.lng, view.lat, view.altitude),
    orientation: {
      heading: Cesium.Math.toRadians(view.heading),
      pitch: Cesium.Math.toRadians(view.pitch),
      roll: 0,
    },
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });
}

export function flyToWard(
  viewer: Cesium.Viewer,
  ward: { centroidLng: number; centroidLat: number },
  duration = 1.8
) {
  if (viewer.isDestroyed()) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      ward.centroidLng,
      ward.centroidLat,
      WARD_ALTITUDE
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(WARD_PITCH),
      roll: 0,
    },
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });
}

// One-time setup, call once when the viewer is created
export function initCameraControls(viewer: Cesium.Viewer) {
  viewer.scene.screenSpaceCameraController.enableTilt = true;
  viewer.scene.screenSpaceCameraController.enableRotate = true;

  // Prevent camera from going below terrain/underground
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000;
}
