const gravity = 9.80665;

export const gramsForceToNewtons = (gramsForce: number) =>
  (gramsForce * gravity) / 1000;

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
  const power = rotors * watts;
  const ratio = (rotors * thrust) / (mass * gravity);
  const minutes = ((energy * (1 - reserve / 100)) / power) * 60;
  if ([power, ratio, minutes].some((value) => !Number.isFinite(value) || value <= 0))
    return null;
  return {
    ratio,
    minutes: ratio >= 1 ? minutes : null,
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
  const result = {
    width,
    length,
    lines,
    photos,
    seconds: photos / speed,
    hectaresPerHour: lines * speed * 0.36,
  };
  return Object.values(result).some((value) => !Number.isFinite(value) || value <= 0)
    ? null
    : result;
}
