import json

with open("public/data/mumbai_buildings_with_height.geojson") as f:
    d = json.load(f)
    print("Building coord:", d["features"][0]["geometry"]["coordinates"][0][0][0])

with open("public/data/wards/mumbai.geojson") as f:
    w = json.load(f)
    print("Ward coord:", w["features"][0]["geometry"]["coordinates"][0][0][0])
