export type LocationPoint = {
  lat: number;
  lng: number;
  /** Geolocation accuracy radius in meters */
  accuracy: number;
  /** timestamp in ms */
  timestamp: number;
  /** speed in m/s (may be null/undefined depending on platform) */
  speed?: number | null;
};

export type LocationTrackerMode = "caminhada" | "corrida" | "ciclismo" | "trilha" | "default";

export type LocationTrackerOptions = {
  mode?: LocationTrackerMode;
  /** Points with accuracy above this are considered weak-signal and won't accumulate distance */
  maxAccuracyMeters?: number;
  /** Ignore samples arriving too quickly (noise / duplicates) */
  minDeltaSeconds?: number;
  /** Window size for light smoothing (median of last N acceptable points) */
  smoothingWindowSize?: number;
  /** Movement evidence when speed is available */
  minSpeedMps?: number;
  /** Anti-jump max plausible speed (implicit speed) */
  maxImplicitSpeedMps?: number;
  /** Dynamic step threshold: max(accuracy*factor, minMeters) */
  stepAccuracyFactor?: number;
  minStepMeters?: number;
};

export type LocationDecisionReason =
  | "accepted"
  | "weak_signal_accuracy"
  | "delta_too_small"
  | "first_point"
  | "invalid_distance"
  | "anti_jump"
  | "stationary_no_motion";

export type LocationIngestResult = {
  accepted: boolean;
  reason: LocationDecisionReason;
  signalWeak: boolean;
  deltaTimeSeconds: number;
  deltaDistMeters: number;
  /** Implied speed (m/s) from deltaDist/deltaTime */
  impliedSpeedMps: number | null;
  /** Best available speed (m/s) used in checks: coords.speed when present */
  reportedSpeedMps: number | null;
  /** Smoothed point (median) when available; otherwise the raw point */
  point: LocationPoint;
  isStationary: boolean;
};

const EARTH_RADIUS_M = 6371000;

const toRad = (v: number) => (v * Math.PI) / 180;

const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const defaultsForMode = (mode: LocationTrackerMode): Required<LocationTrackerOptions> => {
  // Defaults chosen to match the request (anti-drift first), but still usable for real devices.
  // Can be tuned later per activity.
  const base = {
    mode,
    maxAccuracyMeters: 25,
    minDeltaSeconds: 1,
    smoothingWindowSize: 5,
    minSpeedMps: 0.5, // Lowered slightly to capture slow walks, but relies on distance check
    maxImplicitSpeedMps: 12,
    stepAccuracyFactor: 0.5,
    minStepMeters: 5,
  } satisfies Required<LocationTrackerOptions>;

  if (mode === "caminhada") {
    return { ...base, maxImplicitSpeedMps: 3.5, minSpeedMps: 0.5 };
  }
  if (mode === "corrida") {
    return { ...base, maxImplicitSpeedMps: 12, minSpeedMps: 1.5 };
  }
  if (mode === "ciclismo") {
    return { ...base, maxImplicitSpeedMps: 25, minSpeedMps: 2.0 };
  }
  if (mode === "trilha") {
    return { ...base, maxImplicitSpeedMps: 8, minSpeedMps: 0.5 };
  }

  return base;
};

export class LocationTracker {
  private opts: Required<LocationTrackerOptions>;

  private lastSeenAt: number | null = null;
  private lastAccepted: LocationPoint | null = null;
  private acceptableWindow: LocationPoint[] = [];

  constructor(options?: LocationTrackerOptions) {
    const mode = options?.mode ?? "default";
    const base = defaultsForMode(mode);
    this.opts = { ...base, ...(options ?? {}) } as Required<LocationTrackerOptions>;
  }

  reset() {
    this.lastSeenAt = null;
    this.lastAccepted = null;
    this.acceptableWindow = [];
  }

