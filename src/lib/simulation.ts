import type { Scenario } from './schema.ts';

export type Availability = 'available' | 'affected' | 'indeterminate';
export type Outcome = { state: Availability; distance: number | null };

export function evaluateScenario(
  scenario: Scenario,
  cuts: ReadonlySet<string>,
): Record<string, Outcome> {
  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const inputGroups = new Map<string, Scenario['inputs']>();
  if (nodes.size !== scenario.nodes.length)
    throw new Error(`Duplicate node in ${scenario.id}`);
  for (const group of scenario.inputs) {
    if (
      !nodes.has(group.target) ||
      group.alternatives.some((input) => !nodes.has(input))
    ) {
      throw new Error(`Unknown input or target in ${scenario.id}`);
    }
    const groups = inputGroups.get(group.target) ?? [];
    groups.push(group);
    inputGroups.set(group.target, groups);
  }
  const results = new Map<string, Outcome>();
  const visiting = new Set<string>();
  function resolve(key: string): Outcome {
    const existing = results.get(key);
    if (existing) return existing;
    if (visiting.has(key)) throw new Error(`Cycle at ${key} in ${scenario.id}`);
    visiting.add(key);
    const groups = (inputGroups.get(key) ?? []).map((group) => {
      const inputs = group.alternatives.map(resolve);
      const distances = inputs.flatMap((input) =>
        input.distance === null ? [] : [input.distance],
      );
      const state: Availability =
        group.evidenceType === 'unknown'
          ? 'indeterminate'
          : inputs.some((input) => input.state === 'available')
            ? 'available'
            : inputs.some((input) => input.state === 'indeterminate')
              ? 'indeterminate'
              : 'affected';
      return {
        state,
        distance:
          state !== 'available' && distances.length
            ? Math.min(...distances) + 1
            : null,
      };
    });
    let result: Outcome;
    if (cuts.has(key)) result = { state: 'affected', distance: 0 };
    else {
      const affected = groups.filter((group) => group.state === 'affected');
      const incomplete = groups.filter(
        (group) => group.state === 'indeterminate',
      );
      const state = affected.length
        ? 'affected'
        : incomplete.length || nodes.get(key)?.unknown
          ? 'indeterminate'
          : 'available';
      const distances = (affected.length ? affected : incomplete).flatMap(
        (group) => (group.distance === null ? [] : [group.distance]),
      );
      result = {
        state,
        distance: distances.length ? Math.min(...distances) : null,
      };
    }
    visiting.delete(key);
    results.set(key, result);
    return result;
  }
  for (const node of nodes.keys()) resolve(node);
  return Object.fromEntries(results);
}
