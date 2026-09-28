"""
car_environment.py — Autonomous Car Simulation Environment for System One
========================================================================================
Simulates longitudinal vehicle physics, radar/LiDAR sensing, and multi-lane obstacle interactions.
"""

from typing import Dict, Any, Tuple


class AutonomousCarEnvironment:
    def __init__(self, scenario_name: str = "HIGHWAY"):
        self.scenario_name = scenario_name
        self.time_step = 0.1 # 10 Hz
        self.reset()

    def reset(self):
        self.speed_kmh = 75.0
        self.target_speed_kmh = 90.0
        self.current_lane = 1
        self.distance_traveled = 0.0
        self.step_count = 0

        self.front_obstacle_dist = 65.0
        self.front_obstacle_speed = 60.0
        self.pedestrian_detected = False
        self.pedestrian_distance = 150.0
        self.left_lane_clear = True
        self.right_lane_clear = True
        self.weather = "CLEAR"
        self.sensor_noise = 0.04

        self._setup_scenario()
        return self.get_telemetry()

    def _setup_scenario(self):
        if self.scenario_name == "EMERGENCY_PEDESTRIAN":
            self.pedestrian_detected = True
            self.pedestrian_distance = 32.0
            self.front_obstacle_dist = 120.0
            self.speed_kmh = 50.0
        elif self.scenario_name == "CUT_IN":
            self.front_obstacle_dist = 18.0
            self.front_obstacle_speed = 45.0
            self.speed_kmh = 85.0
        elif self.scenario_name == "FOG_SENSOR_FAIL":
            self.weather = "DENSE_FOG"
            self.sensor_noise = 0.45
            self.front_obstacle_dist = 40.0
        elif self.scenario_name == "SLOW_TRUCK":
            self.front_obstacle_dist = 30.0
            self.front_obstacle_speed = 35.0
            self.left_lane_clear = True
        elif self.scenario_name == "MULTI_CAR_PILEUP":
            self.front_obstacle_dist = 38.0
            self.front_obstacle_speed = 0.0
            self.left_lane_clear = False
            self.right_lane_clear = True
            self.speed_kmh = 85.0
        elif self.scenario_name == "DEBRIS_SWERVE":
            self.front_obstacle_dist = 42.0
            self.front_obstacle_speed = 0.0
            self.left_lane_clear = True
            self.speed_kmh = 80.0
        elif self.scenario_name == "GHOST_DRIVER":
            self.front_obstacle_dist = 60.0
            self.front_obstacle_speed = -75.0
            self.speed_kmh = 75.0
            self.right_lane_clear = True
        elif self.scenario_name == "EMERGENCY_VEHICLE":
            self.front_obstacle_dist = 80.0
            self.front_obstacle_speed = 75.0
            self.right_lane_clear = True
        elif self.scenario_name == "ANIMAL_CROSSING":
            self.pedestrian_detected = True
            self.pedestrian_distance = 35.0
            self.front_obstacle_dist = 100.0
            self.speed_kmh = 70.0

    def get_telemetry(self) -> Dict[str, Any]:
        rel_speed_kmh = self.speed_kmh - self.front_obstacle_speed
        rel_speed_ms = rel_speed_kmh / 3.6
        ttc = 99.0
        if rel_speed_ms > 0.1 and self.front_obstacle_dist > 0:
            ttc = self.front_obstacle_dist / rel_speed_ms

        return {
            "speed_kmh": round(self.speed_kmh, 1),
            "target_speed_kmh": self.target_speed_kmh,
            "current_lane": self.current_lane,
            "front_distance_m": round(self.front_obstacle_dist, 1),
            "front_relative_speed_kmh": round(rel_speed_kmh, 1),
            "time_to_collision_sec": round(ttc, 2),
            "pedestrian_detected": self.pedestrian_detected,
            "pedestrian_distance_m": round(self.pedestrian_distance, 1),
            "left_lane_clear": self.left_lane_clear,
            "right_lane_clear": self.right_lane_clear,
            "weather": self.weather,
            "sensor_noise_level": round(self.sensor_noise, 3),
            "step": self.step_count
        }

    def step(self, actuation: Dict[str, float]) -> Tuple[Dict[str, Any], bool]:
        self.step_count += 1
        throttle = actuation.get("throttle", 0.0)
        brake = actuation.get("brake", 0.0)
        target_lane = actuation.get("target_lane", self.current_lane)

        acceleration = (throttle * 2.5) - (brake * 8.0)
        acceleration -= 0.01 * (self.speed_kmh / 3.6)

        new_speed_ms = max(0.0, (self.speed_kmh / 3.6) + acceleration * self.time_step)
        self.speed_kmh = new_speed_ms * 3.6
        self.current_lane = target_lane

        if self.pedestrian_detected:
            self.pedestrian_distance -= (self.speed_kmh / 3.6) * self.time_step
            if self.pedestrian_distance <= 0:
                self.pedestrian_detected = False

        front_speed_ms = self.front_obstacle_speed / 3.6
        self.front_obstacle_dist += (front_speed_ms - new_speed_ms) * self.time_step
        self.front_obstacle_dist = max(0.5, self.front_obstacle_dist)

        collision = (self.front_obstacle_dist < 1.0) or (self.pedestrian_detected and self.pedestrian_distance < 1.0)
        done = collision or (self.speed_kmh <= 0.1 and brake > 0.5) or (self.step_count >= 100)

        return self.get_telemetry(), done
