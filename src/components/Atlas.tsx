import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExpressionSpecification, GeoJSONSource, Map as LibreMap, MapMouseEvent } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Facility, Observation } from '../lib/schema';
import 'maplibre-gl/dist/maplibre-gl.css';

const facilityLayer = 'facilities';
const countriesLayer = 'country-fills';
const facilitySource = 'facility-points';
const neutral = '#dce1d9';
const ramp = ['#c1e1cb', '#8bcbb1', '#4aa78f', '#228174', '#12524c'];
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const number = new Intl.NumberFormat('en', { maximumFractionDigits: 6 });

interface Props {
  facilities: Facility[];
  observations: Observation[];
  base: string;
}

type CountryProperties = { ISO_A2_EH?: string; ISO_A2?: string; NAME?: string };
type GeoJSON = Exclude<Parameters<GeoJSONSource['setData']>[0], string>;
type FeatureChoice = { type: 'facility'; id: string } | { type: 'country'; id: string; name: string };

const countryName = (id: string) => names.of(id) ?? id;
const sortedUnique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

function facilitiesData(rows: Facility[]): GeoJSON {
  return {
    type: 'FeatureCollection',
    features: rows.map(({ id, lon, lat, precision }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { id, precision },
    })),
  };
}

function colorFor(value: number, max: number) {
  if (max <= 0) return ramp[0];
  return ramp[Math.min(ramp.length - 1, Math.floor(Math.sqrt(value / max) * ramp.length))];
}

function EvidenceLink({ row }: { row: Observation }) {
  return <><a href={row.source.url}>{row.source.publisher}</a><small>{row.source.locator}</small></>;
}

