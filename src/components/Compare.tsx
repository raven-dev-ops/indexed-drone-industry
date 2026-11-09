import { useEffect, useState } from 'react';
import { metrics, segments, type Aircraft } from '../lib/schema';

type Mission = keyof typeof segments;
type Metric = keyof typeof metrics;

const missions: Record<Mission, { pair: [string, string]; priorities: Metric[]; note: string }> = {
  camera: {
    pair: ['dji-mini-4-pro', 'dji-air-3s'],
    priorities: ['sensors', 'mass', 'endurance'],
    note: 'Start with the camera and the mass of the stated battery configuration. Compare endurance in the conditions reported for each aircraft.',
  },
  fpv: {
    pair: ['dji-avata-2', 'geprc-mark5-dc-hd-o3'],
    priorities: ['ecosystem', 'mass', 'sensors'],
    note: 'Check the goggles and control system, then compare the camera setup and whether the published mass includes a battery.',
  },
  enterprise: {
    pair: ['dji-mavic-3e', 'wingtraone-gen-ii'],
    priorities: ['sensors', 'endurance', 'ecosystem'],
    note: 'Start with the survey sensor and positioning workflow, then read the conditions attached to endurance. Use the Survey Coverage Lab to compare a chosen camera geometry and overlap.',
  },
  agriculture: {
    pair: ['dji-agras-t70p', 'xag-p100-pro'],
    priorities: ['payload', 'mtow', 'endurance'],
    note: 'Read payload alongside the configuration. Liquid capacity, spreader capacity and maximum takeoff mass describe different quantities.',
  },
  delivery: {
    pair: ['zipline-platform-2', 'matternet-m2'],
    priorities: ['payload', 'ecosystem', 'endurance'],
    note: 'Read the published load and delivery system together. Operational range or delivery activity describes a different quantity from flight time.',
  },
  'public-safety': {
    pair: ['skydio-x10', 'dji-matrice-30t'],
    priorities: ['sensors', 'endurance', 'ecosystem'],
    note: 'Start with the sensors on each named configuration and the associated operating system. Published endurance depends on the stated test conditions.',
  },
  research: {
    pair: ['holybro-x500-v2', 'crazyflie-2-1-plus'],
    priorities: ['ecosystem', 'payload', 'mass'],
    note: 'Check the programming or control ecosystem and the exact kit configuration. Published mass and payload depend on what ships with that configuration.',
  },
};

function missionChoices(aircraft: Aircraft[], mission: Mission | '') {
  return mission ? aircraft.filter((row) => row.segment === mission) : aircraft;
}

function missionPair(aircraft: Aircraft[], mission: Mission | '') {
  const choices = missionChoices(aircraft, mission);
  return [0, 1].map((index) =>
    (mission ? choices.find((row) => row.id === missions[mission].pair[index])?.id : undefined) ??
    choices[index]?.id ?? '',
  );
}

const displayUnit = (
  key: Metric,
  spec: Aircraft['specs'][number],
) => {
  if (spec.value === null)
    return spec.status === 'not-applicable' ? 'Not applicable' : 'Unknown';
  if (
    typeof spec.value === 'number' &&
    spec.unit === 'g' &&
    ['mass', 'mtow', 'payload'].includes(key)
  )
    return `${spec.value / 1000} kg`;
  return `${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`;
};

