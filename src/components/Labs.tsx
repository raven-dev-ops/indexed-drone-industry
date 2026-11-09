import { useEffect, useId, useState } from 'react';
import { gramsForceToNewtons, propulsion, survey } from '../lib/calculations';
import { benchSetups } from '../lib/component-data';
import './labs.css';

const number = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 2 });

function Fields<T extends Record<string, number>>({
  values,
  labels,
  change,
  readOnly = [],
}: {
  values: T;
  labels: Record<keyof T, string>;
  change: (values: T) => void;
  readOnly?: (keyof T)[];
}) {
  return (
    <div className="form-grid">
      {(Object.keys(values) as (keyof T)[]).map((key) => (
        <label key={String(key)}>
          {labels[key]}
          <input
            type="number"
            step="any"
            readOnly={readOnly.includes(key)}
            value={Number.isFinite(values[key]) ? values[key] : ''}
            onChange={(event) =>
              change({ ...values, [key]: event.currentTarget.valueAsNumber })
            }
          />
        </label>
      ))}
    </div>
  );
}

const propulsionDefault = {
  mass: 1.5,
  rotors: 4,
  thrust: 4.1,
  watts: 58,
  energy: 75,
  reserve: 20,
};
const surveyDefault = {
  altitude: 80,
  crossFov: 65,
  alongFov: 45,
  sideOverlap: 65,
  frontOverlap: 75,
  speed: 8,
};

