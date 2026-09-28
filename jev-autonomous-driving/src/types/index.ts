export type ManeuverType = 'KEEP_LANE' | 'CHANGE_LEFT' | 'CHANGE_RIGHT' | 'SLOW_DOWN' | 'EMERGENCY_STOP';

export interface VehicleTelemetry {
  speedKmh: number;
  targetSpeedKmh: number;
  lane: number; // 0: left, 1: center, 2: right
  laneOffset: number; // -1.0 to 1.0 (deviation from lane center)
  heading: number; // radians
  distanceToFrontObstacle: number; // meters
  frontRelativeSpeedKmh: number; // km/h
  timeToCollision: number; // seconds
  pedestrianDetected: boolean;
  pedestrianDistance: number; // meters
  leftLaneClear: boolean;
  rightLaneClear: boolean;
  weatherCondition: 'CLEAR' | 'RAIN' | 'DENSE_FOG' | 'NIGHT';
  sensorNoiseLevel: number; // 0.0 to 1.0
  roadCurvature?: {
    isCurvedRoad: boolean;
    radiusM: number;
    lateralAccMs2: number;
    sightDistanceM: number;
    oncomingDistanceM: number;
    oncomingTtcSec: number;
    solidLineActive: boolean;
    overtakePhase: 'FOLLOWING' | 'AWAITING_GAP' | 'OVERTAKING' | 'RETURNING' | 'CRUISE';
  };
}

export interface JevNoulResult {
  decision: boolean;
  calibratedProbability: number;
  confidenceScore: number;
}

export interface JevChoiceResult {
  selected: ManeuverType;
  distribution: Record<ManeuverType, number>;
  confidence: number;
}

export interface JevScoreResult {
  score: number; // 0.0 to 1.0
  calibratedValue: number;
}

export interface JevDecisionBundle {
  timestamp: number;
  latencyMs: number;
  // Noul decisions (Boolean typed)
  emergencyBrake: JevNoulResult;
  takeoverRequired: JevNoulResult;
  safeToOvertake: JevNoulResult;
  pedestrianAlert: JevNoulResult;
  // Choice decision (Categorical typed)
  tacticalManeuver: JevChoiceResult;
  // Score decisions (Scalar continuous)
  collisionRiskScore: JevScoreResult;
  comfortScore: JevScoreResult;
  // Safety governor status
  governorTriggered: boolean;
  governorReason?: string;
}

export interface SimulationObstacle {
  id: string;
  type: 'CAR' | 'TRUCK' | 'PEDESTRIAN' | 'DEBRIS' | 'CRASHED_CAR' | 'AMBULANCE' | 'ANIMAL' | 'TRACTOR';
  x: number; // meters along track
  lane: number;
  speedKmh: number;
  yOffset?: number;
  hazardLights?: boolean;
  reverseHeading?: boolean;
  label?: string;
}

export type ScenarioPreset = 
  | 'HIGHWAY_CRUISE'
  | 'EMERGENCY_PEDESTRIAN'
  | 'CUT_IN_VEHICLE'
  | 'SLOW_TRUCK_OVERTAKE'
  | 'FOG_UNCERTAINTY'
  | 'MULTI_CAR_PILEUP'
  | 'DEBRIS_SWERVE'
  | 'GHOST_DRIVER_HEADON'
  | 'EMERGENCY_VEHICLE_YIELD'
  | 'ANIMAL_CROSSING'
  | 'CURVED_TWOWAY_OVERTAKE';
