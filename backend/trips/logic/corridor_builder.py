"""Picks the weather points for the heatmap: a band of grid cells around the routes (spec section 5.8, simplified).

The map is split into square grid cells. Every cell a route passes through, plus its neighbors,
becomes one heatmap point at the cell's center.
"""

import math

from trips.constants import MAX_CORRIDOR_POINTS
from trips.types import CorridorGrid, LonLat

# Grid cell sizes in degrees, tried smallest first (most detail); 0.25 degrees is about 15 miles;
# used by build_corridor_points.
CORRIDOR_CELL_SIZES_DEG = (0.25, 0.5, 1.0)

# Cells added on each side of a route cell; 2 cells of 0.25 degrees is about 30 miles each side;
# used by _get_corridor_cells.
NEIGHBOR_CELL_COUNT = 2

# Decimals kept for cell centers, so the JSON has no float noise like 0.30000000000000004;
# used by _get_cell_centers.
CENTER_DECIMALS = 4


def build_corridor_points(route_geometries: list[list[LonLat]]) -> CorridorGrid:
    """Return heatmap points in a band around the routes (at most MAX_CORRIDOR_POINTS) and their cell size."""
    # Smallest cells first; grow them until the band fits under the cap.
    for cell_size in CORRIDOR_CELL_SIZES_DEG:
        corridor_cells = _get_corridor_cells(route_geometries, cell_size)
        if len(corridor_cells) <= MAX_CORRIDOR_POINTS:
            return CorridorGrid(points=_get_cell_centers(corridor_cells, cell_size), cell_size_deg=cell_size)

    # Even the biggest cells are too many (only on extreme trips): keep the first MAX_CORRIDOR_POINTS.
    points = _get_cell_centers(corridor_cells, cell_size)[:MAX_CORRIDOR_POINTS]
    return CorridorGrid(points=points, cell_size_deg=cell_size)


def _get_corridor_cells(route_geometries: list[list[LonLat]], cell_size: float) -> set[tuple[int, int]]:
    # Step 1: the cells the routes pass through. A set keeps each cell once, like a Java HashSet;
    # thousands of route points fall into only a few hundred cells.
    route_cells = set()
    for geometry in route_geometries:
        for lon, lat in geometry:
            route_cells.add(_get_cell(lon, lat, cell_size))

    # Step 2: each route cell plus its neighbors, a 5 x 5 square of cells around it.
    corridor_cells = set()
    for column, row in route_cells:
        for column_offset in range(-NEIGHBOR_CELL_COUNT, NEIGHBOR_CELL_COUNT + 1):
            for row_offset in range(-NEIGHBOR_CELL_COUNT, NEIGHBOR_CELL_COUNT + 1):
                corridor_cells.add((column + column_offset, row + row_offset))

    return corridor_cells


def _get_cell(lon: float, lat: float, cell_size: float) -> tuple[int, int]:
    # Which cell a point falls in, as (column, row). math.floor, not int(): -96.8 / 0.25 = -387.2
    # must become -388 (the cell to its left), while int() would give -387.
    return (math.floor(lon / cell_size), math.floor(lat / cell_size))


def _get_cell_centers(cells: set[tuple[int, int]], cell_size: float) -> list[LonLat]:
    centers = []

    # Sorted, so the same routes always give the same list (easier to test and debug).
    for column, row in sorted(cells):
        # Center = cell start + half a cell, e.g. column 0 with 0.25-degree cells -> 0.125.
        lon = round((column + 0.5) * cell_size, CENTER_DECIMALS)
        lat = round((row + 0.5) * cell_size, CENTER_DECIMALS)
        centers.append((lon, lat))

    return centers
