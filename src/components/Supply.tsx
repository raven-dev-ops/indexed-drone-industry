import { useEffect, useState } from 'react';
import { evaluateScenario } from '../lib/simulation';
import type { Scenario } from '../lib/schema';

const states = {
  available: 'Available in scenario',
  affected: 'Affected',
  indeterminate: 'Indeterminate',
};

type RelatedRecord = { name: string; href: string };

export default function Supply({ scenario, related = {} }: { scenario: Scenario; related?: Record<string, RelatedRecord[]> }) {
  const [cuts, setCuts] = useState<string[]>([]);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAnimate(!preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  const outcomes = evaluateScenario(scenario, new Set(cuts));
  const allNames = Object.fromEntries(
    scenario.nodes.map((node) => [node.id, node.name]),
  );
  const stages = [...new Set(scenario.nodes.map((node) => node.stage))];
  const effect = (distance: number | null) =>
    distance === null
      ? 'Evidence gap'
      : distance === 0
        ? 'Selected cut'
        : `${distance} ${distance === 1 ? 'step' : 'steps'} from cut`;
  const layout = new Map<string, [number, number]>();
  for (const [column, stage] of stages.entries()) {
    const members = scenario.nodes.filter((node) => node.stage === stage);
    for (const [row, node] of members.entries())
      layout.set(node.id, [65 + column * 130, 39 + row * 58]);
  }
  const height =
    Math.max(...Array.from(layout.values(), (point) => point[1])) + 43;
  return (
    <div className="stack">
      <section className="panel" aria-label="Disruption simulator">
        <div className="section-head">
          <div>
            <span className="eyebrow">Supply model</span>
            <h2>Simulate a disruption</h2>
          </div>
          <button
            className="button secondary small"
            type="button"
            disabled={!cuts.length}
            onClick={() => setCuts([])}
          >
            Reset scenario
          </button>
        </div>
        <p>
          Select a step to interrupt its supply. Each required input group needs
          an available input. Substitutes share a group and a gap in the
          evidence stays indeterminate.
        </p>
        <div className="supply-visual" aria-hidden="true">
          <svg viewBox={`0 0 ${Math.max(stages.length, 2) * 130} ${height}`}>
            {scenario.inputs.flatMap((group, i) =>
              group.alternatives.map((from) => {
                const [x1, y1] = layout.get(from)!;
                const [x2, y2] = layout.get(group.target)!;
                const color =
                  outcomes[from].state === 'affected'
                    ? '#a04c36'
                    : outcomes[from].state === 'indeterminate'
                      ? '#9a6a28'
                      : '#5a8271';
                return (
                  <g key={`${i}-${from}`}>
                    <path
                      d={`M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray={
                        group.evidenceType !== 'documented' ? '5 4' : undefined
                      }
                    />
                    {group.leadTimeDays && animate && outcomes[from].state === 'available' && outcomes[group.target].state === 'available' && (
                      <circle cx={x1} cy={y1} r="3" fill={color}>
                        <animate
                          attributeName="cx"
                          from={x1}
                          to={x2}
                          dur={`${Math.min(12, 1 + Math.log2(group.leadTimeDays + 1))}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="cy"
                          from={y1}
                          to={y2}
                          dur={`${Math.min(12, 1 + Math.log2(group.leadTimeDays + 1))}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </g>
                );
              }),
            )}
            {scenario.nodes.map((node, index) => {
              const [x, y] = layout.get(node.id)!;
              const status = outcomes[node.id].state;
              return (
                <g key={node.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="14"
                    fill={
                      status === 'affected'
                        ? '#f4d3c4'
                        : status === 'indeterminate'
                          ? '#f3dfaf'
                          : '#e2eddb'
                    }
                    stroke="#526f60"
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#14212d"
                  >
                    {index + 1}
                  </text>
                  <text
                    x={x}
                    y={y + 30}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#354f48"
                  >
                    {node.name.length > 25
                      ? `${node.name.slice(0, 23)}…`
                      : node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="graph-nodes">
          {scenario.nodes.map((node, index) => {
            const outcome = outcomes[node.id];
            return (
              <button
                type="button"
                className="graph-node"
                key={node.id}
                aria-pressed={cuts.includes(node.id)}
                aria-label={`${node.name}: ${states[outcome.state]}`}
                data-state={outcome.state}
                onClick={() =>
                  setCuts((current) =>
                    current.includes(node.id)
                      ? current.filter((id) => id !== node.id)
                      : [...current, node.id],
                  )
                }
              >
                <small className="label">
                  {index + 1} · {node.stage}
                </small>
                <strong>{node.name}</strong>
                <span>
                  {states[outcome.state]}
                  {outcome.state !== 'available'
                    ? ` · ${effect(outcome.distance)}`
                    : ''}
                </span>
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="note">
          {cuts.length
            ? `${cuts.length} selected ${cuts.length === 1 ? 'cut' : 'cuts'}. ${Object.values(outcomes).filter((row) => row.state === 'affected').length} affected, ${Object.values(outcomes).filter((row) => row.state === 'indeterminate').length} indeterminate.`
            : 'Select a step to see which branches depend on it.'}
        </p>
      </section>
      {scenario.nodes.some((node) => related[node.id]?.length || node.timing) && (
        <section className="panel" aria-labelledby="steps-title">
          <h2 id="steps-title">Explore the steps</h2>
          <p className="note">The linked records give context for the selected step. The input evidence below describes which dependencies are documented.</p>
          {scenario.nodes.filter((node) => related[node.id]?.length || node.timing).map((node) => (
            <div key={node.id} id={node.id}>
              <h3>{node.name}</h3>
              {node.timing && <p>{node.timing} {node.source && <a href={node.source.url}>{node.source.publisher} · {node.source.locator}</a>}</p>}
              {related[node.id]?.length > 0 && <ul>{related[node.id].map((link) => <li key={link.href}><a href={link.href}>{link.name}</a></li>)}</ul>}
            </div>
          ))}
        </section>
      )}
      <section aria-labelledby="edge-title">
        <h2 id="edge-title">Input evidence</h2>
        <div className="table-wrap" style={{ marginTop: '.8rem' }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Feeds into</th>
                <th scope="col">Required input group</th>
                <th scope="col">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {scenario.inputs.map((group, index) => (
                <tr key={index}>
                  <td>{allNames[group.target]}</td>
                  <td>
                    {group.alternatives.map((id) => allNames[id]).join(' or ')}
                  </td>
                  <td>
                    <span className="tag neutral">{group.evidenceType}</span>
                    <small>
                      <a href={group.source.url}>
                        {group.source.publisher} · {group.source.title}
                      </a>
                    </small>
                    <small>
                      {group.source.locator}
                      {group.leadTimeDays
                        ? ` · ${group.leadTimeDays} days`
                        : ''}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
