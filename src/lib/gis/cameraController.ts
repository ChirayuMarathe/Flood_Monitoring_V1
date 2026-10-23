import * as Cesium from "cesium";

// ---- Default camera views per city (zoomed in close to wards) ----
export const CITY_CAMERA_VIEWS: Record<
  string,
  { lng: number; lat: number; altitude: number; heading: number; pitch: number }
> = {
  mumbai: { lng: 72.8550, lat: 19.0185, altitude: 5500, heading: 0, pitch: -50 }, // Centers on Bandra/Kurla/Dharavi core wards
  pune: { lng: 73.8567, lat: 18.4842, altitude: 4800, heading: 0, pitch: -50 }, // Centers on Shaniwar Wada/Kasba/Shivajinagar wards
  navi_mumbai: { lng: 73.0280, lat: 19.0050, altitude: 4800, heading: 0, pitch: -48 }, // Centers on CBD Belapur/Nerul/Vashi 3D building cluster
};

// Close-up altitude for flying into an individual ward
const WARD_ALTITUDE = 1200;
const WARD_PITCH = -50;

export function flyToCity(viewer: Cesium.Viewer, cityKey: string, duration = 2.0) {
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

  // Offset camera slightly south so line-of-sight looks directly at the ward centroid
  const latOffset = (WARD_ALTITUDE / Math.tan(Cesium.Math.toRadians(Math.abs(WARD_PITCH)))) / 111132;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      ward.centroidLng,
      ward.centroidLat - latOffset,
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
