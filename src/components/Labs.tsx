import { useId, useState } from 'react';
import { propulsion, survey } from '../lib/calculations';

const number = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 2 });

function Fields<T extends Record<string, number>>({
  values,
  labels,
  change,
}: {
  values: T;
  labels: Record<keyof T, string>;
  change: (values: T) => void;
}) {
  return (
    <div className="form-grid">
      {(Object.keys(values) as (keyof T)[]).map((key) => (
        <label key={String(key)}>
          {labels[key]}
          <input
            type="number"
            step="any"
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
  const result = propulsion(values);
  return (
    <section className="panel" aria-labelledby={id}>
      <span className="eyebrow">Lab 01</span>
      <h2 id={id}>Propulsion &amp; Endurance Lab</h2>
      <p>
        Enter a motor and propeller operating point from a bench test or use the
        illustrative values below. Thrust and power refer to one rotor at the
        same operating point.
      </p>
      <Fields
        values={values}
        change={setValues}
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
              <strong>{number(values.rotors * values.watts)} W</strong>
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
        Educational estimate at a constant power draw. Enter a near-hover
        operating point for a hover duration estimate. Real endurance also
        depends on the environment and aircraft systems.
      </p>
      <div className="actions">
        <button
          type="button"
          className="button secondary small"
          onClick={() => setValues(propulsionDefault)}
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

export function SurveyLab() {
  const id = useId();
  const [values, setValues] = useState(surveyDefault);
  const result = survey(values);
  return (
    <section className="panel" aria-labelledby={id}>
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
