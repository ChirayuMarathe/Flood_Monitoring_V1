import { queryFeatures } from '@esri/arcgis-rest-feature-service';
import { ApiKeyManager } from '@esri/arcgis-rest-request';

export class ArcGISFeatureLoader {
  /**
   * Queries an ArcGIS Feature Service and returns a GeoJSON FeatureCollection
   * that can be natively consumed by Cesium's GeoJsonDataSource.
   * 
   * @param url The REST URL of the ArcGIS Feature Layer (e.g. .../FeatureServer/0)
   * @param where SQL where clause (defaults to '1=1' for all features)
   * @param apiKey Optional ArcGIS Developer API Key for secured layers
   */
  static async loadAsGeoJSON(url: string, where: string = '1=1', apiKey?: string): Promise<any> {
    
    let authentication = undefined;
    if (apiKey) {
      authentication = ApiKeyManager.fromKey(apiKey);
    }

    try {
      const response = await queryFeatures({
        url,
        where,
        f: 'geojson', // Request GeoJSON format directly for Cesium compatibility
        outFields: ['*'], // Fetch all attributes
        outSR: '4326', // Request WGS84 coordinates (native to Cesium)
        authentication,
      });

      return response;
    } catch (error) {
      console.error(`Failed to load ArcGIS Feature Layer from ${url}:`, error);
      throw error;
    }
  }
}
