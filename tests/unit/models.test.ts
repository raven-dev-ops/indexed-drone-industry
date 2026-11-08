import { describe, expect, it } from 'vitest';
import { propulsion, survey } from '../../src/lib/calculations';
import { evaluateScenario } from '../../src/lib/simulation';
import type { Scenario } from '../../src/lib/schema';

const source = {
  title: 'Test source',
  publisher: 'Test',
  url: 'https://example.com',
  locator: 'Fixture',
  accessed: '2026-11-08',
  rights: 'Test only',
};
const example: Scenario = {
  id: 'test',
  name: 'Dependency fixture',
  summary: 'Test graph',
  mode: 'representative',
  source,
  nodes: [
    { id: 'a', name: 'Input A', stage: 'Input' },
    { id: 'b', name: 'Input B', stage: 'Input' },
    { id: 'c', name: 'Input C', stage: 'Input' },
    { id: 'combined', name: 'Assembly', stage: 'Assembly' },
    { id: 'aircraft', name: 'Aircraft', stage: 'Aircraft' },
  ],
  inputs: [
    {
      target: 'combined',
      alternatives: ['a', 'b'],
      evidenceType: 'documented',
      source,
    },
    {
      target: 'combined',
      alternatives: ['c'],
      evidenceType: 'documented',
      source,
    },
    {
      target: 'aircraft',
      alternatives: ['combined'],
      evidenceType: 'documented',
      source,
    },
  ],
};
describe('supply disruptions', () => {
  it('keeps a branch available through a substitute and blocks on a separate requirement', () => {
    expect(evaluateScenario(example, new Set(['a'])).aircraft.state).toBe(
      'available',
    );
    expect(evaluateScenario(example, new Set(['a', 'b'])).aircraft).toEqual({
      state: 'affected',
      distance: 2,
    });
    expect(evaluateScenario(example, new Set(['c'])).combined).toEqual({
      state: 'affected',
      distance: 1,
    });
  });
  it('propagates missing evidence and respects a definitive cut', () => {
    const uncertain = {
      ...example,
      nodes: example.nodes.map((node) =>
        node.id === 'b' ? { ...node, unknown: true } : node,
      ),
    };
    expect(evaluateScenario(uncertain, new Set(['a'])).aircraft).toEqual({
      state: 'indeterminate',
      distance: 2,
    });
    expect(
      evaluateScenario(uncertain, new Set(['a', 'c'])).aircraft.state,
    ).toBe('affected');
  });
  it('rejects a cycle even if it contains a selected cut', () => {
    const cycle = {
      ...example,
      inputs: [
        ...example.inputs,
        {
          target: 'a',
          alternatives: ['aircraft'],
          evidenceType: 'documented' as const,
          source,
        },
      ],
    };
    expect(() => evaluateScenario(cycle, new Set(['a']))).toThrow(/Cycle/);
  });
});

describe('lab calculations', () => {
  it('computes thrust ratio and time from an explicit rotor operating point', () => {
    const input = {
      mass: 2,
      rotors: 4,
      thrust: 9.80665,
      watts: 100,
      energy: 100,
      reserve: 20,
    };
    expect(propulsion(input)).toEqual({ ratio: 2, minutes: 12 });
    expect(propulsion({ ...input, mass: 5 })?.minutes).toBeNull();
    expect(propulsion({ ...input, watts: 0 })).toBeNull();
  });
  it('computes a known square footprint and overlapping survey spacing', () => {
    const result = survey({
      altitude: 50,
      crossFov: 90,
      alongFov: 90,
      sideOverlap: 50,
      frontOverlap: 75,
      speed: 5,
    });
    expect(result?.width).toBeCloseTo(100);
    expect(result?.lines).toBeCloseTo(50);
    expect(result?.photos).toBeCloseTo(25);
    expect(result?.seconds).toBeCloseTo(5);
    expect(result?.hectaresPerHour).toBeCloseTo(90);
    expect(
      survey({
        altitude: 50,
        crossFov: 90,
        alongFov: 180,
        sideOverlap: 50,
        frontOverlap: 75,
        speed: 5,
      }),
    ).toBeNull();
  });
});
