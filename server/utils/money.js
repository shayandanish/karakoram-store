export function toMinorUnits(value, label = 'Amount') {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
    const error = new RangeError(`${label} must be a non-negative amount with at most two decimal places`);
    error.statusCode = 400;
    throw error;
  }
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    const error = new RangeError(`${label} must have at most two decimal places`);
    error.statusCode = 400;
    throw error;
  }
  return Math.round(amount * 100);
}

export function fromMinorUnits(value) {
  return Number((value / 100).toFixed(2));
}
