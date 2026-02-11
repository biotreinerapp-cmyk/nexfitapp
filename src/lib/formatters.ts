export const formatDistanceKm = (distanceKm: number | null | undefined) => {
  if (distanceKm == null) return "—";
  const km = Number(distanceKm);
  if (!Number.isFinite(km)) return "—";

  if (km <= 0) return "0.0 km";

  // For very short distances, meters are more meaningful than "0.0 km".
  if (km < 0.1) {
    const meters = Math.max(1, Math.round(km * 1000));
    return `${meters} m`;
  }

  if (km < 1) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
};
