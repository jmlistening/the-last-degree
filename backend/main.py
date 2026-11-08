from fastapi import FastAPI

from .model import Batch, Outcome, Scenario
from .sim import simulate

app = FastAPI(title="The Last Degree Simulation API", version="1.0.0",
              description="Deterministic gameplay approximation. It has no meteorological forecasting capability.")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/simulate", response_model=Outcome)
def run(scenario: Scenario) -> Outcome:
    return simulate(scenario)


@app.post("/compare", response_model=list[Outcome])
def compare(batch: Batch) -> list[Outcome]:
    return [simulate(scenario) for scenario in batch.scenarios]
