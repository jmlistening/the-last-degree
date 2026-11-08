from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

Tile = Literal["road", "lot", "home", "office", "factory", "hospital", "park", "water"]
Gear = Literal["tree", "tower", "fan", "mist"]
Wind = Literal[0, 1, 2, 3]
EventKind = Literal["surge", "outage", "fault", "shift", "shower", "overload"]
Temperature = Annotated[float, Field(ge=-100, le=150, allow_inf_nan=False)]


class Facility(BaseModel):
    kind: Gear
    cell: int = Field(ge=0)
    built: int = Field(default=0, ge=0, le=7200)
    wind: Wind = 0


class CityEvent(BaseModel):
    kind: EventKind
    start: int = Field(ge=1, le=7200)
    end: int = Field(ge=2, le=7200)
    center: int = Field(ge=0)
    wind: Wind = 0


class Scenario(BaseModel):
    size: int = Field(ge=1, le=20)
    tiles: list[Tile] = Field(min_length=1, max_length=400)
    base: Temperature
    duration: int = Field(ge=1, le=3600)
    time: int = Field(default=0, ge=0, le=3600)
    steps: int = Field(default=1, ge=1, le=360)
    wind: Wind = 0
    rain_until: int = Field(default=0, ge=0, le=7200)
    temp: list[Temperature] | None = Field(default=None, max_length=400)
    facilities: list[Facility] = Field(default_factory=list, max_length=100)
    events: list[CityEvent] = Field(default_factory=list, max_length=24)

    @model_validator(mode="after")
    def validate_grid(self):
        count = self.size ** 2
        if len(self.tiles) != count or (self.temp is not None and len(self.temp) != count):
            raise ValueError("tiles and temp must contain size × size cells")
        if self.time + self.steps > self.duration:
            raise ValueError("time + steps must be at most duration")
        if any(f.cell >= count or self.tiles[f.cell] not in {"road", "lot", "park"} for f in self.facilities):
            raise ValueError("each facility needs a buildable cell")
        if len({f.cell for f in self.facilities}) != len(self.facilities):
            raise ValueError("only one facility is allowed per cell")
        if any(e.center >= count or e.end <= e.start for e in self.events):
            raise ValueError("invalid event bounds")
        if any(a.start > b.start for a, b in zip(self.events, self.events[1:])):
            raise ValueError("events must be ordered by start")
        return self


class Batch(BaseModel):
    scenarios: list[Scenario] = Field(min_length=1, max_length=12)


class Outcome(BaseModel):
    time: int
    wind: Wind
    average: float
    peak: float
    temp: list[float]
    average_by_step: list[float]
