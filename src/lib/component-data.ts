import type { z } from 'zod';
import type { evidence } from './schema';

type ComponentEvidence = z.infer<typeof evidence> & { id: string };

type BenchPoint = {
  throttle: number;
  thrustGf: number;
  watts: number;
  rpm: number;
};

type BenchSetup = {
  id: string;
  motor: string;
  propeller: string;
  voltage: number;
  points: BenchPoint[];
  source: ComponentEvidence;
};

export const benchSetups: BenchSetup[] = [
  {
    id: 'mn2212-kv780-9545b',
    motor: 'T-Motor MN2212 V2.0 KV780',
    propeller: 'T-Motor 9545B',
    voltage: 14.8,
    points: [
      { throttle: 50, thrustGf: 293, watts: 31.08, rpm: 4260 },
      { throttle: 65, thrustGf: 476, watts: 59.2, rpm: 5300 },
      { throttle: 75, thrustGf: 605, watts: 82.88, rpm: 5960 },
    ],
    source: {
      id: 'tmotor-mn2212-v2-test-data',
      title: 'MN2212 V2.0 Motor (Navigator Type)',
      publisher: 'T-Motor',
      url: 'https://store.tmotor.com/product/mn2212-v2-motor-navigator-type.html',
      locator: 'Test Data table, KV780, 14.8 V, T-Motor 9545B rows',
      accessed: '2026-11-08',
      rights: 'Citation only',
    },
  },
  {
    id: 'mn4004-kv300-13x44',
    motor: 'T-Motor MN4004 KV300',
    propeller: 'T-Motor 13 × 4.4 in carbon fiber',
    voltage: 24,
    points: [
      { throttle: 50, thrustGf: 311, watts: 22, rpm: 3173 },
      { throttle: 60, thrustGf: 416, watts: 34, rpm: 3660 },
      { throttle: 65, thrustGf: 477, watts: 41, rpm: 3914 },
    ],
    source: {
      id: 'tmotor-mn4004-kv300-test-data',
      title: 'MN4004 KV300 Motor (Antigravity Type)',
      publisher: 'T-Motor',
      url: 'https://store.tmotor.com/product/mn4004-kv300-motor-antigravity-type.html',
      locator: 'Test Data table, KV300, 24 V, T-Motor 13 × 4.4 CF rows',
      accessed: '2026-11-08',
      rights: 'Citation only',
    },
  },
];

type ComponentColumn = {
  id: string;
  name: string;
  source: ComponentEvidence;
  labQuery?: string;
};

type ComponentComparison = {
  label: string;
  note: string;
  columns: [ComponentColumn, ComponentColumn];
  rows: [label: string, first: string, second: string][];
};

const [mn2212, mn4004] = benchSetups;
const mn2212Point = mn2212.points[1];
const mn4004Point = mn4004.points[2];
const controllerSource = {
  id: 'holybro-controller-comparison',
  title: 'Controller Comparison',
  publisher: 'Holybro',
  url: 'https://docs.holybro.com/autopilot/controller-comparison',
  locator: 'Controller Comparison, Pixhawk 6C and Pixhawk 6X columns',
  accessed: '2026-11-08',
  rights: 'Citation only',
};
const mini4Source = {
  id: 'dji-mini-4-pro-specs',
  title: 'DJI Mini 4 Pro Specs',
  publisher: 'DJI',
  url: 'https://www.dji.com/mini-4-pro/specs',
  accessed: '2026-11-08',
  rights: 'Citation only',
};

