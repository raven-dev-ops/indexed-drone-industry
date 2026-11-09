import { useEffect, useState } from 'react';
import type { Evidence } from '../lib/schema';

type AircraftLink = {
  id: string;
  name: string;
  href: string;
  part: string;
  partHref: string;
  evidenceType: 'documented' | 'representative' | 'unknown';
  scope?: string;
  source?: Evidence;
};
export type SupplyPath = {
  id: string;
  name: string;
  href: string;
  aircraft: AircraftLink[];
};

export default function SupplyScope({ paths, detail = false }: { paths: SupplyPath[]; detail?: boolean }) {
  const [aircraft, setAircraft] = useState('');
  const options = [...new Map(paths.flatMap((path) => path.aircraft.map((link) => [link.id, link] as const))).values()]
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  useEffect(() => {
    const sync = () => setAircraft(new URLSearchParams(window.location.search).get('aircraft') ?? '');
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const selected = options.find((option) => option.id === aircraft);
  const filtered = aircraft ? paths.filter((path) => path.aircraft.some((link) => link.id === aircraft)) : paths;

  function select(value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('aircraft', value);
    else url.searchParams.delete('aircraft');
    window.history.replaceState(null, '', url);
    setAircraft(value);
  }

  return (
    <section className="panel" aria-label={detail ? 'Aircraft context' : 'Industry supply explorer'}>
      <h2>{detail ? 'Apply this pathway to an aircraft' : 'Industry pathways'}</h2>
      <div className="controls">
        <label>Aircraft context
          <select value={selected?.id ?? (aircraft ? 'unavailable' : '')} onChange={(event) => select(event.currentTarget.value)}>
            <option value="">Whole industry</option>
            {aircraft && !selected && <option value="unavailable" disabled>Aircraft context unavailable</option>}
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
      </div>
      {detail && paths.map((path) => {
        const link = path.aircraft.find((option) => option.id === aircraft);
        return link && (
          <p key={path.id}>
            <strong>{{ documented: 'Documented component', representative: 'Representative component context', unknown: 'Component evidence unavailable' }[link.evidenceType]}</strong>{' '}
            <a href={link.href}>{link.name}</a> · <a href={link.partHref}>{link.part}</a>.
            {link.scope && <> {link.scope}</>}
            {' '}The scenario below labels the evidence for each modeled dependency separately.
            {link.source && <> <a href={link.source.url}>{link.source.publisher} · {link.source.locator}</a>.</>}
          </p>
        );
      })}
      {!detail && (
        <ul>
          {filtered.map((path) => (
            <li key={path.id}><a href={aircraft ? `${path.href}?aircraft=${encodeURIComponent(aircraft)}` : path.href}>{path.name}</a></li>
          ))}
        </ul>
      )}
      {aircraft && !selected && <p role="status">There is no indexed pathway for this aircraft selection.</p>}
    </section>
  );
}