  ingest(raw: LocationPoint): LocationIngestResult {
    const reportedSpeedMps = Number.isFinite(raw.speed as number) ? (raw.speed as number) : null;

    // 1) Time gating (ignore too-frequent updates)
    const deltaTimeSeconds = this.lastSeenAt ? (raw.timestamp - this.lastSeenAt) / 1000 : 0;
    this.lastSeenAt = raw.timestamp;

    if (this.lastAccepted === null) {
      // First point: we keep it as anchor only if accuracy is good; otherwise still store seenAt but no anchor.
      const signalWeak = raw.accuracy > this.opts.maxAccuracyMeters;
      if (!signalWeak) {
        const point = this.pushAndSmooth(raw);
        this.lastAccepted = point;
        return {
          accepted: false,
          reason: "first_point",
          signalWeak: false,
          deltaTimeSeconds: 0,
          deltaDistMeters: 0,
          impliedSpeedMps: null,
          reportedSpeedMps,
          point,
          isStationary: true,
        };
      }

      return {
        accepted: false,
        reason: "weak_signal_accuracy",
        signalWeak: true,
        deltaTimeSeconds: 0,
        deltaDistMeters: 0,
        impliedSpeedMps: null,
        reportedSpeedMps,
        point: raw,
        isStationary: true,
      };
    }

    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < this.opts.minDeltaSeconds) {
      return {
        accepted: false,
        reason: "delta_too_small",
        signalWeak: false,
        deltaTimeSeconds: Number.isFinite(deltaTimeSeconds) ? deltaTimeSeconds : 0,
        deltaDistMeters: 0,
        impliedSpeedMps: null,
        reportedSpeedMps,
        point: raw,
        isStationary: true, // Assuming stationary if updates are too fast/jittery without significant movement
      };
    }

    // 2) Accuracy gating (weak signal means we don't accumulate)
    const signalWeak = raw.accuracy > this.opts.maxAccuracyMeters;
    if (signalWeak) {
      return {
        accepted: false,
        reason: "weak_signal_accuracy",
        signalWeak: true,
        deltaTimeSeconds,
        deltaDistMeters: 0,
        impliedSpeedMps: null,
        reportedSpeedMps,
        point: raw,
        isStationary: true, // Weak signal usually implies indoor/stationary context
      };
    }

    // 3) Smoothing (median over last N acceptable points)
    const point = this.pushAndSmooth(raw);

    // 4) Distance
    const deltaDistMeters = haversineMeters(this.lastAccepted, point);
    if (!Number.isFinite(deltaDistMeters) || deltaDistMeters <= 0) {
      return {
        accepted: false,
        reason: "invalid_distance",
        signalWeak: false,
        deltaTimeSeconds,
        deltaDistMeters: 0,
        impliedSpeedMps: null,
        reportedSpeedMps,
        point,
        isStationary: true,
      };
    }

    const impliedSpeedMps = deltaDistMeters / deltaTimeSeconds;

    // 5) Anti-jump (discard implausible jumps)
    if (!Number.isFinite(impliedSpeedMps) || impliedSpeedMps > this.opts.maxImplicitSpeedMps) {
      return {
        accepted: false,
        reason: "anti_jump",
        signalWeak: false,
        deltaTimeSeconds,
        deltaDistMeters,
        impliedSpeedMps: Number.isFinite(impliedSpeedMps) ? impliedSpeedMps : null,
        reportedSpeedMps,
        point,
        isStationary: false, // Jumps are technically "movement" but rejected
      };
    }

    // 6) Anti-drift (evidence of movement)
    // We require EITHER convincing speed reported by OS OR significant distance
    const stepThresholdMeters = Math.max(point.accuracy * this.opts.stepAccuracyFactor, this.opts.minStepMeters);
    const hasSpeedEvidence = reportedSpeedMps !== null && reportedSpeedMps >= this.opts.minSpeedMps;
    const hasStepEvidence = deltaDistMeters >= stepThresholdMeters;

    if (!hasSpeedEvidence && !hasStepEvidence) {
      return {
        accepted: false,
        reason: "stationary_no_motion",
        signalWeak: false,
        deltaTimeSeconds,
        deltaDistMeters,
        impliedSpeedMps,
        reportedSpeedMps,
        point,
        isStationary: true,
      };
    }

    // Accepted: update anchor
    this.lastAccepted = point;
    return {
      accepted: true,
      reason: "accepted",
      signalWeak: false,
      deltaTimeSeconds,
      deltaDistMeters,
      impliedSpeedMps,
      reportedSpeedMps,
      point,
      isStationary: false,
    };
  }

  private pushAndSmooth(p: LocationPoint): LocationPoint {
    this.acceptableWindow.push(p);
    if (this.acceptableWindow.length > this.opts.smoothingWindowSize) {
      this.acceptableWindow.shift();
    }

    const lats = this.acceptableWindow.map((x) => x.lat);
    const lngs = this.acceptableWindow.map((x) => x.lng);
    const accuracies = this.acceptableWindow.map((x) => x.accuracy);
    const speeds = this.acceptableWindow
      .map((x) => (Number.isFinite(x.speed as number) ? (x.speed as number) : null))
      .filter((x): x is number => x !== null);

    return {
      ...p,
      lat: median(lats),
      lng: median(lngs),
      // conservative: keep worst accuracy in window
      accuracy: Math.max(...accuracies),
      // light smoothing for speed too (median of available)
      speed: speeds.length ? median(speeds) : p.speed ?? null,
    };
  }
}
