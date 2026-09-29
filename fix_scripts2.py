import os

scripts = [
    "scripts/process_building_heights.py",
    "scripts/process_pune_heights.py",
    "scripts/process_navi_mumbai_heights.py"
]

for s in scripts:
    with open(s, "r") as f:
        content = f.read()
    
    # Remove the if condition
    content = content.replace("if wards.crs != buildings.crs:\n    wards = wards.to_crs(buildings.crs)\n    wards.geometry = wards.geometry.map(lambda geom: transform(lambda *args: (args[1], args[0]) if len(args) == 2 else (args[1], args[0], args[2]), geom))", "wards.geometry = wards.geometry.map(lambda geom: transform(lambda *args: (args[1], args[0]) if len(args) == 2 else (args[1], args[0], args[2]), geom))")
        
    with open(s, "w") as f:
        f.write(content)
print("Scripts fixed.")