export default function Compare({
  aircraft,
  base,
}: {
  aircraft: Aircraft[];
  base: string;
}) {
  const [mission, setMission] = useState<Mission | ''>('');
  const [selection, setSelection] = useState(() => missionPair(aircraft, ''));
  useEffect(() => {
    function readSelection() {
      const query = new URLSearchParams(window.location.search);
      const candidate = query.get('mission');
      const nextMission = candidate && Object.hasOwn(missions, candidate) ? candidate as Mission : '';
      const choices = missionChoices(aircraft, nextMission);
      const pair = missionPair(aircraft, nextMission);
      setMission(nextMission);
      setSelection(
        [query.get('a'), query.get('b')].map((id, index) =>
          choices.find((row) => row.id === id)?.id ?? pair[index],
        ),
      );
    }
    readSelection();
    window.addEventListener('popstate', readSelection);
    return () => window.removeEventListener('popstate', readSelection);
  }, [aircraft]);
  const available = missionChoices(aircraft, mission);
  const selected = selection.map((id) => available.find((row) => row.id === id));
  const priorities = mission ? missions[mission].priorities : [];
  const orderedMetrics = [...new Set([...priorities, ...Object.keys(metrics) as Metric[]])];
  const save = (nextMission: Mission | '', next: string[]) => {
    setMission(nextMission);
    setSelection(next);
    const url = new URL(window.location.href);
    if (nextMission) url.searchParams.set('mission', nextMission);
    else url.searchParams.delete('mission');
    url.searchParams.set('a', next[0]);
    url.searchParams.set('b', next[1]);
    window.history.replaceState(null, '', url);
  };
  return (
    <>
      <div className="controls">
        <label>
          Comparison mission
          <select
            value={mission}
            onChange={(event) => {
              const next = event.currentTarget.value as Mission | '';
              save(next, next ? missionPair(aircraft, next) : selection);
            }}
          >
            <option value="">All missions</option>
            {Object.entries(segments).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </label>
        {selection.map((id, index) => (
          <label key={index}>
            Aircraft {index + 1}
            <select
              value={id}
              onChange={(event) => save(mission, selection.map((current, i) =>
                i === index ? event.currentTarget.value : current,
              ))}
            >
              {Object.entries(segments).filter(([key]) => !mission || key === mission).map(([key, name]) => (
                <optgroup key={key} label={name}>
                  {available
                    .filter((row) => row.segment === key)
                    .map((row) => (
                      <option value={row.id} key={row.id}>
                        {row.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        ))}
      </div>
      {mission && (
        <p className="note" aria-live="polite">
          {missions[mission].note}
          {mission === 'enterprise' && <> <a href={`${base}labs/#survey-lab`}>Open the Survey Coverage Lab</a>.</>}
        </p>
      )}
      <div className="table-wrap">
        <table aria-label="Aircraft specification comparison">
          <thead>
            <tr>
              <th scope="col">Specification</th>
              {selected.map((row, index) => (
                <th key={index} scope="col">
                  {row ? (
                    <>
                      <a href={`${base}aircraft/${row.id}/`}>{row.name}</a>
                      <small style={{ display: 'block', whiteSpace: 'normal' }}>
                        {row.variant}
                      </small>
                    </>
                  ) : (
                    'Aircraft unavailable'
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedMetrics.map((key) => {
              const all = selected.map(
                (row) =>
                  row?.specs.filter(
                    (spec) => spec.key === key && spec.status !== 'superseded',
                  ) ?? [],
              );
              const comparable =
                all.every(
                  (specs) =>
                    specs.length === 1 &&
                    specs[0].value !== null &&
                    specs[0].status === 'current',
                ) &&
                Boolean(all[0][0]?.condition) &&
                all[0][0].condition === all[1][0].condition &&
                typeof all[0][0].value === typeof all[1][0].value &&
                (all[0][0].unit === all[1][0].unit ||
                  [all[0][0].unit, all[1][0].unit].every(
                    (unit) => unit === 'g' || unit === 'kg',
                  ));
              return (
                <tr key={key}>
                  <th scope="row">
                    {metrics[key]}
                    {!comparable && all.every((specs) => specs.length > 0) && (
                      <small
                        style={{
                          display: 'block',
                          whiteSpace: 'normal',
                          fontWeight: 400,
                        }}
                      >
                        Conditions may differ
                      </small>
                    )}
                  </th>
                  {all.map((specs, index) => (
                    <td key={index}>
                      {specs.length
                        ? specs.map((spec, i) => {
                            const source =
                              spec.source ?? selected[index]?.source;
                            return (
                              <div
                                key={i}
                                style={{
                                  marginBottom:
                                    specs.length > 1 ? '.6rem' : undefined,
                                }}
                              >
                                <strong>{displayUnit(key, spec)}</strong>
                                {spec.status === 'conflicting' && (
                                  <small>Conflicting observation</small>
                                )}
                                <small>
                                  {spec.condition ??
                                    'Test or configuration conditions unavailable'}
                                </small>
                                {source && (
                                  <small>
                                    <a href={source.url}>{source.publisher}</a>{' '}
                                    · {source.locator}
                                  </small>
                                )}
                              </div>
                            );
                          })
                        : 'Unknown'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        Aircraft mass and maximum takeoff mass are different measurements.
        Published endurance figures retain the manufacturer’s test conditions.
      </p>
    </>
  );
}
