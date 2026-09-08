export function createExperiment({ visitors = 0, actions = 0, threshold = 0.5 } = {}) {
  if (!Number.isInteger(visitors) || visitors < 0) throw new Error("visitors must be a nonnegative integer");
  if (!Number.isInteger(actions) || actions < 0) throw new Error("actions must be a nonnegative integer");
  if (actions > visitors && visitors !== 0) throw new Error("actions cannot exceed visitors");
  if (threshold < 0 || threshold > 1) throw new Error("threshold must be between zero and one");
  return { visitors, actions, threshold };
}

export function conversionRate(experiment) {
  return experiment.visitors === 0 ? 0 : experiment.actions / experiment.visitors;
}

export function evaluateExperiment(experiment) {
  if (experiment.visitors === 0) return "insufficient-data";
  return conversionRate(experiment) >= experiment.threshold ? "threshold-met" : "threshold-missed";
}

export function recordLocalAction(currentCount) {
  if (!Number.isInteger(currentCount) || currentCount < 0) throw new Error("count must be a nonnegative integer");
  return currentCount + 1;
}
