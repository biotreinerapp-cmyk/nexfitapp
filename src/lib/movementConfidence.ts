import type { LocationTrackerMode, LocationTrackerOptions } from "@/services/locationTracker";

export type MovementConfidenceParams = {
  mode: LocationTrackerMode;
  /** Consecutive accepted points required before considering the user moving (PWA-safe: no GPS timestamps) */
  minAcceptedPointsToMove: number;
  /** Consecutive rejected points required before considering the user stopped (PWA-safe: no GPS timestamps) */
  minRejectedPointsToStop: number;
  /** Kept for compatibility/debug, but NOT used for confirmation in PWA */
  minMovingConfirmSeconds: number;
  /** Kept for compatibility/debug, but NOT used for confirmation in PWA */
  minStopConfirmSeconds: number;
  /** Minimum distance (meters) before pace is computed/shown */
  minDistanceBeforePaceMeters: number;
  /** Overrides for LocationTracker anti-drift thresholds */
  trackerOverrides: Pick<LocationTrackerOptions, "minSpeedMps" | "minStepMeters">;
};

// Values chosen per the user's specification (ranges picked to be safe defaults).
export const getMovementConfidenceParams = (mode: LocationTrackerMode): MovementConfidenceParams => {
  if (mode === "caminhada") {
    return {
      mode,
      minAcceptedPointsToMove: 4,
      minRejectedPointsToStop: 6,
      minMovingConfirmSeconds: 12,
      minStopConfirmSeconds: 15,
      minDistanceBeforePaceMeters: 150,
      trackerOverrides: {
        minSpeedMps: 0.6,
        minStepMeters: 8,
      },
    };
  }

  if (mode === "corrida") {
    return {
      mode,
      minAcceptedPointsToMove: 3,
      minRejectedPointsToStop: 5,
      minMovingConfirmSeconds: 7,
      minStopConfirmSeconds: 10,
      minDistanceBeforePaceMeters: 100,
      trackerOverrides: {
        minSpeedMps: 1.0,
        minStepMeters: 6,
      },
    };
  }

  // Fallback: close to the old defaults.
  return {
    mode,
    minAcceptedPointsToMove: 3,
    minRejectedPointsToStop: 5,
    minMovingConfirmSeconds: 8,
    minStopConfirmSeconds: 10,
    minDistanceBeforePaceMeters: 100,
    trackerOverrides: {
      minSpeedMps: 0.8,
      minStepMeters: 6,
    },
  };
};
