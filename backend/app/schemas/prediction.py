from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class LocationBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    elevation: float
    distance_from_river: float
    population_density: int
    historical_flood_frequency: float

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    id: int

    class Config:
        from_attributes = True

class WeatherReadingResponse(BaseModel):
    id: int
    location_id: int
    timestamp: datetime
    temperature: float
    humidity: float
    rainfall_intensity: float
    rainfall_24h: float
    rainfall_48h: float
    wind_speed: float
    pressure: float
    river_level: float
    soil_moisture: float

    class Config:
        from_attributes = True

class PredictionResponse(BaseModel):
    id: int
    location_id: int
    timestamp: datetime
    flood_probability: float
    risk_level: str
    confidence_score: float
    estimated_time_hours: Optional[int] = None
    rainfall_intensity: float
    river_rise_rate: float
    soil_saturation: float
    ai_explanation: Optional[List[str]] = None
    model_version: str
    location: Optional[LocationResponse] = None

    class Config:
        from_attributes = True

class PredictionRequest(BaseModel):
    rainfall_1d: float
    rainfall_3d: float
    rainfall_7d: float
    rainfall_14d: Optional[float] = None
    rainfall_change_1d: Optional[float] = None
    rainfall_change_3d: Optional[float] = None
    rainfall_rate_3d: Optional[float] = None
    rainfall_deviation: Optional[float] = None
    temperature: float
    humidity: float
    pressure: Optional[float] = 1010.0
    wind_speed: Optional[float] = 10.0
    latitude: float
    longitude: float
    month: Optional[int] = None
    season: Optional[int] = None


class PredictionAPIResponse(BaseModel):
    prediction: int
    probability: float
    risk_level: str
    threshold_used: float
    operating_mode: str
    explanation: List[str]
    model_name: str
    model_version: str

class OperatingModeResponse(BaseModel):
    operating_mode: str
    threshold: float
    standard_threshold: float
    emergency_threshold: float
    status: str
    description: str

class OperatingModeRequest(BaseModel):
    mode: str
