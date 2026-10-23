
import * as Cesium from 'cesium';

// Realistic architectural building palettes based on building type and height
const BUILDING_PALETTES: Record<string, string[]> = {
  residential: ['#C4B5A0', '#B8A994', '#D4C5B0', '#BFB09B', '#A89888'],
  apartments:  ['#C9B99A', '#D6C8A8', '#B5A68E', '#CABBA0', '#AFA08A'],
  commercial:  ['#A8B0B8', '#98A0A8', '#B8C0C8', '#8890A0', '#C0C8D0'],
  office:      ['#8898A8', '#7888A0', '#6880A0', '#B0BCC8', '#A0ACB8'],
  industrial:  ['#8A8A80', '#7A7A70', '#9A9A90', '#6A6A60', '#A0A098'],
  retail:      ['#C8B898', '#B8A888', '#D0C0A0', '#C0B090', '#A89878'],
  hotel:       ['#B0A090', '#C0B0A0', '#A09888', '#D0C0B0', '#908070'],
  hospital:    ['#E0D8D0', '#D0C8C0', '#F0E8E0', '#C8C0B8', '#E8E0D8'],
  school:      ['#C8B8A0', '#B8A890', '#D8C8B0', '#A89880', '#D0C0A8'],
  college:     ['#C8B8A0', '#B8A890', '#D8C8B0', '#A89880', '#D0C0A8'],
  dormitory:   ['#C4B5A0', '#B8A994', '#D4C5B0', '#BFB09B', '#A89888'],
};
const DEFAULT_PALETTE = ['#B8B0A0', '#ACA494', '#C4BCA8', '#9E9686', '#B4AC9C'];
const GLASS_TINT = Cesium.Color.fromCssColorString('#7090B0');

function getBuildingColor(heightM: number, buildingType: string): Cesium.Color {
  const type = (buildingType || 'yes').toLowerCase();
  const palette = BUILDING_PALETTES[type] || DEFAULT_PALETTE;
  const idx = Math.abs(Math.round(heightM * 7.3)) % palette.length;
  let baseColor = Cesium.Color.fromCssColorString(palette[idx]).withAlpha(0.92);

  // Tall buildings (>25m) get a sleek glass curtain-wall sheen
  if (heightM > 25) {
    const t = Math.min(0.35, (heightM - 25) / 60.0);
    baseColor = Cesium.Color.lerp(baseColor, GLASS_TINT, t, new Cesium.Color());
    baseColor.alpha = 0.95;
  }
  return baseColor;
}

export class BuildingLayer {
  private viewer: Cesium.Viewer;
  private cityDataSources: Map<string, Cesium.GeoJsonDataSource> = new Map();
  private loadingPromises: Map<string, Promise<Cesium.GeoJsonDataSource | null>> = new Map();
  private activeCity: string = 'mumbai';
  private visible: boolean = true;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  public destroy() {
    for (const ds of this.cityDataSources.values()) {
      if (!this.viewer.isDestroyed()) {
        this.viewer.dataSources.remove(ds, true);
      }
    }
    this.cityDataSources.clear();
  }

  public setVisible(visible: boolean) {
    this.visible = visible;
    for (const [city, ds] of this.cityDataSources.entries()) {
      ds.show = visible && (city === this.activeCity);
    }
  }

  public async loadCityBuildings(city: string): Promise<Cesium.GeoJsonDataSource | null> {
    this.activeCity = city;

    // Immediately isolate visibility to the active city
    for (const [c, ds] of this.cityDataSources.entries()) {
      ds.show = (c === city) && this.visible;
    }

    if (this.cityDataSources.has(city)) {
      const ds = this.cityDataSources.get(city)!;
      ds.show = this.visible;
      return ds;
    }

    if (this.loadingPromises.has(city)) {
      return this.loadingPromises.get(city)!;
    }

    const promise = this._doLoad(city);
    this.loadingPromises.set(city, promise);
    return promise;
  }

  private async _doLoad(city: string): Promise<Cesium.GeoJsonDataSource | null> {
    const url = `/data/${city}_buildings_with_height.geojson`;
    try {
      console.log(`[BuildingLayer] Loading real digital twin building footprints for ${city} from ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[BuildingLayer] Could not fetch ${url}: ${res.status}`);
        return null;
      }
      const geojson = await res.json();
      if (this.viewer.isDestroyed()) return null;

      const dataSource = new Cesium.GeoJsonDataSource(`buildings_${city}`);
      await dataSource.load(geojson, {
        clampToGround: false,
      });

      if (this.viewer.isDestroyed()) return null;

      // Style every building entity with its extruded height and architectural material
      const entities = dataSource.entities.values;
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (!entity.polygon) continue;

        const rawProps = entity.properties ? entity.properties.getValue(this.viewer.clock.currentTime) : {};
        const heightM = Math.max(4.0, rawProps?.height_m ? Number(rawProps.height_m) : 10.0);
        const buildingType = String(rawProps?.building || 'yes').toLowerCase();

        // Extrude from ground surface up to heightM
        entity.polygon.heightReference = new Cesium.ConstantProperty(Cesium.HeightReference.CLAMP_TO_GROUND);
        entity.polygon.extrudedHeightReference = new Cesium.ConstantProperty(Cesium.HeightReference.RELATIVE_TO_GROUND);
        entity.polygon.height = new Cesium.ConstantProperty(0);
        entity.polygon.extrudedHeight = new Cesium.ConstantProperty(heightM);
        entity.polygon.closeTop = new Cesium.ConstantProperty(true);
        entity.polygon.closeBottom = new Cesium.ConstantProperty(false);
        entity.polygon.material = new Cesium.ColorMaterialProperty(getBuildingColor(heightM, buildingType));
        entity.polygon.outline = new Cesium.ConstantProperty(true);
        entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.fromCssColorString('rgba(255, 255, 255, 0.35)'));
        entity.polygon.shadows = new Cesium.ConstantProperty(Cesium.ShadowMode.DISABLED);
      }

      dataSource.show = this.visible && (this.activeCity === city);
      this.viewer.dataSources.add(dataSource);
      this.cityDataSources.set(city, dataSource);
      console.log(`[BuildingLayer] ${city} 3D digital twin buildings ready: ${entities.length} structures rendered`);
      return dataSource;
    } catch (err) {
      console.error(`[BuildingLayer] Failed to load buildings for ${city}:`, err);
      return null;
    }
  }
}
