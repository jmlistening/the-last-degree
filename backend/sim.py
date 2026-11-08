import json
from pathlib import Path

import numpy as np

from .model import Outcome, Scenario

RULES = json.loads((Path(__file__).resolve().parents[1] / "src" / "rules.json").read_text(encoding="utf-8"))
DIRECTIONS = ((1, 0), (0, 1), (-1, 0), (0, -1))


def neighbors(grid):
    total = np.zeros_like(grid, dtype=float)
    count = np.zeros_like(total)
    for dest, source in (
        (np.s_[1:, :], np.s_[:-1, :]), (np.s_[:-1, :], np.s_[1:, :]),
        (np.s_[:, 1:], np.s_[:, :-1]), (np.s_[:, :-1], np.s_[:, 1:]),
    ):
        total[dest] += grid[source]
        count[dest] += 1
    return total, count


def temperature_step(temp, target):
    total, count = neighbors(temp)
    average = np.divide(total, count, out=temp.copy(), where=count != 0)
    return temp + RULES["relax"] * (target - temp) + RULES["diffuse"] * (average - temp)


def simulate(s: Scenario) -> Outcome:
    n = s.size
    z, x = np.indices((n, n))
    surface = np.array([s.base + RULES["terrain"][tile] for tile in s.tiles]).reshape(n, n)
    water = np.array([tile == "water" for tile in s.tiles]).reshape(n, n)
    adjacent_water, _ = neighbors(water)
    cooling_surface = surface - .65 * adjacent_water * ~water
    temp = surface if s.temp is None else np.asarray(s.temp).reshape(n, n)
    history = []
    wind = s.wind

    def distance(cell, offset_x=0, offset_z=0):
        return np.hypot(x - cell % n - offset_x, z - cell // n - offset_z)

    def cell_distance(a, b):
        return np.hypot(a % n - b % n, a // n - b // n)

    for time in range(s.time + 1, s.time + s.steps + 1):
        ratio = time / s.duration
        target = cooling_surface + 1.4 * np.sin(np.pi * ratio) + ratio * 1.5
        if time <= s.rain_until:
            target -= RULES["gear"]["rain"]["power"]
        active = []
        for event in s.events:
            if time < event.start:
                break
            if event.kind == "shift":
                wind = event.wind
            if time < event.end:
                active.append(event)
                if event.kind == "surge":
                    target += 2.7
                elif event.kind == "shower":
                    target -= 1.8
                elif event.kind == "overload":
                    target += 3.5 * (distance(event.center) <= 2)
        facilities = [f for f in s.facilities if f.built < time]
        fans = [f for f in facilities if f.kind == "fan"]
        for f in facilities:
            if f.kind == "fan":
                continue
            spec = RULES["gear"][f.kind]
            if f.kind == "mist" and time - f.built > spec["life"]:
                continue
            if any((e.kind == "outage" and f.kind == "tower" and cell_distance(f.cell, e.center) < 3)
                   or (e.kind == "fault" and f.kind == "mist") for e in active):
                continue
            fan = next((item for item in fans if cell_distance(item.cell, f.cell) <= RULES["gear"]["fan"]["radius"]), None)
            dx, dz = DIRECTIONS[fan.wind if fan else wind]
            offset = 0 if f.kind == "tree" else RULES["fanBoost"] if fan else .25
            target -= spec["power"] * np.maximum(0, 1 - distance(f.cell, dx * offset, dz * offset) / (spec["radius"] + .5))
        temp = temperature_step(temp, target)
        history.append(float(temp.mean()))
    return Outcome(time=s.time + s.steps, wind=wind, average=history[-1], peak=float(temp.max()),
                   temp=temp.ravel().tolist(), average_by_step=history)
