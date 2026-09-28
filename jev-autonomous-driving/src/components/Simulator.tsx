import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, AlertTriangle, CloudFog, CloudRain, 
  Sun, UserCheck, ShieldAlert, Zap, Compass, Gauge, Activity,
  ArrowRight, ShieldCheck
} from 'lucide-react';
import { 
  VehicleTelemetry, JevDecisionBundle, ManeuverType, ScenarioPreset, SimulationObstacle 
} from '../types';

interface SimulatorProps {
  onTelemetryUpdate: (telemetry: VehicleTelemetry, decision: JevDecisionBundle) => void;
  selectedPreset: ScenarioPreset;
  onPresetChange: (preset: ScenarioPreset) => void;
  lang?: 'en' | 'pl';
}

export const Simulator: React.FC<SimulatorProps> = ({ 
  onTelemetryUpdate, 
  selectedPreset, 
  onPresetChange,
  lang = 'en'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [weather, setWeather] = useState<'CLEAR' | 'RAIN' | 'DENSE_FOG'>('CLEAR');
  const [sensorNoise, setSensorNoise] = useState<number>(0.05);
  const [egoSpeed, setEgoSpeed] = useState<number>(75);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.65);
  const [showSensorBeams, setShowSensorBeams] = useState<boolean>(true);

  // Simulation internal state
  const simState = useRef({
    distanceTraveled: 0,
    egoX: 110, // Fixed car anchor on screen (pixels from left)
    egoLane: 1, // 0: top/left, 1: center, 2: bottom/right
    egoTargetLane: 1,
    laneY: [95, 165, 235], // Y coordinates of lane centers
    currentY: 165,
    targetY: 165,
    wheelAngle: 0,
    obstacles: [] as SimulationObstacle[],
    crosswalk: {
      active: false,
      x: 650, // Starts ahead of the car, moves towards the car (to the left)
    },
    pedestrian: {
      active: false,
      x: 650,
      y: 60,
      targetY: 260,
      speedY: 1.4,
      crossed: false,
    },
    animal: {
      active: false,
      x: 580,
      y: 40,
      targetY: 165,
      speedY: 1.5,
      crossed: false,
    },
    roadOffset: 0, // Shifts dashes and bollards to the LEFT (driving forward)
    lastDecision: null as JevDecisionBundle | null,
    governorTriggered: false,
    particles: [] as { x: number; y: number; speed: number; length: number }[],
    windLines: [] as { x: number; y: number; length: number; speed: number }[],
    crashedSmoke: [] as { x: number; y: number; radius: number; alpha: number; vy: number }[],
  });

  // Apply scenario preset
  const applyPreset = useCallback((preset: ScenarioPreset) => {
    const s = simState.current;
    s.egoLane = 1;
    s.egoTargetLane = 1;
    s.currentY = 165;
    s.targetY = 165;
    s.crashedSmoke = [];

    if (preset === 'HIGHWAY_CRUISE') {
      s.obstacles = [
        { id: 'lead_car', type: 'CAR', x: 500, lane: 1, speedKmh: 75 },
        { id: 'left_car', type: 'CAR', x: 360, lane: 0, speedKmh: 95 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.04);
      setEgoSpeed(80);
    } else if (preset === 'EMERGENCY_PEDESTRIAN') {
      s.obstacles = [];
      s.crosswalk = { active: true, x: 620 };
      s.pedestrian = { 
        active: true, 
        x: 620, 
        y: 65, 
        targetY: 265, 
        speedY: 1.5,
        crossed: false
      };
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.05);
      setEgoSpeed(60);
    } else if (preset === 'CUT_IN_VEHICLE') {
      s.obstacles = [
        { id: 'cut_in_car', type: 'CAR', x: 260, lane: 0, speedKmh: 50, yOffset: 25 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.06);
      setEgoSpeed(80);
    } else if (preset === 'SLOW_TRUCK_OVERTAKE') {
      s.obstacles = [
        { id: 'slow_truck', type: 'TRUCK', x: 340, lane: 1, speedKmh: 38 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.04);
      setEgoSpeed(75);
    } else if (preset === 'MULTI_CAR_PILEUP') {
      s.obstacles = [
        { id: 'crash_lead', type: 'CRASHED_CAR', x: 430, lane: 1, speedKmh: 0, yOffset: 4, hazardLights: true, label: 'CRASH #1' },
        { id: 'crash_side', type: 'CRASHED_CAR', x: 400, lane: 0, speedKmh: 0, yOffset: -6, hazardLights: true, label: 'CRASH #2' },
        { id: 'debris_part', type: 'DEBRIS', x: 470, lane: 1, speedKmh: 0, yOffset: 12, label: 'WRECKAGE' }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.06);
      setEgoSpeed(80);
    } else if (preset === 'DEBRIS_SWERVE') {
      s.obstacles = [
        { id: 'lost_debris', type: 'DEBRIS', x: 370, lane: 1, speedKmh: 0, yOffset: 0, label: 'TIRE CARCASS' },
        { id: 'distant_car', type: 'CAR', x: 620, lane: 2, speedKmh: 80 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.05);
      setEgoSpeed(80);
    } else if (preset === 'GHOST_DRIVER_HEADON') {
      s.obstacles = [
        { id: 'ghost_driver', type: 'CAR', x: 650, lane: 1, speedKmh: -75, reverseHeading: true, label: 'WRONG WAY' },
        { id: 'traffic_right', type: 'CAR', x: 500, lane: 2, speedKmh: 65 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.08);
      setEgoSpeed(75);
    } else if (preset === 'EMERGENCY_VEHICLE_YIELD') {
      s.obstacles = [
        { id: 'ambulance_siren', type: 'AMBULANCE', x: -100, lane: 1, speedKmh: 125, hazardLights: true, label: 'AMBULANCE 112' },
        { id: 'traffic_front', type: 'CAR', x: 520, lane: 1, speedKmh: 75 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.04);
      setEgoSpeed(75);
    } else if (preset === 'ANIMAL_CROSSING') {
      s.obstacles = [
        { id: 'traffic_right', type: 'CAR', x: 480, lane: 2, speedKmh: 70 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal = {
        active: true,
        x: 520,
        y: 40,
        targetY: 165,
        speedY: 1.6,
        crossed: false
      };
      setWeather('CLEAR');
      setSensorNoise(0.06);
      setEgoSpeed(70);
    } else if (preset === 'FOG_UNCERTAINTY') {
      s.obstacles = [
        { id: 'fog_truck', type: 'TRUCK', x: 380, lane: 1, speedKmh: 40 }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('DENSE_FOG');
      setSensorNoise(0.48);
      setEgoSpeed(65);
    } else if (preset === 'CURVED_TWOWAY_OVERTAKE') {
      s.obstacles = [
        { id: 'slow_tractor', type: 'TRACTOR', x: 310, lane: 1, speedKmh: 24, hazardLights: true, label: 'TRACTOR 24 km/h' },
        { id: 'oncoming_traffic', type: 'CAR', x: 740, lane: 0, speedKmh: -70, reverseHeading: true, label: 'ONCOMING 70 km/h' }
      ];
      s.crosswalk.active = false;
      s.pedestrian.active = false;
      s.animal.active = false;
      setWeather('CLEAR');
      setSensorNoise(0.04);
      setEgoSpeed(65);
    }
  }, []);

  useEffect(() => {
    applyPreset(selectedPreset);
  }, [selectedPreset, applyPreset]);

  // Rain & wind speed lines initialization
  useEffect(() => {
    const s = simState.current;
    s.particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 330,
      speed: 7 + Math.random() * 7,
      length: 10 + Math.random() * 10
    }));

    s.windLines = Array.from({ length: 18 }, () => ({
      x: Math.random() * 800,
      y: 60 + Math.random() * 210,
      length: 25 + Math.random() * 45,
      speed: 12 + Math.random() * 10
    }));
  }, []);

  // Compute Jev System One decisions based on current physics state
  const evaluateJevDecision = useCallback((telemetry: VehicleTelemetry): JevDecisionBundle => {
    const { timeToCollision, distanceToFrontObstacle, speedKmh, pedestrianDetected, pedestrianDistance, sensorNoiseLevel } = telemetry;
    
    // Effective safety margin
    const brakingDist = Math.pow(speedKmh / 3.6, 2) / (2 * 7.5);
    const closestDist = pedestrianDetected ? Math.min(distanceToFrontObstacle, pedestrianDistance) : distanceToFrontObstacle;

    // 1. Noul: Emergency Brake Required (calibrated probability)
    let urgency = 0;
    if (pedestrianDetected && pedestrianDistance < 35) {
      urgency += (35 - pedestrianDistance) / 7;
    }
    if (timeToCollision < 2.8) {
      urgency += (2.8 - timeToCollision) * 2.5;
    }
    if (closestDist < brakingDist * 1.3) {
      urgency += 2.2;
    }

    const logit = urgency - 1.7;
    let ebProb = 1 / (1 + Math.exp(-Math.max(-6, Math.min(6, logit))));
    ebProb = ebProb * (1 - 0.4 * sensorNoiseLevel) + 0.5 * (0.4 * sensorNoiseLevel);
    const ebDecision = ebProb > 0.5;

    // 2. Noul: Takeover Required
    let takeoverRisk = sensorNoiseLevel * 1.8;
    if (weather === 'DENSE_FOG' && speedKmh > 50) takeoverRisk += 0.4;
    if (ebProb > 0.35 && ebProb < 0.65) takeoverRisk += 0.3;
    const takeoverProb = Math.min(0.99, Math.max(0.01, takeoverRisk));

    // 3. Noul: Safe to Overtake
    let safeOvertakeProb = 0.04;
    if (selectedPreset === 'CURVED_TWOWAY_OVERTAKE') {
      const oncomingInPassZone = simState.current.obstacles.some(
        o => o.lane === 0 && o.reverseHeading && o.x > (simState.current.egoX - 40) && o.x < (simState.current.egoX + 340)
      );
      const solidActive = Math.sin((simState.current.egoX + simState.current.roadOffset * 0.7) * 0.007) > 0.15;
      safeOvertakeProb = (!oncomingInPassZone && !solidActive && telemetry.leftLaneClear)
        ? Math.max(0.05, 0.92 * (1 - sensorNoiseLevel))
        : 0.02;
    } else {
      safeOvertakeProb = (telemetry.leftLaneClear && closestDist < 45 && timeToCollision > 2.0 && !pedestrianDetected)
        ? Math.max(0.05, 0.88 * (1 - sensorNoiseLevel))
        : 0.04;
    }

    // 4. Choice: Tactical Maneuver Distribution
    let maneuverWeights: Record<ManeuverType, number> = {
      KEEP_LANE: 1.0,
      CHANGE_LEFT: 0.1,
      CHANGE_RIGHT: 0.1,
      SLOW_DOWN: 0.1,
      EMERGENCY_STOP: 0.01
    };

    // Check emergency vehicle corridor yield requirement
    const isAmbulanceApproaching = simState.current.obstacles.some(
      o => o.type === 'AMBULANCE' && (o.lane === telemetry.lane || o.lane === 1) && o.x < 350
    );

    // Check oncoming wrong-way vehicle hazard
    const isWrongWayHazard = simState.current.obstacles.some(
      o => o.reverseHeading && o.lane === telemetry.lane && Math.abs(o.x - simState.current.egoX) < 380
    );

    if (selectedPreset === 'CURVED_TWOWAY_OVERTAKE') {
      const tractor = simState.current.obstacles.find(o => o.type === 'TRACTOR');
      const oncomingInPassZone = simState.current.obstacles.some(
        o => o.lane === 0 && o.reverseHeading && o.x > (simState.current.egoX - 40) && o.x < (simState.current.egoX + 340)
      );
      const solidActive = Math.sin((simState.current.egoX + simState.current.roadOffset * 0.7) * 0.007) > 0.15;
      const isPastTractor = tractor ? (simState.current.egoX > tractor.x + 35) : false;
      const distToTractorPx = tractor ? (tractor.x - simState.current.egoX) : 999;

      if (telemetry.lane === 1) {
        if (!isPastTractor && distToTractorPx < 220) {
          if (oncomingInPassZone || solidActive) {
            // Unsafe: hold behind tractor, match speed (approx 24 km/h)
            maneuverWeights = {
              KEEP_LANE: 3.5,
              CHANGE_LEFT: 0.01,
              CHANGE_RIGHT: 0.1,
              SLOW_DOWN: 5.8,
              EMERGENCY_STOP: 0.05
            };
          } else {
            // Safe to pass: oncoming lane clear & dashed line!
            maneuverWeights = {
              KEEP_LANE: 0.1,
              CHANGE_LEFT: 8.0,
              CHANGE_RIGHT: 0.05,
              SLOW_DOWN: 0.1,
              EMERGENCY_STOP: 0.01
            };
          }
        } else {
          maneuverWeights = {
            KEEP_LANE: 4.5,
            CHANGE_LEFT: 0.05,
            CHANGE_RIGHT: 0.1,
            SLOW_DOWN: 0.1,
            EMERGENCY_STOP: 0.01
          };
        }
      } else if (telemetry.lane === 0) {
        if (isPastTractor) {
          // Completed pass -> return safely to travel lane (Lane 1)
          maneuverWeights = {
            KEEP_LANE: 0.1,
            CHANGE_LEFT: 0.01,
            CHANGE_RIGHT: 8.5,
            SLOW_DOWN: 0.2,
            EMERGENCY_STOP: 0.02
          };
        } else if (oncomingInPassZone) {
          // Emergency return to right lane before head-on conflict
          maneuverWeights = {
            KEEP_LANE: 0.2,
            CHANGE_LEFT: 0.01,
            CHANGE_RIGHT: 9.0,
            SLOW_DOWN: 2.8,
            EMERGENCY_STOP: 0.5
          };
        } else {
          // Overtaking in progress -> hold passing lane and expedite pass
          maneuverWeights = {
            KEEP_LANE: 5.5,
            CHANGE_LEFT: 0.01,
            CHANGE_RIGHT: 0.2,
            SLOW_DOWN: 0.05,
            EMERGENCY_STOP: 0.01
          };
        }
      }
    } else if (ebDecision || (pedestrianDetected && pedestrianDistance < 22) || isWrongWayHazard) {
      if (isWrongWayHazard && telemetry.rightLaneClear) {
        // High-speed swerve to clear lane to avoid head-on crash
        maneuverWeights = {
          KEEP_LANE: 0.01,
          CHANGE_LEFT: 0.05,
          CHANGE_RIGHT: 7.5,
          SLOW_DOWN: 3.0,
          EMERGENCY_STOP: 4.5
        };
      } else {
        maneuverWeights = {
          KEEP_LANE: 0.01,
          CHANGE_LEFT: 0.02,
          CHANGE_RIGHT: 0.01,
          SLOW_DOWN: 2.0,
          EMERGENCY_STOP: 9.0
        };
      }
    } else if (isAmbulanceApproaching) {
      // Emergency Corridor (Korytarz Życia) - Yield by moving to rightmost clear lane
      if (telemetry.rightLaneClear && telemetry.lane < 2) {
        maneuverWeights = {
          KEEP_LANE: 0.05,
          CHANGE_LEFT: 0.01,
          CHANGE_RIGHT: 8.5,
          SLOW_DOWN: 2.0,
          EMERGENCY_STOP: 0.05
        };
      } else {
        maneuverWeights = {
          KEEP_LANE: 0.2,
          CHANGE_LEFT: 0.05,
          CHANGE_RIGHT: 0.2,
          SLOW_DOWN: 5.5,
          EMERGENCY_STOP: 0.1
        };
      }
    } else if (closestDist < 35 && speedKmh > 35) {
      if (telemetry.leftLaneClear) {
        maneuverWeights = { KEEP_LANE: 0.2, CHANGE_LEFT: 4.8, CHANGE_RIGHT: 0.2, SLOW_DOWN: 1.8, EMERGENCY_STOP: 0.05 };
      } else if (telemetry.rightLaneClear) {
        maneuverWeights = { KEEP_LANE: 0.2, CHANGE_LEFT: 0.2, CHANGE_RIGHT: 4.8, SLOW_DOWN: 2.0, EMERGENCY_STOP: 0.05 };
      } else {
        maneuverWeights = { KEEP_LANE: 0.1, CHANGE_LEFT: 0.1, CHANGE_RIGHT: 0.1, SLOW_DOWN: 4.5, EMERGENCY_STOP: 0.2 };
      }
    } else if (closestDist < 55) {
      maneuverWeights = { KEEP_LANE: 1.2, CHANGE_LEFT: telemetry.leftLaneClear ? 2.5 : 0.2, CHANGE_RIGHT: 0.2, SLOW_DOWN: 2.8, EMERGENCY_STOP: 0.05 };
    }

    const expEntries = Object.entries(maneuverWeights).map(([k, v]) => [k, Math.exp(v)] as [ManeuverType, number]);
    const totalExp = expEntries.reduce((sum, [, val]) => sum + val, 0);
    const distribution = Object.fromEntries(
      expEntries.map(([k, val]) => [k, Number((val / totalExp).toFixed(4))])
    ) as Record<ManeuverType, number>;

    const bestManeuver = (Object.keys(distribution) as ManeuverType[]).reduce((a, b) => 
      distribution[a] > distribution[b] ? a : b
    );

    const riskIndex = Number(Math.min(1.0, Math.max(0.0, (ebProb * 0.72) + (Math.max(0, 1 - (closestDist / 70)) * 0.28))).toFixed(3));
    const modelConfidence = Number(Math.max(0.1, 1 - (sensorNoiseLevel * 0.95)).toFixed(3));

    const isGovernorTriggered = modelConfidence < confidenceThreshold;
    const governorReason = isGovernorTriggered 
      ? `System One confidence (${(modelConfidence * 100).toFixed(0)}%) < safety threshold (${(confidenceThreshold * 100).toFixed(0)}%)`
      : undefined;

    return {
      timestamp: Date.now(),
      latencyMs: 78.4,
      emergencyBrake: {
        decision: ebDecision,
        calibratedProbability: Number(ebProb.toFixed(3)),
        confidenceScore: modelConfidence
      },
      takeoverRequired: {
        decision: takeoverProb > 0.5,
        calibratedProbability: Number(takeoverProb.toFixed(3)),
        confidenceScore: modelConfidence
      },
      safeToOvertake: {
        decision: safeOvertakeProb > 0.5,
        calibratedProbability: Number(safeOvertakeProb.toFixed(3)),
        confidenceScore: modelConfidence
      },
      pedestrianAlert: {
        decision: pedestrianDetected,
        calibratedProbability: pedestrianDetected ? Number((1 - sensorNoiseLevel).toFixed(2)) : 0.02,
        confidenceScore: modelConfidence
      },
      tacticalManeuver: {
        selected: bestManeuver,
        distribution,
        confidence: distribution[bestManeuver]
      },
      collisionRiskScore: {
        score: riskIndex,
        calibratedValue: riskIndex
      },
      comfortScore: {
        score: ebDecision ? 0.1 : bestManeuver === 'KEEP_LANE' ? 0.95 : 0.75,
        calibratedValue: ebDecision ? 0.1 : 0.85
      },
      governorTriggered: isGovernorTriggered,
      governorReason
    };
  }, [confidenceThreshold, weather]);

  // Main animation / physics tick
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const s = simState.current;
      const width = canvas.width;
      const height = canvas.height;
      const currentSpeedMs = egoSpeed / 3.6;

      // 1. Physics update
      if (isRunning) {
        const metersToPixels = 6.0;
        const forwardStepPixels = (currentSpeedMs * (1 / 60)) * metersToPixels;

        // Shift road texture & roadside objects to the LEFT (driving forward to the RIGHT)
        s.roadOffset += forwardStepPixels;
        s.distanceTraveled += currentSpeedMs * (1 / 60);

        // Spin wheels forward
        s.wheelAngle += (currentSpeedMs * 0.15);

        // Pedestrian & Crosswalk physics
        let pedDetected = false;
        let pedDistMeters = 999;

        if (s.pedestrian.active && s.crosswalk.active) {
          s.crosswalk.x -= forwardStepPixels;
          s.pedestrian.x = s.crosswalk.x;

          if (!s.pedestrian.crossed) {
            s.pedestrian.y += s.pedestrian.speedY;
            if (s.pedestrian.y >= s.pedestrian.targetY) {
              s.pedestrian.crossed = true;
            }
          }

          const distancePx = s.pedestrian.x - (s.egoX + 25);
          pedDistMeters = Math.max(0, distancePx / metersToPixels);

          if (distancePx > 0 && distancePx < 320) {
            pedDetected = true;
          }

          if (s.crosswalk.x < -80) {
            s.crosswalk.x = 750;
            s.pedestrian.x = 750;
            s.pedestrian.y = 65;
            s.pedestrian.crossed = false;
          }
        }

        // Animal / Wildlife crossing physics
        if (s.animal.active) {
          s.animal.x -= forwardStepPixels;
          if (!s.animal.crossed) {
            s.animal.y += s.animal.speedY;
            if (s.animal.y >= s.animal.targetY) {
              s.animal.crossed = true;
            }
          }
          const animalDistPx = s.animal.x - (s.egoX + 25);
          const animalDistMeters = Math.max(0, animalDistPx / metersToPixels);
          if (animalDistPx > 0 && animalDistPx < 320) {
            pedDetected = true;
            pedDistMeters = Math.min(pedDistMeters, animalDistMeters);
          }
          if (s.animal.x < -80) {
            s.animal.x = 750;
            s.animal.y = 40;
            s.animal.crossed = false;
          }
        }

        // Obstacles (Vehicles, Debris, Sirens) Physics
        let leadObstacle: SimulationObstacle | null = null;
        let minObstacleDistPx = 9999;

        for (const obs of s.obstacles) {
          const obsSpeedMs = obs.speedKmh / 3.6;
          const relSpeedMs = obsSpeedMs - currentSpeedMs;
          const obsDeltaPx = (relSpeedMs * (1 / 60)) * metersToPixels;
          obs.x += obsDeltaPx;

          if (obs.lane === s.egoLane && obs.x > (s.egoX + 15)) {
            const distPx = obs.x - (s.egoX + 25);
            if (distPx < minObstacleDistPx) {
              minObstacleDistPx = distPx;
              leadObstacle = obs;
            }
          }

          // Loop wrapping based on obstacle nature
          if (obs.type === 'TRACTOR') {
            if (obs.x < s.egoX - 320) {
              obs.x = width + 220;
            }
          } else if (obs.reverseHeading || obs.speedKmh < 0) {
            if (obs.x < -120) {
              obs.x = width + 280 + Math.random() * 80;
            }
          } else if (obs.type === 'AMBULANCE') {
            if (obs.x > width + 240) {
              obs.x = -150;
            }
          } else if (obs.type === 'CRASHED_CAR' || obs.type === 'DEBRIS') {
            if (obs.x < -160) {
              obs.x = width + 260 + Math.random() * 120;
            }
          } else {
            if (obs.x < -120) {
              obs.x = width + 150 + Math.random() * 200;
            } else if (obs.x > width + 350) {
              obs.x = -80;
            }
          }
        }

        // Spawn and update smoke for crashed cars
        s.obstacles.forEach(obs => {
          if (obs.type === 'CRASHED_CAR' && Math.random() < 0.3) {
            s.crashedSmoke.push({
              x: obs.x + (Math.random() - 0.5) * 16,
              y: s.laneY[obs.lane] + (obs.yOffset || 0) - 8,
              radius: 3 + Math.random() * 3,
              alpha: 0.65,
              vy: 0.4 + Math.random() * 0.4
            });
          }
        });

        for (let i = s.crashedSmoke.length - 1; i >= 0; i--) {
          const sm = s.crashedSmoke[i];
          sm.x -= forwardStepPixels * 0.6;
          sm.y -= sm.vy;
          sm.radius += 0.22;
          sm.alpha -= 0.016;
          if (sm.alpha <= 0) {
            s.crashedSmoke.splice(i, 1);
          }
        }

        const frontDistMeters = leadObstacle !== null 
          ? (minObstacleDistPx / metersToPixels) 
          : 85.0;
        const leadSpeedKmh = leadObstacle !== null ? leadObstacle.speedKmh : 80;
        const relSpeedKmh = egoSpeed - leadSpeedKmh;
        const relSpeedMs = relSpeedKmh / 3.6;
        const ttc = (relSpeedMs > 0.1 && frontDistMeters > 0) ? (frontDistMeters / relSpeedMs) : 99;

        const isCurvedPreset = selectedPreset === 'CURVED_TWOWAY_OVERTAKE';
        const phaseVal = Math.sin((s.egoX + s.roadOffset * 0.7) * 0.007);
        const solidLineNow = isCurvedPreset ? (phaseVal > 0.15) : false;

        // Check clear lanes
        const leftLaneBlocked = s.obstacles.some(o => {
          if (o.lane !== s.egoLane - 1) return false;
          const safetyBuffer = o.reverseHeading ? 280 : 90;
          return (o.x > s.egoX - 40 && o.x < s.egoX + safetyBuffer);
        });
        const rightLaneBlocked = s.obstacles.some(o => o.lane === s.egoLane + 1 && Math.abs(o.x - s.egoX) < 90);

        const oncomingObs = s.obstacles.find(o => o.lane === 0 && o.reverseHeading);
        const oncomingDistM = oncomingObs ? Math.max(0, (oncomingObs.x - s.egoX) / metersToPixels) : 999;
        const oncomingRelSpeed = oncomingObs ? (egoSpeed + Math.abs(oncomingObs.speedKmh)) : 0;
        const oncomingTtc = (oncomingDistM > 0 && oncomingRelSpeed > 1) 
          ? (oncomingDistM / (oncomingRelSpeed / 3.6)) 
          : 99;

        const tractorObs = s.obstacles.find(o => o.type === 'TRACTOR');
        const egoAheadOfTractor = tractorObs ? (s.egoX > tractorObs.x + 35) : false;

        let overtakePhase: 'FOLLOWING' | 'AWAITING_GAP' | 'OVERTAKING' | 'RETURNING' | 'CRUISE' = 'CRUISE';
        if (isCurvedPreset) {
          if (s.egoLane === 1) {
            if (tractorObs && !egoAheadOfTractor) {
              overtakePhase = (leftLaneBlocked || solidLineNow) ? 'AWAITING_GAP' : 'FOLLOWING';
            } else {
              overtakePhase = 'CRUISE';
            }
          } else if (s.egoLane === 0) {
            overtakePhase = egoAheadOfTractor ? 'RETURNING' : 'OVERTAKING';
          }
        }

        const latAcc = isCurvedPreset 
          ? Number((Math.pow(currentSpeedMs, 2) / 220).toFixed(2)) 
          : 0.0;
        const sightDist = isCurvedPreset 
          ? Math.round(75 - Math.abs(phaseVal) * 25) 
          : 120;

        const telemetry: VehicleTelemetry = {
          speedKmh: Math.round(egoSpeed),
          targetSpeedKmh: 80,
          lane: s.egoLane,
          laneOffset: (s.currentY - s.laneY[s.egoLane]) / 35,
          heading: 0,
          distanceToFrontObstacle: Math.round(frontDistMeters * 10) / 10,
          frontRelativeSpeedKmh: Math.round(relSpeedKmh * 10) / 10,
          timeToCollision: Math.round(ttc * 10) / 10,
          pedestrianDetected: pedDetected,
          pedestrianDistance: Math.round(pedDistMeters * 10) / 10,
          leftLaneClear: s.egoLane > 0 && !leftLaneBlocked,
          rightLaneClear: s.egoLane < 2 && !rightLaneBlocked,
          weatherCondition: weather,
          sensorNoiseLevel: sensorNoise,
          roadCurvature: isCurvedPreset ? {
            isCurvedRoad: true,
            radiusM: 220,
            lateralAccMs2: latAcc,
            sightDistanceM: sightDist,
            oncomingDistanceM: Math.round(oncomingDistM * 10) / 10,
            oncomingTtcSec: Math.round(oncomingTtc * 10) / 10,
            solidLineActive: solidLineNow,
            overtakePhase
          } : undefined
        };

        // Evaluate decision with Jev System One
        const decision = evaluateJevDecision(telemetry);
        s.lastDecision = decision;
        s.governorTriggered = decision.governorTriggered;

        // Actuation execution based on Jev decision
        if (decision.governorTriggered) {
          // Safety Governor triggers Minimum Risk Maneuver (MRM - Safe Stop)
          setEgoSpeed(prev => Math.max(0, prev - 2.8));
        } else if (decision.emergencyBrake.decision || decision.tacticalManeuver.selected === 'EMERGENCY_STOP') {
          // Full emergency brake (AEB)
          setEgoSpeed(prev => Math.max(0, prev - 4.5));
        } else if (decision.tacticalManeuver.selected === 'SLOW_DOWN') {
          setEgoSpeed(prev => Math.max(leadSpeedKmh - 5, prev - 1.5));
        } else if (decision.tacticalManeuver.selected === 'CHANGE_LEFT' && s.egoLane > 0 && telemetry.leftLaneClear) {
          s.egoTargetLane = s.egoLane - 1;
        } else if (decision.tacticalManeuver.selected === 'CHANGE_RIGHT' && s.egoLane < 2 && telemetry.rightLaneClear) {
          s.egoTargetLane = s.egoLane + 1;
        } else if (decision.tacticalManeuver.selected === 'KEEP_LANE') {
          const targetCruise = (isCurvedPreset && s.egoLane === 0) ? 75 : 80;
          if (egoSpeed < targetCruise) setEgoSpeed(prev => Math.min(targetCruise, prev + 0.9));
        }

        // Smooth lane change physics
        s.egoLane = s.egoTargetLane;
        s.targetY = s.laneY[s.egoLane];
        s.currentY += (s.targetY - s.currentY) * 0.12;

        // Update wind streaks streaming backwards (to the left)
        s.windLines.forEach(line => {
          line.x -= (currentSpeedMs * 0.8 + line.speed);
          if (line.x < -line.length) {
            line.x = width + 50 + Math.random() * 100;
            line.y = 65 + Math.random() * 200;
          }
        });

        // Pass telemetry to parent UI
        onTelemetryUpdate(telemetry, decision);
      }

      // ==========================================
      // 2. CANVAS RENDERING
      // ==========================================

      // Road background (Dark asphalt)
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);

      // Grass / Verge borders
      ctx.fillStyle = '#064e3b'; // dark forest green
      ctx.fillRect(0, 0, width, 40);
      ctx.fillRect(0, 290, width, height - 290);

      // Road curb / shoulders
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 40, width, 18);
      ctx.fillRect(0, 272, width, 18);

      // Solid edge shoulder lines (White)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 58, width, 3);
      ctx.fillRect(0, 269, width, 3);

      // Roadside Reflective Bollards / Delineators (Moving to the LEFT!)
      const bollardSpacing = 70;
      const bollardOffset = s.roadOffset % bollardSpacing;
      for (let x = width + bollardSpacing - bollardOffset; x >= -bollardSpacing; x -= bollardSpacing) {
        // Top bollard
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x - 3, 26, 6, 12);
        ctx.fillStyle = '#ef4444'; // Red reflector
        ctx.fillRect(x - 3, 29, 6, 4);

        // Bottom bollard
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x - 3, 292, 6, 12);
        ctx.fillStyle = '#ef4444'; // Red reflector
        ctx.fillRect(x - 3, 295, 6, 4);
      }

      // 3 Lanes Dashed Road Markings (Moving RIGHT to LEFT)
      const dashLength = 35;
      const gapLength = 30;
      const totalPattern = dashLength + gapLength;
      const patternOffset = s.roadOffset % totalPattern;
      ctx.fillStyle = '#94a3b8';

      // Divider 1 (between lane 0 and 1, Y = 130)
      for (let x = width + totalPattern - patternOffset; x >= -totalPattern; x -= totalPattern) {
        ctx.fillRect(x - dashLength, 128, dashLength, 4);
      }

      // Divider 2 (between lane 1 and 2, Y = 200)
      for (let x = width + totalPattern - patternOffset; x >= -totalPattern; x -= totalPattern) {
        ctx.fillRect(x - dashLength, 198, dashLength, 4);
      }

      // Crosswalk moving to the LEFT with the road
      if (s.crosswalk.active) {
        const cwX = s.crosswalk.x;
        ctx.fillStyle = '#f8fafc';
        for (let y = 62; y < 265; y += 22) {
          ctx.fillRect(cwX - 16, y, 32, 12);
        }

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(cwX, 22, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('🚶', cwX - 6, 26);
      }

      // Draw Pedestrian
      if (s.pedestrian.active) {
        ctx.save();
        ctx.translate(s.pedestrian.x, s.pedestrian.y);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('PEDESTRIAN', -30, -14);

        ctx.restore();
      }

      // Draw Animal / Wildlife Crossing
      if (s.animal.active) {
        ctx.save();
        ctx.translate(s.animal.x, s.animal.y);

        // Deer body (Warm amber-brown)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck & Head
        ctx.beginPath();
        ctx.ellipse(12, -6, 7, 5, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Antlers
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, -10);
        ctx.lineTo(18, -17);
        ctx.moveTo(18, -14);
        ctx.lineTo(22, -16);
        ctx.moveTo(12, -10);
        ctx.lineTo(10, -17);
        ctx.stroke();

        // Legs
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-8, 6);
        ctx.lineTo(-10, 15);
        ctx.moveTo(8, 6);
        ctx.lineTo(10, 15);
        ctx.stroke();

        // Glowing eye
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(15, -7, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Alert reticle
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('🦌 WILDLIFE', -26, -16);

        ctx.restore();
      }

      // Draw Crashed Car Smoke Particles
      s.crashedSmoke.forEach(p => {
        ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Wind / Speed Lines streaming backwards
      if (egoSpeed > 20) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1.2;
        s.windLines.forEach(wl => {
          ctx.beginPath();
          ctx.moveTo(wl.x, wl.y);
          ctx.lineTo(wl.x - wl.length, wl.y);
          ctx.stroke();
        });
      }

      // Draw Other Vehicles and Road Hazards (Obstacles)
      s.obstacles.forEach(obs => {
        const obsY = s.laneY[obs.lane] + (obs.yOffset || 0);
        ctx.save();
        ctx.translate(obs.x, obsY);

        if (obs.type === 'CRASHED_CAR') {
          // Crashed crumpled vehicle at an irregular collision angle
          ctx.rotate(0.22);
          ctx.fillStyle = '#991b1b'; // Crumpled red metal
          ctx.beginPath();
          ctx.roundRect(-24, -14, 48, 28, 4);
          ctx.fill();
          ctx.strokeStyle = '#450a0a';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Crushed hood/fender damage
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.moveTo(12, -14);
          ctx.lineTo(24, -4);
          ctx.lineTo(20, 12);
          ctx.lineTo(10, 6);
          ctx.closePath();
          ctx.fill();

          // Blinking hazard flashers (Dual amber sync)
          const hazardBlink = Math.floor(Date.now() / 320) % 2 === 0;
          if (hazardBlink) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-24, -13, 5, 5);
            ctx.fillRect(-24, 8, 5, 5);
            ctx.fillRect(19, -13, 5, 5);
            ctx.fillRect(19, 8, 5, 5);
          }

          // Road warning triangle behind the wreck
          ctx.rotate(-0.22);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(-42, 6);
          ctx.lineTo(-34, -7);
          ctx.lineTo(-26, 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('!', -35, 4);

          // Wreck label
          ctx.fillStyle = '#fca5a5';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(obs.label || 'COLLISION', -22, -18);

        } else if (obs.type === 'DEBRIS') {
          // Lost highway cargo & blown tire tread
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.roundRect(-16, -12, 32, 24, 3);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Hazard diagonal caution stripes
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-12, -10, 4, 20);
          ctx.fillRect(-4, -10, 4, 20);
          ctx.fillRect(4, -10, 4, 20);

          // Dashed safety warning perimeter
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(-22, -16, 44, 32);
          ctx.setLineDash([]);

          ctx.fillStyle = '#fcd34d';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('⚠️ DEBRIS', -22, -20);

        } else if (obs.type === 'AMBULANCE') {
          // Emergency Vehicle (Ambulance / Fire Rescue)
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.roundRect(-32, -16, 64, 32, 5);
          ctx.fill();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Red chevron stripe
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-30, -2, 60, 4);

          // Red medical cross
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-5, -11, 4, 9);
          ctx.fillRect(-8, -8, 10, 3);

          // Alternating Blue/Red emergency roof strobe lights
          const isBlueStrobe = Math.floor(Date.now() / 130) % 2 === 0;
          ctx.fillStyle = isBlueStrobe ? '#38bdf8' : '#ef4444';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();

          // Strobe illumination aura
          ctx.fillStyle = isBlueStrobe ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)';
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.fill();

          // Headlights
          ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
          ctx.beginPath();
          ctx.moveTo(32, -8);
          ctx.lineTo(85, -20);
          ctx.lineTo(85, 20);
          ctx.lineTo(32, 8);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('🚨 AMBULANCE 112', -34, -20);

        } else if (obs.reverseHeading) {
          // Wrong-Way Driver (Heading LEFT towards Ego car!)
          ctx.fillStyle = '#dc2626'; // High-alert red sports coupe
          ctx.beginPath();
          ctx.roundRect(-24, -14, 48, 28, 6);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-10, -11, 16, 22);

          // Blinding headlights directed LEFT towards Ego!
          ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
          ctx.beginPath();
          ctx.moveTo(-24, -8);
          ctx.lineTo(-95, -22);
          ctx.lineTo(-95, 22);
          ctx.lineTo(-24, 8);
          ctx.closePath();
          ctx.fill();

          // Taillights on the right
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(20, -12, 4, 6);
          ctx.fillRect(20, 6, 4, 6);

          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('⚠️ WRONG WAY', -30, -20);

        } else if (obs.type === 'TRUCK') {
          ctx.fillStyle = '#475569';
          ctx.fillRect(-45, -18, 90, 36);
          ctx.fillStyle = '#334155';
          ctx.fillRect(25, -16, 22, 32);
          ctx.strokeStyle = '#64748b';
          ctx.strokeRect(-45, -18, 90, 36);

          // Taillights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-45, -14, 4, 8);
          ctx.fillRect(-45, 6, 4, 8);

          // Headlights
          ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
          ctx.beginPath();
          ctx.moveTo(47, -8);
          ctx.lineTo(95, -18);
          ctx.lineTo(95, 18);
          ctx.lineTo(47, 8);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '10px monospace';
          ctx.fillText(`${obs.speedKmh} km/h`, -18, -22);

        } else {
          // Standard Passenger Car
          ctx.fillStyle = '#2563eb';
          ctx.beginPath();
          ctx.roundRect(-24, -14, 48, 28, 6);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-6, -11, 16, 22);

          // Taillights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-24, -12, 4, 6);
          ctx.fillRect(-24, 6, 4, 6);

          // Headlights
          ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
          ctx.beginPath();
          ctx.moveTo(25, -8);
          ctx.lineTo(80, -18);
          ctx.lineTo(80, 18);
          ctx.lineTo(25, 8);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '10px monospace';
          ctx.fillText(`${obs.speedKmh} km/h`, -18, -20);
        }

        ctx.restore();
      });

      // Draw Sensor FOV Cone (LiDAR / Radar) shining FORWARD from Ego Car
      if (showSensorBeams) {
        const beamStartX = s.egoX + 30;
        const beamStartY = s.currentY;
        const beamRange = 250;

        const beamGradient = ctx.createRadialGradient(
          beamStartX, beamStartY, 15,
          beamStartX, beamStartY, beamRange
        );

        if (s.governorTriggered) {
          beamGradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
          beamGradient.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
        } else if (s.lastDecision?.emergencyBrake.decision) {
          beamGradient.addColorStop(0, 'rgba(249, 115, 22, 0.5)');
          beamGradient.addColorStop(1, 'rgba(249, 115, 22, 0.02)');
        } else {
          beamGradient.addColorStop(0, 'rgba(56, 189, 248, 0.38)');
          beamGradient.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
        }

        ctx.fillStyle = beamGradient;
        ctx.beginPath();
        ctx.moveTo(beamStartX, beamStartY);
        ctx.arc(beamStartX, beamStartY, beamRange, -Math.PI / 6.5, Math.PI / 6.5);
        ctx.closePath();
        ctx.fill();

        const sweepPhase = (Date.now() / 450) % 1;
        ctx.strokeStyle = s.governorTriggered ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(beamStartX, beamStartY, 40 + sweepPhase * 200, -Math.PI / 6.5, Math.PI / 6.5);
        ctx.stroke();

        const closestTargetX = s.pedestrian.active ? s.pedestrian.x : (s.obstacles[0]?.x || 0);
        if (closestTargetX > s.egoX && closestTargetX < s.egoX + 300) {
          ctx.strokeStyle = s.lastDecision?.emergencyBrake.decision ? '#ef4444' : '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(s.egoX + 28, s.currentY);
          ctx.lineTo(closestTargetX, s.currentY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ==========================================
      // Draw EGO CAR (System One Autonomous Vehicle)
      // ==========================================
      ctx.save();
      ctx.translate(s.egoX, s.currentY);

      // Chassis shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(-26, -15, 56, 30, 8);
      ctx.fill();

      // 4 Rotating Wheels / Tires
      const wheelPositions = [
        { x: -16, y: -16 },
        { x: 16, y: -16 },
        { x: -16, y: 16 },
        { x: 16, y: 16 },
      ];

      wheelPositions.forEach(w => {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-6, -3, 12, 6);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(s.wheelAngle) * 4, Math.sin(s.wheelAngle) * 2);
        ctx.lineTo(-Math.cos(s.wheelAngle) * 4, -Math.sin(s.wheelAngle) * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Car Body
      ctx.fillStyle = s.governorTriggered 
        ? '#b91c1c' 
        : s.lastDecision?.emergencyBrake.decision 
        ? '#c2410c' 
        : '#0d9488';
      ctx.beginPath();
      ctx.roundRect(-24, -13, 50, 26, 6);
      ctx.fill();
      ctx.strokeStyle = s.governorTriggered ? '#f87171' : '#2dd4bf';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Front Hood & Aerodynamic Nose Cone (Facing RIGHT)
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.moveTo(16, -12);
      ctx.lineTo(26, -6);
      ctx.lineTo(26, 6);
      ctx.lineTo(16, 12);
      ctx.closePath();
      ctx.fill();

      // Cockpit / Glass Roof
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(-10, -9, 24, 18, 4);
      ctx.fill();

      // Jev Sensor Puck on roof
      ctx.fillStyle = s.governorTriggered ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Headlight Beams
      ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.beginPath();
      ctx.moveTo(26, -9);
      ctx.lineTo(135, -28);
      ctx.lineTo(135, 28);
      ctx.lineTo(26, 9);
      ctx.closePath();
      ctx.fill();

      // Brake Lights
      const isBraking = s.lastDecision?.emergencyBrake.decision || 
                        s.lastDecision?.tacticalManeuver.selected === 'SLOW_DOWN' ||
                        s.lastDecision?.tacticalManeuver.selected === 'EMERGENCY_STOP' ||
                        s.governorTriggered;

      if (isBraking) {
        ctx.fillStyle = '#ff1111';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillRect(-25, -12, 4, 7);
        ctx.fillRect(-25, 5, 4, 7);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-25, -11, 3, 5);
        ctx.fillRect(-25, 6, 3, 5);
      }

      // Turn Signals
      if (s.lastDecision?.tacticalManeuver.selected === 'CHANGE_LEFT' && (Date.now() % 500 < 250)) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(18, -14, 5, 3);
        ctx.fillRect(-18, -14, 5, 3);
      } else if (s.lastDecision?.tacticalManeuver.selected === 'CHANGE_RIGHT' && (Date.now() % 500 < 250)) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(18, 11, 5, 3);
        ctx.fillRect(-18, 11, 5, 3);
      }

      // Direction Arrow on roof
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-3, -3);
      ctx.lineTo(4, 0);
      ctx.lineTo(-3, 3);
      ctx.closePath();
      ctx.fill();

      // Vehicle Tag
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SYSTEM 1 EGO', -28, -18);

      ctx.restore();

      // Weather Overlays
      if (weather === 'RAIN') {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.lineWidth = 1.4;
        s.particles.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 5, p.y + p.length);
          ctx.stroke();
          p.y += p.speed;
          p.x -= (currentSpeedMs * 0.4);
          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * (width + 100);
          }
        });
      } else if (weather === 'DENSE_FOG') {
        const fog = ctx.createLinearGradient(0, 0, width, 0);
        fog.addColorStop(0, 'rgba(203, 213, 225, 0.15)');
        fog.addColorStop(0.3, 'rgba(203, 213, 225, 0.45)');
        fog.addColorStop(0.7, 'rgba(203, 213, 225, 0.7)');
        fog.addColorStop(1, 'rgba(203, 213, 225, 0.85)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('⚠️ SENSOR DEGRADATION (RLCD UNCERTAINTY)', width - 295, 25);
      }

      // Top HUD: Forward Motion Direction Banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(10, 10, 240, 56, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`SPEED: ${Math.round(egoSpeed)} km/h`, 18, 27);
      ctx.fillStyle = s.lastDecision?.emergencyBrake.decision ? '#f87171' : '#a7f3d0';
      ctx.fillText(`MANEUVER: ${s.lastDecision?.tacticalManeuver.selected || 'INITIALIZING'}`, 18, 43);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`HEADING:  >>> FORWARD >>>`, 18, 57);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, egoSpeed, weather, sensorNoise, showSensorBeams, evaluateJevDecision, onTelemetryUpdate]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top bar with scenario selector and simulation control */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-200 tracking-wide">
            SYSTEM ONE — AUTONOMOUS VEHICLE SIMULATOR
          </span>
          <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
            System One (1.5ms Local Pass)
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isRunning 
                ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          
          <button
            onClick={() => applyPreset(selectedPreset)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-slate-700"
            title="Reset current scenario"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={() => setShowSensorBeams(!showSensorBeams)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition border ${
              showSensorBeams 
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle LiDAR / Radar cone"
          >
            <Zap className="w-3.5 h-3.5" />
            LiDAR/Radar
          </button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div className="relative w-full bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={330}
          className="w-full max-w-4xl h-auto rounded-lg shadow-inner bg-slate-900 border border-slate-800/80"
        />
      </div>

      {/* Preset scenario bar & weather/noise controls */}
      <div className="bg-slate-950/90 p-4 border-t border-slate-800 flex flex-col gap-4">
        {/* Scenarios */}
        <div>
          <div className="text-xs uppercase font-mono text-slate-400 tracking-wider mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {lang === 'pl' 
                  ? 'Zdarzenia drogowe i scenariusze testowe dla System One (arXiv:2609.29429):' 
                  : 'Traffic Event Scenarios for System One Decision Engine (arXiv:2609.29429):'}
              </span>
            </div>
            <span className="text-[11px] text-cyan-400 font-mono">
              10 {lang === 'pl' ? 'Scenariuszy Zdarzeń' : 'Road Events'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {[
              { 
                id: 'HIGHWAY_CRUISE', 
                label: lang === 'pl' ? '1. Płynna jazda autostradowa' : '1. Smooth Highway Cruise', 
                desc: lang === 'pl' ? 'Płynna jazda 80 km/h w standardowym ruchu' : 'Cruise forward at 80 km/h in clear lane',
                badge: lang === 'pl' ? 'Ruch standardowy' : 'Traffic Flow',
                badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800'
              },
              { 
                id: 'CUT_IN_VEHICLE', 
                label: lang === 'pl' ? '2. Zajechanie drogi (Cut-In)' : '2. Aggressive Cut-In', 
                desc: lang === 'pl' ? 'Sąsiednie auto gwałtownie ścina pas przed maską' : 'Adjacent car cuts into lane with low TTC',
                badge: lang === 'pl' ? 'Konflikt pasa' : 'Cut-In',
                badgeColor: 'bg-amber-950 text-amber-300 border-amber-800'
              },
              { 
                id: 'SLOW_TRUCK_OVERTAKE', 
                label: lang === 'pl' ? '3. Wyprzedzanie ciężarówki' : '3. Slow Truck Overtake', 
                desc: lang === 'pl' ? 'Wolny tir 38 km/h, System One wyprzedza lewym pasem' : 'Slow freight truck, safe left pass maneuver',
                badge: lang === 'pl' ? 'Manewr' : 'Overtake',
                badgeColor: 'bg-blue-950 text-blue-300 border-blue-800'
              },
              { 
                id: 'EMERGENCY_PEDESTRIAN', 
                label: lang === 'pl' ? '4. Pieszy na przejściu' : '4. Jaywalking Pedestrian', 
                desc: lang === 'pl' ? 'Wtargnięcie pieszego, natychmiastowe hamowanie AEB' : 'Crosswalk hazard, calibrated emergency brake',
                badge: lang === 'pl' ? 'Pieszy' : 'Pedestrian',
                badgeColor: 'bg-rose-950 text-rose-300 border-rose-800'
              },
              { 
                id: 'ANIMAL_CROSSING', 
                label: lang === 'pl' ? '5. Wtargnięcie zwierzyny' : '5. Wildlife Crossing', 
                desc: lang === 'pl' ? 'Sarna wybiega z pobocza na pas, awaryjny stop' : 'Forest deer darts into roadway, urgent stop',
                badge: lang === 'pl' ? 'Dzika zwierzyna' : 'Wildlife',
                badgeColor: 'bg-orange-950 text-orange-300 border-orange-800'
              },
              { 
                id: 'MULTI_CAR_PILEUP', 
                label: lang === 'pl' ? '6. Karambol autostradowy' : '6. Multi-Car Pileup', 
                desc: lang === 'pl' ? 'Rozbite auta na pasach 0 i 1, ominięcie pasem 2' : 'Severe collision blocking lanes 0 & 1, evade right',
                badge: lang === 'pl' ? 'Wypadek' : 'Critical Crash',
                badgeColor: 'bg-red-950 text-red-300 border-red-700'
              },
              { 
                id: 'DEBRIS_SWERVE', 
                label: lang === 'pl' ? '7. Zagubiony ładunek / Opona' : '7. Cargo Debris Swerve', 
                desc: lang === 'pl' ? 'Rozerwana opona i skrzynia na pasie, ominięcie w lewo' : 'Blown tire carcass & cargo in lane, swerve left',
                badge: lang === 'pl' ? 'Przeszkoda' : 'Road Hazard',
                badgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-800'
              },
              { 
                id: 'GHOST_DRIVER_HEADON', 
                label: lang === 'pl' ? '8. Pojazd pod prąd (Ghost)' : '8. Wrong-Way Ghost Driver', 
                desc: lang === 'pl' ? 'Rogue car pod prąd (zbliżanie >150 km/h), natychmiastowa ucieczka' : 'Oncoming car head-on (>150 km/h closure), escape maneuver',
                badge: lang === 'pl' ? 'Pod prąd' : 'Wrong-Way',
                badgeColor: 'bg-red-950 text-red-300 border-red-600'
              },
              { 
                id: 'EMERGENCY_VEHICLE_YIELD', 
                label: lang === 'pl' ? '9. Korytarz życia (Karetka)' : '9. Emergency Siren Corridor', 
                desc: lang === 'pl' ? 'Karetka na sygnale 125 km/h, zjazd na prawy pas' : 'Ambulance approaching at 125 km/h, yield right',
                badge: lang === 'pl' ? 'Pojazd uprzyw.' : 'Siren Yield',
                badgeColor: 'bg-sky-950 text-sky-300 border-sky-700'
              },
              { 
                id: 'FOG_UNCERTAINTY', 
                label: lang === 'pl' ? '10. Mgła i szum sensorów' : '10. Fog & Sensor Variance', 
                desc: lang === 'pl' ? 'Spadek pewności poniżej 65% -> Bezpieczny Stop (MRM)' : 'Epistemic noise drops confidence -> Safe Stop (MRM)',
                badge: lang === 'pl' ? 'Niepewność' : 'Sensor Noise',
                badgeColor: 'bg-purple-950 text-purple-300 border-purple-800'
              }
            ].map(sc => (
              <button
                key={sc.id}
                onClick={() => {
                  onPresetChange(sc.id as ScenarioPreset);
                  applyPreset(sc.id as ScenarioPreset);
                }}
                className={`p-2.5 text-left rounded-lg transition border text-xs flex flex-col gap-1.5 ${
                  selectedPreset === sc.id
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50 shadow-md'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold truncate">{sc.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono shrink-0 ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 leading-tight line-clamp-2">{sc.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic environmental sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs">
          {/* Weather condition */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              Atmospheric Conditions:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setWeather('CLEAR'); setSensorNoise(0.04); }}
                className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1 border ${
                  weather === 'CLEAR' ? 'bg-slate-800 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={() => { setWeather('RAIN'); setSensorNoise(0.18); }}
                className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1 border ${
                  weather === 'RAIN' ? 'bg-slate-800 text-sky-300 border-sky-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" /> Rain
              </button>
              <button
                onClick={() => { setWeather('DENSE_FOG'); setSensorNoise(0.48); }}
                className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1 border ${
                  weather === 'DENSE_FOG' ? 'bg-slate-800 text-purple-300 border-purple-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <CloudFog className="w-3.5 h-3.5" /> Dense Fog
              </button>
            </div>
          </div>

          {/* Sensor Noise slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-slate-400">
              <span className="font-medium">Sensor Noise Level:</span>
              <span className="font-mono text-cyan-400">{(sensorNoise * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.8"
              step="0.05"
              value={sensorNoise}
              onChange={(e) => setSensorNoise(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Simulates radar/camera noise & epistemic variance</span>
          </div>

          {/* Confidence safety governor threshold */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-slate-400">
              <span className="font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Safety Governor Threshold (RLCD):
              </span>
              <span className="font-mono text-amber-400">{(confidenceThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Below threshold: triggers Minimum Risk Maneuver (MRM)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
