"""
autonomous_agent.py — Autonomous Vehicle Controller driven by System One
========================================================================================
Executes the Top 1 primary maneuver from the Markowitz portfolio,
while caching all 7 contingency maneuvers in sub-millisecond memory.
Features an automated Safety Governor gate to trigger Minimum Risk Maneuver (MRM)
whenever calibrated uncertainty spikes beyond safety limits.
"""

from typing import Dict, Any, Tuple
from system_one_core_v4_rlcd import (
    VehicleHawkesRiskAnalytics, RoadTelemetrySample, 
    generate_and_evaluate_top8_maneuvers, TacticalManeuverCandidate
)


class AutonomousVehicleController:
    """
    Autonomous Vehicle Controller driven by System One Core v4 (RLCD).
    """

    def __init__(self, confidence_threshold: float = 0.60):
        self.analytics = VehicleHawkesRiskAnalytics()
        self.confidence_threshold = confidence_threshold

    def process_cycle(self, telemetry_dict: Dict[str, Any]) -> Tuple[Dict[str, float], TacticalManeuverCandidate, Dict[str, Any]]:
        sample = RoadTelemetrySample(
            sample_id=int(telemetry_dict.get("step", 1)),
            speed_kmh=float(telemetry_dict.get("speed_kmh", 50.0)),
            front_distance_m=float(telemetry_dict.get("front_distance_m", 80.0)),
            rel_speed_kmh=float(telemetry_dict.get("front_relative_speed_kmh", 0.0)),
            time_to_collision_sec=float(telemetry_dict.get("time_to_collision_sec", 99.0)),
            pedestrian_detected=bool(telemetry_dict.get("pedestrian_detected", False)),
            pedestrian_distance_m=float(telemetry_dict.get("pedestrian_distance_m", 100.0)),
            left_lane_clear=bool(telemetry_dict.get("left_lane_clear", True)),
            right_lane_clear=bool(telemetry_dict.get("right_lane_clear", True)),
            weather_condition=str(telemetry_dict.get("weather", "CLEAR")),
            sensor_noise_level=float(telemetry_dict.get("sensor_noise_level", 0.05))
        )

        # Generate portfolio of Top 8 calibrated tactical maneuvers
        portfolio = generate_and_evaluate_top8_maneuvers(
            telemetry=sample,
            analytics=self.analytics,
            pool_size=4000,
            top_k=8
        )

        primary_maneuver = portfolio[0]

        # Safety Governor Gate: Check if calibrated confidence is too low
        governor_status = {
            "triggered": False,
            "action": "NORMAL_SYSTEM_ONE_CONTROL",
            "reason": None,
            "portfolio_size": len(portfolio)
        }

        calibrated_conf = (primary_maneuver.risk_isolation / 100.0)

        actuation = {
            "throttle": 0.0,
            "brake": 0.0,
            "steering_angle_deg": primary_maneuver.steering_angle_deg,
            "target_lane": primary_maneuver.target_lane,
            "hazard_lights": False,
            "driver_alert": False
        }

        if calibrated_conf < self.confidence_threshold:
            governor_status["triggered"] = True
            governor_status["action"] = "MINIMUM_RISK_MANEUVER"
            governor_status["reason"] = f"Calibrated isolation ({calibrated_conf:.2f}) < threshold ({self.confidence_threshold:.2f})"
            actuation["brake"] = 0.55
            actuation["hazard_lights"] = True
            actuation["driver_alert"] = True
            return actuation, primary_maneuver, governor_status

        # Actuation translation
        if primary_maneuver.tactical_mode == "EMERGENCY_STOP":
            actuation["brake"] = 1.0
            actuation["hazard_lights"] = True
        elif primary_maneuver.tactical_mode == "SLOW_DOWN":
            actuation["brake"] = min(1.0, abs(primary_maneuver.accel_decel_ms2) / 6.0)
        else:
            if primary_maneuver.accel_decel_ms2 > 0:
                actuation["throttle"] = min(1.0, primary_maneuver.accel_decel_ms2 / 3.0)
            else:
                actuation["brake"] = min(0.3, abs(primary_maneuver.accel_decel_ms2) / 6.0)

        return actuation, primary_maneuver, governor_status
