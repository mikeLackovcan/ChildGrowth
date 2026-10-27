export function wheelRotation(index: number, count: number) {
  if (count < 1 || index < 0 || index >= count) throw new Error('Invalid wheel segment');
  return 1440 + (360 - (index + 0.5) * 360 / count);
}
