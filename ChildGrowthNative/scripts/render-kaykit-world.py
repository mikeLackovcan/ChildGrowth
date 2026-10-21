"""Render the vendored KayKit City Builder OBJ files as Expo-ready sprites.

Run with Blender, not the system Python:
  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --python scripts/render-kaykit-world.py -- <source-dir> <output-dir>
"""

from pathlib import Path
import math
import sys

import bpy
from mathutils import Vector


ASSETS = (
    "building_A",
    "building_B",
    "building_C",
    "building_D",
    "building_E",
    "building_F",
    "building_G",
    "building_H",
    "bench",
    "bush",
    "streetlight",
    "watertower",
    "road_straight",
    "road_corner",
    "road_junction",
    "road_tsplit",
    "car_hatchback",
    "firehydrant",
    "dumpster",
)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_render(output_path):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.filepath = str(output_path)
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.82, 0.90, 1.0, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8


def add_lights(center, size):
    key_data = bpy.data.lights.new("Key", type="AREA")
    key_data.energy = 950
    key_data.shape = "DISK"
    key_data.size = max(5.0, size * 2.2)
    key = bpy.data.objects.new("Key", key_data)
    bpy.context.collection.objects.link(key)
    key.location = center + Vector((-size * 1.8, -size * 2.2, size * 3.0))
    look_at(key, center)

    fill_data = bpy.data.lights.new("Fill", type="AREA")
    fill_data.energy = 480
    fill_data.size = max(4.0, size * 1.8)
    fill = bpy.data.objects.new("Fill", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = center + Vector((size * 2.4, size * 0.8, size * 1.8))
    look_at(fill, center)


def render_asset(source_dir, output_dir, name):
    reset_scene()
    source = source_dir / f"{name}.obj"
    if not source.exists():
        raise FileNotFoundError(source)

    bpy.ops.wm.obj_import(filepath=str(source))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not objects:
        raise RuntimeError(f"No mesh imported for {name}")

    corners = []
    for obj in objects:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    maximum = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    center = (minimum + maximum) / 2
    size = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z)

    for obj in objects:
        obj.location -= center
    center = Vector((0, 0, 0))

    camera_data = bpy.data.cameras.new("Camera")
    camera = bpy.data.objects.new("Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = size * (1.42 if name.startswith("building_") else 1.7)
    camera.location = Vector((size * 1.65, -size * 2.0, size * 1.55))
    look_at(camera, center)

    add_lights(center, size)
    setup_render(output_dir / f"{name}.png")
    bpy.ops.render.render(write_still=True)


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 2:
        raise SystemExit("Expected: <source-obj-directory> <output-directory>")
    source_dir = Path(args[0]).resolve()
    output_dir = Path(args[1]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        print(f"Rendering {name}")
        render_asset(source_dir, output_dir, name)


if __name__ == "__main__":
    main()
