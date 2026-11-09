import { useId, useState } from 'react';
import { componentComparisons } from '../lib/component-data';

type Category = keyof typeof componentComparisons;

export default function ComponentCompare({ base }: { base: string }) {
  const [category, setCategory] = useState<Category>('propulsion');
  const title = useId();
  const comparison = componentComparisons[category];
  return (
    <section className="panel" aria-labelledby={title}>
      <h2 id={title}>Component comparison</h2>
      <p>Compare documented examples of components used for similar tasks.</p>
      <div className="controls">
        <label>
          Component category
          <select value={category} onChange={(event) => setCategory(event.currentTarget.value as Category)}>
            {Object.entries(componentComparisons).map(([key, group]) => (
              <option key={key} value={key}>{group.label}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="note" aria-live="polite">{comparison.note}</p>
      <div className="table-wrap">
        <table aria-label={`${comparison.label} component comparison`}>
          <thead>
            <tr>
              <th scope="col">Measurement or feature</th>
              {comparison.columns.map((column) => (
                <th scope="col" key={column.id}>{column.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map(([label, first, second]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{first}</td>
                <td>{second}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Published evidence</th>
              {comparison.columns.map((column) => (
                <td key={column.id}>
                  <a href={column.source.url}>{column.source.publisher} · {column.name}</a>
                  <small>{column.source.locator}</small>
                  {'labQuery' in column && (
                    <small><a href={`${base}labs/?${column.labQuery}#propulsion-lab`}>Open {column.name} in the lab</a></small>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
