import { useState } from 'react';

const concepts: Record<
  string,
  {
    name: string;
    label: string;
    unit: string;
    min: number;
    max: number;
    start: number;
    output: string;
    calculate: (value: number) => number;
    text: string;
  }
> = {
  motor: {
    name: 'Motor speed constant',
    label: 'Voltage',
    unit: 'V',
    min: 5,
    max: 24,
    start: 15,
    output: 'rpm at no load',
    calculate: (value) => 920 * value,
    text: 'This idealized example uses a 920 rpm/V speed constant. Actual speed under propeller load also depends on torque, power and the controller.',
  },
  propeller: {
    name: 'Propeller disk area',
    label: 'Propeller diameter',
    unit: 'cm',
    min: 10,
    max: 60,
    start: 25,
    output: 'cm² swept area',
    calculate: (value) => Math.PI * (value / 2) ** 2,
    text: 'The disk is the circle swept by the blades. Disk area grows with the square of diameter.',
  },
  battery: {
    name: 'Energy at a constant load',
    label: 'Usable battery energy',
    unit: 'Wh',
    min: 10,
    max: 180,
    start: 75,
    output: 'minutes at 100 W',
    calculate: (value) => (60 * value) / 100,
    text: 'Usable energy divided by power gives time. Here the load stays constant at 100 W.',
  },
  esc: {
    name: 'Switching duty cycle',
    label: 'Duty cycle',
    unit: '%',
    min: 0,
    max: 100,
    start: 60,
    output: 'V pulse-average voltage',
    calculate: (value) => (12 * value) / 100,
    text: 'A simple 12 V pulse train spends this fraction of its time on. A real motor drive switches multiple phases and controls current dynamically.',
  },
  pdb: {
    name: 'Current on a common feed',
    label: 'Current per branch',
    unit: 'A',
    min: 0,
    max: 20,
    start: 6,
    output: 'A total current',
    calculate: (value) => 4 * value,
    text: 'For four equal branches, their currents add on the common battery feed.',
  },
  'flight-controller': {
    name: 'Sampling interval',
    label: 'Sampling rate',
    unit: 'Hz',
    min: 25,
    max: 1000,
    start: 250,
    output: 'ms between samples',
    calculate: (value) => 1000 / value,
    text: 'Doubling the sampling rate halves the interval between samples. Actual control timing also depends on computation and sensor processing.',
  },
  gnss: {
    name: 'Signal timing and range',
    label: 'Signal timing offset',
    unit: 'ns',
    min: 1,
    max: 100,
    start: 10,
    output: 'm of signal travel',
    calculate: (value) => 0.299792458 * value,
    text: 'Multiply the time offset by the speed of light to see its range equivalent. GNSS position accuracy depends on multiple measurements and receiver corrections.',
  },
  radio: {
    name: 'Signal loss with distance',
    label: 'Distance relative to baseline',
    unit: '×',
    min: 1,
    max: 20,
    start: 2,
    output: 'dB more free-space loss',
    calculate: (value) => 20 * Math.log10(value),
    text: 'The free-space model keeps frequency and antennas fixed. Obstacles, interference, and antenna orientation also affect a real link.',
  },
  payload: {
    name: 'Camera footprint',
    label: 'Height above flat ground',
    unit: 'm',
    min: 10,
    max: 120,
    start: 60,
    output: 'm of image width',
    calculate: (value) => 2 * value * Math.tan(Math.PI / 6),
    text: 'A downward-facing camera with a 60° horizontal field of view sees a wider area as height increases.',
  },
};

export default function PartExplainer({ part }: { part: string }) {
  const concept = concepts[part];
  const [value, setValue] = useState(concept?.start ?? 0);
  if (!concept) return null;
  const result = concept
    .calculate(value)
    .toLocaleString('en-US', { maximumFractionDigits: 2 });
  return (
    <section className="panel section-block">
      <span className="eyebrow">Interactive explainer</span>
      <h2>{concept.name}</h2>
      <p>{concept.text}</p>
      <label className="part-slider">
        {concept.label} ({concept.unit})
        <input
          type="range"
          min={concept.min}
          max={concept.max}
          value={value}
          onChange={(event) => setValue(event.currentTarget.valueAsNumber)}
        />
        <span>
          {value} {concept.unit}
        </span>
      </label>
      <p aria-live="polite" className="note">
        <strong>{result}</strong> {concept.output}
      </p>
    </section>
  );
}
