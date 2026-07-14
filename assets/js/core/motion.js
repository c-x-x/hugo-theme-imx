export const springResult = { value: 0, velocity: 0 };

export function advanceSpring(value, velocity, target, frequency, dampingRatio, deltaTime) {
  const omega = Math.max(0.001, frequency * Math.PI * 2);
  const zeta = Math.max(0.001, dampingRatio);
  const time = Math.min(Math.max(deltaTime, 0), 0.08);
  const displacement = value - target;

  if (time === 0) {
    springResult.value = value;
    springResult.velocity = velocity;
    return;
  }

  if (zeta < 1) {
    const dampedOmega = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * time);
    const cos = Math.cos(dampedOmega * time);
    const sin = Math.sin(dampedOmega * time);
    const c2 = (velocity + zeta * omega * displacement) / dampedOmega;
    const nextDisplacement = decay * (displacement * cos + c2 * sin);
    const nextVelocity = decay * (
      -zeta * omega * (displacement * cos + c2 * sin) +
      (-displacement * dampedOmega * sin + c2 * dampedOmega * cos)
    );

    springResult.value = target + nextDisplacement;
    springResult.velocity = nextVelocity;
    return;
  }

  const decay = Math.exp(-omega * time);
  const c2 = velocity + omega * displacement;
  springResult.value = target + (displacement + c2 * time) * decay;
  springResult.velocity = (velocity - omega * c2 * time) * decay;
}
