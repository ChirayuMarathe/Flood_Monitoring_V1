import urllib.request
import json

def fetch_overpass(query, filename):
    url = "https://overpass-api.de/api/interpreter"
    data = query.encode('utf-8')
    req = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            # The result is OSM JSON, we need it as GeoJSON.
            # Using overpass turbo or standard overpass usually returns OSM JSON.
            # To get GeoJSON natively from overpass requires a specific tool, 
            # but we can try to fetch pre-existing GeoJSON from Datameet instead.
            pass
    except Exception as e:
        print(f"Failed: {e}")

