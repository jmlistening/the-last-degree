import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.model import Scenario
from backend.sim import simulate

print(json.dumps([simulate(Scenario.model_validate(s)).model_dump() for s in json.load(sys.stdin)]))
