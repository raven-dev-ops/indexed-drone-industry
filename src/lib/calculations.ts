export function propulsion(input: {
  mass: number;
  rotors: number;
  thrust: number;
  watts: number;
  energy: number;
  reserve: number;
}) {
  const { mass, rotors, thrust, watts, energy, reserve } = input;
  if (
    Object.values(input).some((value) => !Number.isFinite(value)) ||
    mass <= 0 ||
    !Number.isInteger(rotors) ||
    rotors < 1 ||
    thrust <= 0 ||
    watts <= 0 ||
    energy <= 0 ||
    reserve < 0 ||
    reserve >= 100
  )
    return null;
  const ratio = (rotors * thrust) / (mass * 9.80665);
  return {
    ratio,
    minutes:
      ratio >= 1
        ? (60 * energy * (1 - reserve / 100)) / (rotors * watts)
        : null,
  };
}

export function survey(input: {
  altitude: number;
  crossFov: number;
  alongFov: number;
  sideOverlap: number;
  frontOverlap: number;
  speed: number;
}) {
  const { altitude, crossFov, alongFov, sideOverlap, frontOverlap, speed } =
    input;
  if (
    Object.values(input).some((value) => !Number.isFinite(value)) ||
    altitude <= 0 ||
    speed <= 0 ||
    [crossFov, alongFov].some((value) => value <= 0 || value >= 180) ||
    [sideOverlap, frontOverlap].some((value) => value < 0 || value >= 100)
  )
    return null;
  const width = 2 * altitude * Math.tan((crossFov * Math.PI) / 360);
  const length = 2 * altitude * Math.tan((alongFov * Math.PI) / 360);
  const lines = width * (1 - sideOverlap / 100);
  const photos = length * (1 - frontOverlap / 100);
  return {
    width,
    length,
    lines,
    photos,
    seconds: photos / speed,
    hectaresPerHour: (lines * speed * 3600) / 10000,
  };
}
