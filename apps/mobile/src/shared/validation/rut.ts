export function normalizeRut(value: string) {
  return value.replace(/[.\s]/g, '').toUpperCase();
}

export function isValidRut(value: string) {
  if (!/^[0-9]{7,8}-[0-9K]$/.test(value)) return false;
  const [body, digit] = value.split('-');
  if (!body || Number(body) === 0) return false;
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  return digit === (remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder));
}
