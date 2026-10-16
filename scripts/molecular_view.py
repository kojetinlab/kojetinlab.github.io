"""Camera conversion shared by PyMOL preparation and configuration validation.

The browser equivalent is assets/js/molecular-view.js. Coordinate inputs to a
camera preset are in the original deposited PDB frame. Never apply them
directly to the already centered and automatically oriented component PDBs.
"""
import math


def dot(a, b):
    return sum(x*y for x, y in zip(a, b))


def sub(a, b):
    return [x-y for x, y in zip(a, b)]


def norm(v):
    length = math.sqrt(dot(v, v))
    if length < 1e-8:
        raise ValueError('Camera vectors must not be zero or parallel')
    return [n/length for n in v]


def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]


def transpose(m):
    return list(map(list, zip(*m)))


def multiply(a, b):
    return [[dot(row, col) for col in transpose(b)] for row in a]


def resolve_view(view, scene):
    x, y, z = map(math.radians, view.get('rotation_xyz', [0, 0, 0]))
    cx, cy, cz = map(math.cos, (x, y, z))
    sx, sy, sz = map(math.sin, (x, y, z))
    euler = [[cz*cy, cz*sy*sx-sz*cx, cz*sy*cx+sz*sx],
             [sz*cy, sz*sy*sx+cz*cx, sz*sy*cx-cz*sx], [-sy, cy*sx, cy*cx]]
    orientation, offset = euler, [0, 0, 0]
    span = view.get('camera_span') or 39
    camera = view.get('camera', {})
    mode = camera.get('mode', 'orthographic')
    fov = math.radians(camera.get('fov_degrees', 45))
    if camera:
        back = norm(sub(camera['position'], camera['target']))
        right = norm(cross(camera['up'], back))
        up = cross(back, right)
        basis = [right, up, back]
        orientation = multiply(euler, multiply(basis, transpose(scene['autoBasis'])))
        centered_target = sub(scene['coordinateOrigin'], camera['target'])
        shift = [dot(row, centered_target) for row in basis]
        offset = [dot(row, shift) for row in euler]
        delta = sub(camera['position'], camera['target'])
        distance = math.sqrt(dot(delta, delta))
        if camera.get('position_type') == 'fov_normalized':
            derived_span = distance / 2 / (math.cos(fov/2) if mode == 'perspective' else 1)
        else:
            derived_span = distance * math.tan(fov/2)
        span = view.get('camera_span') or derived_span
    return dict(orientation=orientation, offset=offset, span=span, mode=mode,
                fov=fov, radius=camera.get('radius', 100),
                zoom=view.get('scroll_zoom',dict(amount=0.12,start=0.25,end=0.9)))
