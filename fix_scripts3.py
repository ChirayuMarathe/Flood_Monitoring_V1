import os

scripts = [
    "scripts/process_building_heights.py",
    "scripts/process_pune_heights.py",
    "scripts/process_navi_mumbai_heights.py"
]

for s in scripts:
    with open(s, "r") as f:
        content = f.read()
    
    # Replace unconditional swap with conditional swap
    bad_line = "wards.geometry = wards.geometry.map(lambda geom: transform(lambda *args: (args[1], args[0]) if len(args) == 2 else (args[1], args[0], args[2]), geom))"
    good_line = """if wards.total_bounds[0] < 40:
    print("Swapping [lat, lon] to [lon, lat] for wards...")
    wards.geometry = wards.geometry.map(lambda geom: transform(lambda *args: (args[1], args[0]) if len(args) == 2 else (args[1], args[0], args[2]), geom))
"""
    content = content.replace(bad_line, good_line)
    if "wards = wards.to_crs(buildings.crs)" not in content:
        content = content.replace("wards = gpd.read_file", "wards = gpd.read_file") # do nothing
        # Wait, I removed to_crs earlier!
        
    with open(s, "w") as f:
        f.write(content)
print("Scripts fixed.")