export default function Atlas({ facilities, observations, base }: Props) {
  const layers = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of observations) if (!byId.has(row.layer)) byId.set(row.layer, row.name);
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [observations]);
  const [layer, setLayer] = useState(facilityLayer);
  const [year, setYear] = useState('');
  const [unit, setUnit] = useState('');
  const [country, setCountry] = useState('');
  const [activity, setActivity] = useState('');
  const [facilityStatus, setFacilityStatus] = useState('');
  const [precision, setPrecision] = useState('');
  const [facilityYear, setFacilityYear] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [choice, setChoice] = useState<FeatureChoice>();
  const [loadMap, setLoadMap] = useState(false);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const mapHost = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const isFacilities = layer === facilityLayer;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('layer');
    if (requested && layers.some(([id]) => id === requested)) setLayer(requested);
    const facility = facilities.find((row) => row.id === params.get('facility'));
    if (facility) {
      setLayer(facilityLayer);
      setFacilityId(facility.id);
      setChoice({ type: 'facility', id: facility.id });
    }
  }, [facilities, layers]);

  const layerRows = useMemo(() => observations.filter((row) => row.layer === layer), [observations, layer]);
  const years = sortedUnique(layerRows.map(({ year }) => year)).reverse();
  const activeYear = years.includes(year) ? year : years[0];
  const yearRows = layerRows.filter((row) => row.year === activeYear);
  const units = sortedUnique(yearRows.map(({ unit }) => unit));
  const activeUnit = units.includes(unit) ? unit : units[0];
  const observationsForPeriod = useMemo(
    () => layerRows.filter((row) => row.year === activeYear && row.unit === activeUnit),
    [layerRows, activeYear, activeUnit],
  );
  const highest = Math.max(0, ...observationsForPeriod.map(({ value }) => value));
  const countryOptions = sortedUnique((isFacilities ? facilities : observationsForPeriod).map((row) => row.country))
    .sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const selectedCountry = countryOptions.includes(country) ? country : '';
  const activities = sortedUnique(facilities.map((row) => row.activity));
  const statuses = sortedUnique(facilities.map((row) => row.status));
  const precisions = sortedUnique(facilities.map((row) => row.precision));
  const facilityYears = sortedUnique(facilities.flatMap((row) => row.observed ? [row.observed.slice(0, 4)] : [])).reverse();
  const visibleFacilities = useMemo(
    () => facilities.filter((row) => (!selectedCountry || row.country === selectedCountry)
      && (!activity || row.activity === activity) && (!facilityStatus || row.status === facilityStatus)
      && (!precision || row.precision === precision) && (!facilityYear || row.observed?.startsWith(facilityYear))
      && (!facilityId || row.id === facilityId)),
    [facilities, selectedCountry, activity, facilityStatus, precision, facilityYear, facilityId],
  );
  const visibleObservations = useMemo(
    () => observationsForPeriod.filter((row) => !selectedCountry || row.country === selectedCountry)
      .sort((a, b) => b.value - a.value || a.country.localeCompare(b.country)),
    [observationsForPeriod, selectedCountry],
  );
  const pickedFacility = choice?.type === 'facility' ? visibleFacilities.find((row) => row.id === choice.id) : undefined;
  const pickedObservation = choice?.type === 'country' ? observationsForPeriod.find((row) => row.country === choice.id) : undefined;
  const layerName = layers.find(([id]) => id === layer)?.[1] ?? 'Country observation';
  const latestMode = useRef(isFacilities);

  function changeLayer(next: string) {
    setLayer(next);
    setChoice(undefined);
    setCountry('');
    setYear('');
    setUnit('');
    const url = new URL(window.location.href);
    setFacilityId('');
    url.searchParams.delete('facility');
    if (next === facilityLayer) url.searchParams.delete('layer');
    else url.searchParams.set('layer', next);
    window.history.replaceState(window.history.state, '', url);
  }

  function showAllFacilities() {
    setFacilityId('');
    setChoice(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete('facility');
    window.history.replaceState(window.history.state, '', url);
  }

  useEffect(() => {
    latestMode.current = isFacilities;
    const map = mapRef.current;
    if (mapStatus !== 'ready' || !map) return;
    const points = map.getSource<GeoJSONSource>(facilitySource);
    points?.setData(facilitiesData(isFacilities ? visibleFacilities : []));
    const colorByCountry = new Map(visibleObservations.map((row) => [row.country, colorFor(row.value, highest)]));
    const [first, ...rest] = colorByCountry;
    const color: string | ExpressionSpecification = !isFacilities && first
      ? ['match', ['coalesce', ['get', 'ISO_A2_EH'], ['get', 'ISO_A2'], ''], ...first, ...rest.flat(), neutral]
      : neutral;
    map.setPaintProperty(countriesLayer, 'fill-color', color);
  }, [isFacilities, visibleFacilities, visibleObservations, highest, mapStatus]);

  useEffect(() => {
    const host = mapHost.current;
    if (!loadMap || !host) return;
    const cancel = new AbortController();
    let map: LibreMap | undefined;

    async function start(container: HTMLDivElement) {
      if (!window.WebGL2RenderingContext) throw new Error('WebGL 2 unavailable');
      const [maplibre, response] = await Promise.all([
        import('maplibre-gl'),
        fetch(`${base}geo/countries.geojson`, { signal: cancel.signal }),
      ]);
      if (!response.ok) throw new Error('Country boundaries unavailable');
      const countries = await response.json() as GeoJSON;
      if (cancel.signal.aborted) return;
      maplibre.setWorkerUrl(workerUrl);
      const instance = new maplibre.Map({
        container,
        center: [15, 27],
        zoom: container.clientWidth < 600 ? 0.1 : 1.12,
        minZoom: 0,
        maxZoom: 12,
        renderWorldCopies: false,
        cooperativeGestures: true,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            countries: { type: 'geojson', data: countries },
            [facilitySource]: { type: 'geojson', data: facilitiesData([]) },
          },
          layers: [
            { id: 'water', type: 'background', paint: { 'background-color': '#dce9eb' } },
            { id: countriesLayer, type: 'fill', source: 'countries', paint: { 'fill-color': neutral } },
            { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': '#98aaa1', 'line-width': .7 } },
            {
              id: 'facility-dots',
              type: 'circle',
              source: facilitySource,
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 7, 8],
                'circle-color': '#114e45',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 1.2,
                'circle-opacity': ['match', ['get', 'precision'], 'site', 1, 'city', .8, .62],
              },
            },
          ],
        },
      });
      map = instance;
      mapRef.current = instance;
      instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
      instance.addControl(new maplibre.AttributionControl({
        compact: true,
        customAttribution: '<a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth boundaries</a>',
      }), 'bottom-right');
      instance.on('error', () => {
        if (!cancel.signal.aborted && !instance.loaded()) setMapStatus('unavailable');
      });
      instance.on('webglcontextlost', () => {
        if (!cancel.signal.aborted) setMapStatus('unavailable');
      });
      instance.once('load', () => {
        if (!cancel.signal.aborted) setMapStatus('ready');
      });
      instance.on('click', (event: MapMouseEvent) => {
        if (latestMode.current) {
          const features = instance.queryRenderedFeatures(event.point, { layers: ['facility-dots'] });
          const id = features[0]?.properties.id;
          if (typeof id === 'string') setChoice({ type: 'facility', id });
        } else {
          const features = instance.queryRenderedFeatures(event.point, { layers: [countriesLayer] });
          const properties = features[0]?.properties as CountryProperties | undefined;
          if (!properties) return;
          const id = properties.ISO_A2_EH ?? properties.ISO_A2 ?? '';
          const name = properties.NAME ?? (id.length === 2 ? countryName(id) : 'Country');
          setChoice({ type: 'country', id, name });
        }
      });
      instance.on('mousemove', (event: MapMouseEvent) => {
        const targets = latestMode.current ? ['facility-dots'] : [countriesLayer];
        const features = instance.queryRenderedFeatures(event.point, { layers: targets });
        instance.getCanvas().style.cursor = features.length ? 'pointer' : '';
      });
    }

    start(host).catch(() => {
      if (!cancel.signal.aborted) setMapStatus('unavailable');
    });
    return () => {
      cancel.abort();
      map?.remove();
      mapRef.current = null;
    };
  }, [base, loadMap]);

  return (
    <div className="stack">
      <div className="controls">
        <label>
          Map layer
          <select value={layer} onChange={(event) => changeLayer(event.currentTarget.value)}>
            <option value={facilityLayer}>Facilities</option>
            {layers.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
        </label>
        <label>
          Country
          <select value={selectedCountry} onChange={(event) => { setCountry(event.currentTarget.value); setChoice(undefined); }}>
            <option value="">All countries</option>
            {countryOptions.map((id) => <option key={id} value={id}>{countryName(id)}</option>)}
          </select>
        </label>
        {isFacilities ? (
          <>
            <label>
              Activity
              <select value={activity} onChange={(event) => { setActivity(event.currentTarget.value); setChoice(undefined); }}>
                <option value="">All activities</option>
                {activities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Facility status
              <select value={facilityStatus} onChange={(event) => { setFacilityStatus(event.currentTarget.value); setChoice(undefined); }}>
                <option value="">All statuses</option>
                {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Location precision
              <select value={precision} onChange={(event) => { setPrecision(event.currentTarget.value); setChoice(undefined); }}>
                <option value="">All precisions</option>
                {precisions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            {facilityYears.length > 0 && <label>
              Facility observation year
              <select value={facilityYear} onChange={(event) => { setFacilityYear(event.currentTarget.value); setChoice(undefined); }}>
                <option value="">All dates</option>
                {facilityYears.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>}
          </>
        ) : (
          <>
            <label>
              Observation year
              <select value={activeYear ?? ''} onChange={(event) => { setYear(event.currentTarget.value); setChoice(undefined); }}>
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            {units.length > 1 && (
              <label>
                Unit
                <select value={activeUnit ?? ''} onChange={(event) => { setUnit(event.currentTarget.value); setChoice(undefined); }}>
                  {units.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            )}
          </>
        )}
      </div>

      <div>
        <div className="map-stage" role="region" aria-label="World industry map" data-map-ready={mapStatus === 'ready'}>
          {loadMap && <div className="map-mount"><div ref={mapHost} style={{ width: '100%', height: '100%' }} /></div>}
          {!loadMap && (
            <div className="map-message">
              <button className="button small" type="button" onClick={() => setLoadMap(true)}>Load interactive map</button>
              {' '}You can also browse the same data in the table below.
            </div>
          )}
          {loadMap && mapStatus === 'loading' && <p className="map-message" role="status">Loading the world map…</p>}
          {mapStatus === 'unavailable' && <p className="map-message" role="status">The map is unavailable. The filters and table below still work.</p>}
        </div>

        {!isFacilities && (
          <p className="note">
            <strong>{layerName} · {activeYear} · {activeUnit}</strong>
            {' '}Color ranges from <span style={{ backgroundColor: ramp[0], paddingInline: '.22rem' }}>0</span>
            {' '}to <span style={{ backgroundColor: ramp[4], color: 'white', paddingInline: '.22rem' }}>{number.format(highest)}</span>.
            {' '}The scale uses a square root so low values remain visible. Gray means no value is shown for the country in this view. Values are national totals or national indicators as defined by the source.
          </p>
        )}
        {(layer === 'electricity' || layer === 'labour') && (
          <p>Eurostat data filtered and normalized by Indexed Drone Industry. Eurostat is not responsible for this adaptation.</p>
        )}
        {isFacilities && <p className="note">Locations use the precision listed for each facility. City and region markers are approximate.</p>}
        {pickedFacility && (
          <p className="note" aria-live="polite">
            <strong><a href={`${base}facilities/${pickedFacility.id}/`}>{pickedFacility.name}</a></strong>
            {' · '}{countryName(pickedFacility.country)}{' · '}{pickedFacility.activity}{' · '}{pickedFacility.precision} precision
          </p>
        )}
        {!isFacilities && choice?.type === 'country' && (
          <p className="note" aria-live="polite">
            <strong>{choice.name}</strong>{' · '}
            {pickedObservation ? <>{number.format(pickedObservation.value)} {pickedObservation.unit} ({pickedObservation.year}). <a href={pickedObservation.source.url}>{pickedObservation.source.publisher}</a></> : 'No published observation in the selected layer, year and unit.'}
          </p>
        )}
      </div>

      {isFacilities ? (
        <>
          {facilityId && <button className="button secondary small" type="button" onClick={showAllFacilities}>Show all facilities</button>}
          <p role="status">{visibleFacilities.length} facilities match the filters.</p>
          {visibleFacilities.length ? (
            <div className="table-wrap">
              <table aria-label="Filtered facilities">
                <thead><tr><th scope="col">Facility</th><th scope="col">Country</th><th scope="col">Activity</th><th scope="col">Status</th><th scope="col">Location precision</th><th scope="col">Observed</th></tr></thead>
                <tbody>
                  {visibleFacilities.map((row) => (
                    <tr key={row.id}>
                      <th scope="row"><a href={`${base}facilities/${row.id}/`}>{row.name}</a></th>
                      <td>{countryName(row.country)}</td><td>{row.activity}</td><td>{row.status}{row.statusReviewed && <small>Reviewed {row.statusReviewed}</small>}</td><td>{row.precision}</td><td>{row.observed ?? 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No facilities match these filters.</p>}
        </>
      ) : (
        <>
          <p role="status">{visibleObservations.length} country observations match the filters.</p>
          {visibleObservations.length ? (
            <div className="table-wrap">
              <table aria-label={`${layerName} observations`}>
                <thead><tr><th scope="col">Country</th><th scope="col">Value</th><th scope="col">Unit</th><th scope="col">Year</th><th scope="col">Source</th></tr></thead>
                <tbody>
                  {visibleObservations.map((row) => (
                    <tr key={row.country}>
                      <th scope="row">{countryName(row.country)}</th>
                      <td>{number.format(row.value)}</td><td>{row.unit}</td><td>{row.year}</td><td><EvidenceLink row={row} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No published observations match these filters.</p>}
        </>
      )}
    </div>
  );
}
