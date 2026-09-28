"""
run_simulation.py — Benchmark Runner for System One (RLCD System-1)
========================================================================================
Run with: python run_simulation.py
"""

import time
from car_environment import AutonomousCarEnvironment
from autonomous_agent import AutonomousVehicleController


def print_banner():
    print("=" * 84)
    print(" SYSTEM ONE AI CORE v4 (RLCD SYSTEM-1) — AUTONOMOUS DRIVING BENCHMARK")
    print(" Architecture: 7D Trajectory Control Vector + Hawkes Risk + Markowitz Top 8 Wheel")
    print(" Reference Paper: 'Just Ask Jev: Reinforcement Learning for Calibrated Decisions' (arXiv:2609.29429)")
    print("=" * 84)


def run_scenario(scenario_id: str, title: str):
    print(f"\n--- [TEST SCENARIO: {title}] ---")
    env = AutonomousCarEnvironment(scenario_name=scenario_id)
    agent = AutonomousVehicleController(confidence_threshold=0.60)
    telemetry = env.get_telemetry()

    print(f"Conditions: Weather={telemetry['weather']}, Sensor Noise={telemetry['sensor_noise_level']}, Speed={telemetry['speed_kmh']} km/h")
    print("-" * 84)
    print(f"{'STEP':<5} | {'SPEED':<8} | {'DIST':<8} | {'TTC':<6} | {'SYSTEM ONE':<16} | {'7D CONTROL VECTOR':<32} | {'SCORE'}")
    print("-" * 84)

    for step in range(1, 15):
        actuation, maneuver, governor = agent.process_cycle(telemetry)

        v7_short = f"[{maneuver.target_speed_kmh:.0f}km/h, a={maneuver.accel_decel_ms2:+.1f}, lane={maneuver.target_lane}]"

        print(
            f"{step:<5} | "
            f"{telemetry['speed_kmh']:<8.1f} | "
            f"{telemetry['front_distance_m']:<8.1f}m | "
            f"{telemetry['time_to_collision_sec']:<6.1f} | "
            f"{maneuver.tactical_mode:<16} | "
            f"{v7_short:<32} | "
            f"{maneuver.system_one_score:.1f}/100"
        )

        telemetry, done = env.step(actuation)
        if done:
            print(f"--> Scenario finished after {step} steps. Final Speed: {telemetry['speed_kmh']:.1f} km/h")
            break
        time.sleep(0.04)


def main():
    print_banner()

    scenarios = [
        ("EMERGENCY_PEDESTRIAN", "Jaywalking Pedestrian Crossing (Pedestrian at 32m, Speed=50 km/h)"),
        ("CUT_IN", "Highway Cut-In (Vehicle enters lane at 18m, critical TTC)"),
        ("SLOW_TRUCK", "Overtaking Slow Freight Truck (Passing in left lane)"),
        ("MULTI_CAR_PILEUP", "Highway Multi-Car Pileup (Lanes 0 & 1 blocked, evasive lane 2)"),
        ("DEBRIS_SWERVE", "Lost Highway Cargo Debris (Stationary tire carcass at 42m)"),
        ("GHOST_DRIVER", "Wrong-Way Rogue Driver (Head-on oncoming closure >150 km/h)"),
        ("EMERGENCY_VEHICLE", "Emergency Corridor Yield (Approaching Siren Ambulance 112)"),
        ("ANIMAL_CROSSING", "Sudden Wildlife Crossing (Deer bounds onto roadway at 35m)"),
        ("FOG_SENSOR_FAIL", "Dense Fog & Sensor Degradation (RLCD Uncertainty Test)"),
    ]

    for sc_id, sc_title in scenarios:
        run_scenario(sc_id, sc_title)

    print("\n" + "=" * 84)
    print("Conclusions from System One Core v4 Self-Driving Evaluation:")
    print("1. 7D Control Vectors: Encapsulates speed, acceleration, steering, lane, horizon, margin, and mode.")
    print("2. Hawkes Process: Quantifies recurring temporal hazards to prevent unsafe aggressive passing.")
    print("3. Markowitz Portfolio: Always provides 8 diverse calibrated fallback maneuvers in memory.")
    print("=" * 84)


if __name__ == "__main__":
    main()
