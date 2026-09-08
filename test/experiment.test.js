import test from "node:test";
import assert from "node:assert/strict";
import { conversionRate, createExperiment, evaluateExperiment, recordLocalAction } from "../experiment.js";

test("conversion rate preserves the denominator", () => {
  const experiment = createExperiment({ visitors: 20, actions: 8, threshold: 0.5 });
  assert.equal(conversionRate(experiment), 0.4);
  assert.equal(evaluateExperiment(experiment), "threshold-missed");
});

test("a precommitted threshold can be met", () => {
  const experiment = createExperiment({ visitors: 10, actions: 5, threshold: 0.5 });
  assert.equal(evaluateExperiment(experiment), "threshold-met");
});

test("zero visitors is explicitly insufficient", () => {
  assert.equal(evaluateExperiment(createExperiment()), "insufficient-data");
});

test("invalid counts and thresholds are rejected", () => {
  assert.throws(() => createExperiment({ visitors: -1 }), /visitors/);
  assert.throws(() => createExperiment({ visitors: 5, actions: 6 }), /actions/);
  assert.throws(() => createExperiment({ threshold: 1.1 }), /threshold/);
});

test("local actions are counted without a remote database", () => {
  assert.equal(recordLocalAction(0), 1);
  assert.throws(() => recordLocalAction(-1), /count/);
});
