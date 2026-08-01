import { GeoJsonDataSource } from 'cesium';

/**
 * Loads GeoJSON datasets for Cesium.
 * Uses Cesium's native GeoJsonDataSource loader which automatically handles
 * parsing WGS84 coordinates into Cartesian3 for the globe.
 */
export class GeoJSONLoader {
  /**
   * Fetches and loads a GeoJSON URL into a Cesium GeoJsonDataSource.
   * @param url The URL of the GeoJSON file
   * @param name Optional name for the data source
   * @returns Promise resolving to the loaded GeoJsonDataSource
   */
  static async load(url: string, name: string): Promise<GeoJsonDataSource> {
    const dataSource = new GeoJsonDataSource(name);
    try {
      await dataSource.load(url, {
        clampToGround: true, // Crucial for overlaying polygons on 3D terrain
      });
      return dataSource;
    } catch (error) {
      console.error(`Failed to load GeoJSON from ${url}`, error);
      throw error;
    }
  }
}
