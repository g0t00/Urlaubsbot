export function roundToCent(num: number) {
  num = num * 100;
  num = Math.sign(num) * Math.round(Math.abs(num));
  return num/100;
}
