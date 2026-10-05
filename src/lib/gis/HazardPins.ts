import * as Cesium from 'cesium';
import type { WardRiskProfile } from '../risk/WardRiskProfile';

/**
 * HazardPins now handles subtle ward beacons without creating heavy 3D cylinder ellipses,
 * eliminating the frame-by-frame animation lag and replacing circular pillars with
 * real ward boundary polygon highlights.
 */
export class HazardPins {
  private viewer: Cesium.Viewer;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  public destroy() {
    // No-op (no heavy frame loops)
  }

  /**
   * Neutralized: Removes any ellipse graphics so the actual ward polygon boundary is displayed instead.
   */
  public setupAlert(entity: Cesium.Entity, profile: WardRiskProfile | null, thresholds?: any) {
    if (entity.billboard) {
      entity.billboard = undefined;
    }
    if (entity.ellipse) {
      entity.ellipse = undefined;
    }
  }

  /**
   * Neutralized: No ellipse update.
   */
  public updateAlert(entity: Cesium.Entity, profile: WardRiskProfile | null) {
    if (entity.ellipse) {
      entity.ellipse = undefined;
    }
  }
}
