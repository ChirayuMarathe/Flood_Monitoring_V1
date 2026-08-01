import { Viewer, GeoJsonDataSource, Color, ColorMaterialProperty, ConstantProperty, HeightReference } from 'cesium';
import { GeoJSONLoader } from './GeoJSONLoader';
import { normalizeWardProperties } from './WardData';

export class WardLayer {
  private viewer: Viewer;
  private dataSource: GeoJsonDataSource | null = null;
  private currentCity: string = '';

  constructor(viewer: Viewer) {
    this.viewer = viewer;
  }

  /**
   * Loads the ward boundaries for a specific city.
   * Strips all UI/Styling constraints as required by architecture spec.
   */
  async loadCityWards(city: 'mumbai' | 'pune') {
    if (this.currentCity === city && this.dataSource) {
      return; // Already loaded
    }

    // Remove existing layer if any
    this.removeLayer();
    this.currentCity = city;

    const geojsonUrl = city === 'mumbai' 
      ? '/data/gis/mumbai_wards.geojson' 
      : '/data/gis/pune_wards.geojson';

    try {
      this.dataSource = await GeoJSONLoader.load(geojsonUrl, `${city}_wards`);
      
      // Process entities to attach normalized WardData and apply basic, non-intrusive rendering
      const entities = this.dataSource.entities.values;
      for (const entity of entities) {
        // Normalize properties (Ward Name, Ward Code, City)
        const rawProps = entity.properties ? entity.properties.getValue(this.viewer.clock.currentTime) : {};
        const normalized = normalizeWardProperties(city, rawProps);
        
        // Save normalized properties back to the entity if needed for future logic
        if (entity.properties) {
           entity.properties.addProperty('normalizedWardName', normalized.wardName);
           entity.properties.addProperty('normalizedWardCode', normalized.wardCode);
           entity.properties.addProperty('normalizedCity', normalized.city);
        }

        // Enforce constraint: NO custom UI styling, extrusions, popups, or hover effects.
        // We only clamp to ground and provide a basic visible outline/fill.
        if (entity.polygon) {
          // GeoJsonDataSource handles clampToGround natively when loaded.
          // overriding height/heightReference here can break the native clamping, so we omit it.
          
          // Make boundaries clearly visible: bright cyan outline with faint blue fill
          entity.polygon.material = new ColorMaterialProperty(new Color(0.2, 0.6, 1.0, 0.15));
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(new Color(0.2, 0.8, 1.0, 0.8));
          entity.polygon.outlineWidth = new ConstantProperty(3);
        }
      }

      this.viewer.dataSources.add(this.dataSource);

    } catch (error) {
      console.error(`Failed to initialize WardLayer for ${city}:`, error);
    }
  }

  /**
   * Removes the current ward layer from the viewer.
   */
  removeLayer() {
    if (this.dataSource) {
      this.viewer.dataSources.remove(this.dataSource, true);
      this.dataSource = null;
      this.currentCity = '';
    }
  }
}