export const componentComparisons = {
  propulsion: {
    label: 'Propulsion',
    note: 'These two manufacturer bench rows have nearly equal static thrust. Supply voltage and propeller geometry differ. Throttle percentages apply to each bench setup.',
    columns: [
      {
        id: mn2212.id,
        name: mn2212.motor,
        source: mn2212.source,
        labQuery: `setup=${mn2212.id}&point=${mn2212Point.throttle}`,
      },
      {
        id: mn4004.id,
        name: mn4004.motor,
        source: mn4004.source,
        labQuery: `setup=${mn4004.id}&point=${mn4004Point.throttle}`,
      },
    ],
    rows: [
      ['Propeller', mn2212.propeller, mn4004.propeller],
      ['Supply voltage', `${mn2212.voltage} V`, `${mn4004.voltage} V`],
      ['Throttle setting', `${mn2212Point.throttle}%`, `${mn4004Point.throttle}%`],
      ['Static thrust', `${mn2212Point.thrustGf} gf`, `${mn4004Point.thrustGf} gf`],
      ['Electrical power', `${mn2212Point.watts} W`, `${mn4004Point.watts} W`],
      ['Rotational speed', `${mn2212Point.rpm} rpm`, `${mn4004Point.rpm} rpm`],
    ],
  },
  battery: {
    label: 'Battery',
    note: 'DJI lists both packs for the Mini 4 Pro. The Plus adds energy and mass. DJI lists the Plus as unavailable for sale in Europe.',
    columns: [
      {
        id: 'dji-mini-4-pro-intelligent-flight-battery',
        name: 'DJI Mini 4 Pro Intelligent Flight Battery',
        source: { ...mini4Source, locator: 'Battery, Intelligent Flight Battery values' },
      },
      {
        id: 'dji-mini-3-series-intelligent-flight-battery-plus',
        name: 'DJI Mini 3 Series Intelligent Flight Battery Plus',
        source: { ...mini4Source, locator: 'Battery, Intelligent Flight Battery Plus values' },
      },
    ],
    rows: [
      ['Battery chemistry', 'Li-ion', 'Li-ion'],
      ['Rated energy', '18.96 Wh', '28.4 Wh'],
      ['Rated capacity', '2,590 mAh', '3,850 mAh'],
      ['Nominal voltage', '7.32 V', '7.38 V'],
      ['Approximate mass', '77.9 g', '121 g'],
    ],
  },
  avionics: {
    label: 'Avionics',
    note: 'These flight controllers share two CAN buses. Holybro lists different sensor redundancy and power sensing. Its Pixhawk 6X column includes revision-specific details.',
    columns: [
      { id: 'holybro-pixhawk-6c', name: 'Holybro Pixhawk 6C', source: controllerSource },
      { id: 'holybro-pixhawk-6x-rev8', name: 'Holybro Pixhawk 6X (Rev8)', source: controllerSource },
    ],
    rows: [
      ['Processor', 'STM32H743', 'STM32H753'],
      ['IMU redundancy', 'Double', 'Triple'],
      ['Barometer redundancy', 'Single barometer', 'Double'],
      ['Power sensing', 'Analog', 'Digital'],
      ['CAN buses', '2', '2'],
    ],
  },
  payload: {
    label: 'Payload',
    note: 'These are thermal imaging specifications. Resolution alone cannot determine identification distance because optics, conditions and the target matter.',
    columns: [
      {
        id: 'dji-zenmuse-h20t',
        name: 'DJI Zenmuse H20T',
        source: {
          id: 'dji-zenmuse-h20-specs',
          title: 'Zenmuse H20 Series Specs',
          publisher: 'DJI',
          url: 'https://enterprise.dji.com/zenmuse-h20-series/specs',
          locator: 'Thermal Camera (Zenmuse H20T), Lens, Video Resolution and Pixel Pitch',
          accessed: '2026-11-08',
          rights: 'Citation only',
        },
      },
      {
        id: 'dji-zenmuse-h30t',
        name: 'DJI Zenmuse H30T',
        source: {
          id: 'dji-zenmuse-h30-specs',
          title: 'Zenmuse H30 Series Specs',
          publisher: 'DJI',
          url: 'https://enterprise.dji.com/zenmuse-h30-series/specs',
          locator: 'Infrared Thermal Camera (H30T), Lens, Video Resolution and Pixel Pitch',
          accessed: '2026-11-08',
          rights: 'Citation only',
        },
      },
    ],
    rows: [
      ['Thermal resolution', '640 × 512 pixels', '1,280 × 1,024 pixels'],
      ['Thermal frame rate', '30 frames/s', '30 frames/s'],
      ['Thermal diagonal field of view', '40.6°', '45.2°'],
      ['Thermal pixel pitch', '12 µm', '12 µm'],
    ],
  },
} satisfies Record<string, ComponentComparison>;