export function PropulsionLab() {
  const id = useId();
  const [values, setValues] = useState(propulsionDefault);
  const [setupId, setSetupId] = useState('');
  const [throttle, setThrottle] = useState<number>();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setup = benchSetups.find(({ id }) => id === params.get('setup'));
    if (setup) {
      setSetupId(setup.id);
      setThrottle(Number(params.get('point')));
    }
  }, []);
  const setup = benchSetups.find(({ id }) => id === setupId);
  const point =
    setup?.points.find((row) => row.throttle === throttle) ?? setup?.points[0];
  const inputs = point
    ? { ...values, thrust: gramsForceToNewtons(point.thrustGf), watts: point.watts }
    : values;
  const result = propulsion(inputs);
  return (
    <section className="panel" id="propulsion-lab" aria-labelledby={id}>
      <span className="eyebrow">Lab 01</span>
      <h2 id={id}>Propulsion &amp; Endurance Lab</h2>
      <p>
        Load a published motor and propeller test point or enter your own data.
        Thrust and electrical power refer to one rotor at the same operating point.
      </p>
      <div className="form-grid lab-bench-controls">
        <label>
          Motor and propeller setup
          <select
            value={setupId}
            onChange={(event) => {
              setSetupId(event.currentTarget.value);
              setThrottle(undefined);
            }}
          >
            <option value="">Custom inputs</option>
            {benchSetups.map((row) => (
              <option key={row.id} value={row.id}>
                {row.motor} · {row.propeller}
              </option>
            ))}
          </select>
        </label>
        {setup && point && (
          <label>
            Measured operating point
            <select
              value={point.throttle}
              onChange={(event) =>
                setThrottle(Number(event.currentTarget.value))
              }
            >
              {setup.points.map((row) => (
                <option key={row.throttle} value={row.throttle}>
                  {row.throttle}% throttle · {row.thrustGf} gf · {row.watts} W
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {setup && point && (
        <p className="note" aria-live="polite">
          Manufacturer static bench point at {setup.voltage} V and {point.rpm.toLocaleString('en-US')} rpm.
          Reported thrust is {point.thrustGf} gf and electrical power is {point.watts} W per rotor.
          Ambient conditions and the ESC model are unspecified for these rows.
          {' '}<a href={setup.source.url}>{setup.source.publisher}</a> · {setup.source.locator}.
        </p>
      )}
      <Fields
        values={inputs}
        change={(next) =>
          setValues(point ? { ...next, thrust: values.thrust, watts: values.watts } : next)
        }
        readOnly={point ? ['thrust', 'watts'] : []}
        labels={{
          mass: 'Aircraft mass (kg)',
          rotors: 'Number of rotors',
          thrust: 'Thrust per rotor (N)',
          watts: 'Electrical power per rotor (W)',
          energy: 'Battery energy (Wh)',
          reserve: 'Battery reserve (%)',
        }}
      />
      <div aria-live="polite">
        {result ? (
          <div className="stats-grid">
            <div className="stat">
              <strong>{number(result.ratio)}×</strong>
              <span>Thrust to weight</span>
            </div>
            <div className="stat">
              <strong>
                {result.minutes === null
                  ? 'Unavailable'
                  : `${number(result.minutes)} min`}
              </strong>
              <span>Energy at entered power</span>
            </div>
            <div className="stat">
              <strong>{number(inputs.rotors * inputs.watts)} W</strong>
              <span>Total rotor power</span>
            </div>
          </div>
        ) : (
          <p className="note warm">
            Enter positive finite values, a whole number of rotors, and a
            reserve from 0% to less than 100%.
          </p>
        )}
        {result?.minutes === null && (
          <p className="note warm">
            The entered rotor thrust is below the aircraft’s weight.
          </p>
        )}
      </div>
      <p className="note">
        Energy divided by total rotor electrical draw gives time at that draw.
        A near-hover point is needed to estimate hover duration. These calculations
        exclude avionics draw, battery voltage sag and aerodynamic interactions
        between rotors. The presets apply only to the reported bench configurations.
      </p>
      <div className="actions">
        <button
          type="button"
          className="button secondary small"
          onClick={() => {
            setValues(propulsionDefault);
            setSetupId('');
            setThrottle(undefined);
          }}
        >
          Reset lab
        </button>
        <a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/propeller-thrust/">
          NASA thrust model
        </a>
        <a href="https://m-selig.ae.illinois.edu/props/propDB.html">
          UIUC measurements
        </a>
      </div>
    </section>
  );
}

function SurveyPreview({
  width,
  length,
  lines,
  photos,
}: NonNullable<ReturnType<typeof survey>>) {
  const description = useId();
  const title = useId();
  const diagramWidth = 360;
  const diagramHeight = 220;
  const normalizer = Math.max(width, length);
  const scale = Math.min(
    (diagramWidth - 40) / (width / normalizer + 2 * (lines / normalizer)),
    (diagramHeight - 36) / (length / normalizer + 3 * (photos / normalizer)),
  );
  const scaled = (value: number) => (value / normalizer) * scale;
  const xs = [-1, 0, 1].map((line) => diagramWidth / 2 + scaled(lines) * line);
  const ys = [-1.5, -0.5, 0.5, 1.5].map((shot) => diagramHeight / 2 + scaled(photos) * shot);
  const footprintWidth = scaled(width);
  const footprintLength = scaled(length);
  return (
    <figure className="survey-preview">
      <svg
        viewBox={`0 0 ${diagramWidth} ${diagramHeight}`}
        role="img"
        aria-labelledby={title}
        aria-describedby={description}
      >
        <title id={title}>Survey footprint and flight-line preview</title>
        <desc id={description}>
          Twelve image footprints in a three-line sample. Line centers are {number(lines)} meters apart
          and photo centers along a line are {number(photos)} meters apart.
        </desc>
        {xs.flatMap((x, line) => ys.map((y, shot) => (
          <rect
            key={`${line}-${shot}`}
            x={x - footprintWidth / 2}
            y={y - footprintLength / 2}
            width={footprintWidth}
            height={footprintLength}
            className="survey-footprint"
          />
        )))}
        {xs.map((x, line) => (
          <g key={line}>
            <line
              x1={x}
              x2={x}
              y1={ys[0] - 5}
              y2={ys[3] + 5}
              className="survey-track"
            />
            {ys.map((y, shot) => (
              <circle key={shot} cx={x} cy={y} r="2.6" className="survey-capture" />
            ))}
          </g>
        ))}
      </svg>
      <figcaption>
        Sample of three flight lines and four photos per line. Rectangles show individual
        footprints, dashed lines show the flight tracks, and dots show capture positions.
        The view fits to the sample as you change the inputs.
      </figcaption>
    </figure>
  );
}

export function SurveyLab() {
  const id = useId();
  const [values, setValues] = useState(surveyDefault);
  const result = survey(values);
  return (
    <section className="panel" id="survey-lab" aria-labelledby={id}>
      <span className="eyebrow">Lab 02</span>
      <h2 id={id}>Survey Coverage Lab</h2>
      <p>
        Change the camera view and overlap to see how a flat-ground survey
        scales.
      </p>
      <Fields
        values={values}
        change={setValues}
        labels={{
          altitude: 'Height above ground (m)',
          crossFov: 'Cross-track field of view (°)',
          alongFov: 'Along-track field of view (°)',
          sideOverlap: 'Side overlap (%)',
          frontOverlap: 'Forward overlap (%)',
          speed: 'Ground speed (m/s)',
        }}
      />
      <div aria-live="polite">
        {result ? (
          <div className="stats-grid">
            <div className="stat">
              <strong>
                {number(result.width)} × {number(result.length)} m
              </strong>
              <span>Image footprint</span>
            </div>
            <div className="stat">
              <strong>{number(result.lines)} m</strong>
              <span>Line spacing</span>
            </div>
            <div className="stat">
              <strong>{number(result.photos)} m</strong>
              <span>Photo spacing</span>
            </div>
            <div className="stat">
              <strong>{number(result.seconds)} s</strong>
              <span>Photo interval</span>
            </div>
            <div className="stat">
              <strong>{number(result.hectaresPerHour)} ha/h</strong>
              <span>Ideal coverage rate</span>
            </div>
          </div>
        ) : (
          <p className="note warm">
            Use positive height and speed, fields of view between 0° and 180°,
            and overlap from 0% to less than 100%.
          </p>
        )}
      </div>
      {result && <SurveyPreview {...result} />}
      <p className="note">
        The estimate assumes level ground, a downward-facing camera, and
        uninterrupted straight lines. Each footprint dimension is twice the
        height multiplied by the tangent of half its field of view.
      </p>
      <div className="actions">
        <button
          type="button"
          className="button secondary small"
          onClick={() => setValues(surveyDefault)}
        >
          Reset lab
        </button>
        <a href="https://docs.opendronemap.org/flying/">
          OpenDroneMap overlap guidance
        </a>
      </div>
    </section>
  );
}
