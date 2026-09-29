import * as Cesium from 'cesium';
import type { WardRiskProfile } from '../risk/WardRiskProfile';

const SEVERITY_COLOR: Record<number, string> = {
  0: '#22C55E', // Green
  1: '#EAB308', // Yellow
  2: '#F97316', // Orange
  3: '#EF4444', // Red
};



/**
 * Creates or updates a hazard pin entity for a ward.
 * Handles the logic for dynamic icons, colors, scaling based on severity,
 * and pulsing animations for time-urgent wards.
 */
export class HazardPins {
  private viewer: Cesium.Viewer;
  private pulseClockHandler: (() => void) | null = null;
  private pulseTime = 0;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    
    // Setup pulse animation loop
    this.pulseClockHandler = () => {
      this.pulseTime += 0.05;
      if (this.pulseTime > Math.PI * 2) {
        this.pulseTime -= Math.PI * 2;
      }
    };
    this.viewer.scene.preUpdate.addEventListener(this.pulseClockHandler);
  }

  public destroy() {
    if (this.pulseClockHandler) {
      this.viewer.scene.preUpdate.removeEventListener(this.pulseClockHandler);
    }
  }

  /**
   * Calculates the height of the 3D pillar based on severity and pulse.
   */
  private getHeight(profile: WardRiskProfile): Cesium.CallbackProperty | number {
    // Height from 500m to 2500m depending on severity
    const baseHeight = 500 + profile.overallSeverity * 666; 

    // Add pulse animation if urgently trending toward risk (<6 hours)
    if (profile.estimatedTimeToThresholdHours !== null && profile.estimatedTimeToThresholdHours < 6) {
      return new Cesium.CallbackProperty(() => {
        // Pulsate height
        const pulse = 1.0 + (Math.sin(this.pulseTime) * 0.5 + 0.5) * 0.2; // 1.0 to 1.2
        return baseHeight * pulse;
      }, false);
    }

    return baseHeight;
  }

  private getMaterial(profile: WardRiskProfile): any {
    const color = Cesium.Color.fromCssColorString(SEVERITY_COLOR[profile.overallSeverity]).withAlpha(0.6);
    return new Cesium.ColorMaterialProperty(color);
  }

  /**
   * Sets up a hazard 3D pillar on an existing entity.
   */
  public setupAlert(entity: Cesium.Entity, profile: WardRiskProfile | null, thresholds: any) {
    if (!profile) return;
    
    if (entity.billboard) {
      entity.billboard = undefined;
    }

    if (!entity.ellipse) {
      entity.ellipse = new Cesium.EllipseGraphics();
    }

    const radius = 600; // 600m radius pillar

    entity.ellipse.semiMajorAxis = new Cesium.ConstantProperty(radius) as any;
    entity.ellipse.semiMinorAxis = new Cesium.ConstantProperty(radius) as any;
    
    // Extrude upwards from ground
    entity.ellipse.height = new Cesium.ConstantProperty(0) as any;
    entity.ellipse.extrudedHeight = this.getHeight(profile) as any;
    
    entity.ellipse.material = this.getMaterial(profile);
    
    entity.ellipse.outline = new Cesium.ConstantProperty(true) as any;
    entity.ellipse.outlineColor = new Cesium.ConstantProperty(Cesium.Color.WHITE.withAlpha(0.8)) as any;
    
    if (thresholds) {
       entity.ellipse.distanceDisplayCondition = new Cesium.ConstantProperty(
         new Cesium.DistanceDisplayCondition(0, thresholds.showCode)
       ) as any;
    }
  }

  /**
   * Updates an existing hazard pillar in place.
   */
  public updateAlert(entity: Cesium.Entity, profile: WardRiskProfile | null) {
    if (!entity.ellipse || !profile) return;

    entity.ellipse.extrudedHeight = this.getHeight(profile) as any;
    entity.ellipse.material = this.getMaterial(profile);
  }
}
