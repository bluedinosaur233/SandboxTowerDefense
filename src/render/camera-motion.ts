/** Ground-plane camera motion, independent of orbit angle and diagonal input. */
export function cameraMotion(forwardX: number, forwardZ: number, rightInput: number, forwardInput: number, distance: number) {
  const length = Math.hypot(forwardX, forwardZ) || 1;
  const fx = forwardX / length, fz = forwardZ / length;
  const inputLength = Math.max(1, Math.hypot(rightInput, forwardInput));
  return { x: (-fz * rightInput + fx * forwardInput) * distance / inputLength,
    z: (fx * rightInput + fz * forwardInput) * distance / inputLength };
}
