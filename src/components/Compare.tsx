import { useEffect, useState } from 'react';
import { metrics, segments, type Aircraft } from '../lib/schema';

const displayUnit = (
  key: keyof typeof metrics,
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
  const [selection, setSelection] = useState([
    aircraft[0]?.id ?? '',
    aircraft[1]?.id ?? '',
  ]);
  useEffect(() => {
    function readSelection() {
      const query = new URLSearchParams(window.location.search);
      setSelection(
        [query.get('a'), query.get('b')].map(
          (id, index) =>
            aircraft.find((row) => row.id === id)?.id ??
            aircraft[index]?.id ??
            '',
        ),
      );
    }
    readSelection();
    window.addEventListener('popstate', readSelection);
    return () => window.removeEventListener('popstate', readSelection);
  }, [aircraft]);
  const selected = selection.map((id) => aircraft.find((row) => row.id === id));
  const select = (index: number, value: string) => {
    const next = [...selection];
    next[index] = value;
    setSelection(next);
    const url = new URL(window.location.href);
    url.searchParams.set('a', next[0]);
    url.searchParams.set('b', next[1]);
    window.history.replaceState(null, '', url);
  };
  return (
    <>
      <div className="controls">
        {selection.map((id, index) => (
          <label key={index}>
            Aircraft {index + 1}
            <select
              value={id}
              onChange={(event) => select(index, event.currentTarget.value)}
            >
              {Object.entries(segments).map(([key, name]) => (
                <optgroup key={key} label={name}>
                  {aircraft
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
            {(Object.keys(metrics) as (keyof typeof metrics)[]).map((key) => {
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
