import json
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

from .main import app
from .model import Scenario
from .sim import simulate, temperature_step

client = TestClient(app)
SCENARIOS = json.loads((Path(__file__).resolve().parents[1] / "tests" / "scenarios.json").read_text(encoding="utf-8"))


def test_health_and_batch():
    assert client.get("/health").json() == {"status": "ok"}
    response = client.post("/compare", json={"scenarios": SCENARIOS})
    assert response.status_code == 200
    assert len(response.json()) == len(SCENARIOS)
    for source, outcome in zip(SCENARIOS, response.json()):
        assert outcome["time"] == source["time"] + source["steps"]
        assert len(outcome["temp"]) == source["size"] ** 2
        assert len(outcome["average_by_step"]) == source["steps"]
    assert response.json()[0]["average"] > response.json()[1]["average"]


def test_isolated_cell_and_corner_diffusion():
    assert np.allclose(temperature_step(np.array([[40.]]), np.array([[30.]])), [[38.4]])
    grid = np.array([[44., 34.], [34., 34.]])
    assert np.allclose(temperature_step(grid, grid), [[42.8, 34.6], [34.6, 34.]])


def test_invalid_parameters():
    source = SCENARIOS[0]
    for patch in [{"size": 0}, {"tiles": ["water"]}, {"steps": 999}, {"wind": 5},
                  {"base": "NaN"}, {"facilities": [{"kind": "tower", "cell": 900}]}]:
        assert client.post("/simulate", json=source | patch).status_code == 422
    assert client.post("/compare", json={"scenarios": []}).status_code == 422


def test_repeatability():
    scenario = Scenario.model_validate(SCENARIOS[-1])
    assert simulate(scenario) == simulate(scenario)
