// Original geometry recipes. Coordinates describe editorial schematics, not CAD.
// X is left/right, Y is up, and a negative Z is forward.
const graphite = 0x344553;
const carbon = 0x293946;
const silver = 0xa7bac5;
const blue = 0x3987a0;
const orange = 0xf3a545;
const teal = 0x58c3b2;
const cream = 0xe1e7d9;
const dark = 0x182a34;

const source = (title, publisher, url, locator) => ({ title, publisher, url, locator });
const px4 = source('Airframes', 'PX4', 'https://docs.px4.io/v1.14/en/dev_airframes/', 'Planes, multicopters and VTOL airframes');

function quad(spread = 1.5, depth = 1.38) {
  return [[-spread, -depth], [spread, -depth], [-spread, depth], [spread, depth]];
}

function prop(model, x, y, z, radius, angle = 0, vertical = false) {
  const part = model.part('propeller', [x * .22, .82, z * .22]);
  const blades = part.group([x, y, z], vertical ? [Math.PI / 2, 0, angle] : [0, angle, 0]);
  model.cylinder(blades, [0, 0, 0], radius * .14, .06, dark);
  for (const direction of [-1, 1]) {
    const blade = model.group(blades, [direction * radius * .52, 0, 0], [0, -.13, direction * .09]);
    model.oval(blade, [0, 0, 0], [radius * .51, .027, radius * .105], graphite);
    model.oval(blade, [direction * radius * .36, 0, 0], [radius * .10, .026, radius * .07], orange);
  }
}

function rotor(model, x, y, z, radius, index, motorSize = .18, angle) {
  const motor = model.part('motor', [x * .42, .27, z * .42]);
  model.cylinder(motor, [x, y, z], motorSize, motorSize * .8, graphite);
  model.cylinder(motor, [x, y + motorSize * .45, z], motorSize * .79, .032, silver);
  model.cylinder(motor, [x, y + motorSize * .62, z], motorSize * .32, .06, dark);
  prop(model, x, y + motorSize * .8, z, radius, angle ?? (index % 2 ? .55 : 2.3));
}

function arms(model, frame, mounts, { height = .08, start = .29, width = .11, folded = false, color = carbon } = {}) {
  mounts.forEach(([x, z]) => {
    if (folded) {
      const joint = [x * .55, height, z * .69];
      model.beam(frame, [x * start, height, z * start], joint, width * 1.32, color);
      model.beam(frame, joint, [x, height, z], width, color);
      model.cylinder(frame, joint, width * 1.4, width * 1.18, silver);
    } else {
      model.rod(frame, [x * start, height, z * start], [x, height, z], width, color);
      model.cylinder(frame, [x, height, z], width * 1.7, width, color);
    }
  });
}

function skids(model, width = .75, top = -.15, bottom = -.78, length = 1.12, color = graphite) {
  const gear = model.part('landing-gear', [0, -.95, .38]);
  for (const side of [-1, 1]) {
    const x = side * width;
    model.rod(gear, [x, bottom, -length], [x, bottom, length], .057, color);
    for (const fore of [-1, 1]) {
      model.rod(gear, [side * width * .57, top, fore * length * .53], [x, bottom, fore * length * .65], .057, color);
      model.oval(gear, [x, bottom, fore * length], [.062, .059, .11], silver);
    }
  }
}

function battery(model, position, dimensions, explode = [.56, .72, .52]) {
  const pack = model.part('battery', explode);
  model.box(pack, position, dimensions, teal);
  model.box(pack, [position[0], position[1] + dimensions[1] * .53, position[2]], [dimensions[0] * .72, .028, dimensions[2] * .76], graphite);
  for (const step of [-1, 0, 1]) {
    model.box(pack, [position[0] + step * dimensions[0] * .19, position[1] + dimensions[1] * .6, position[2] + dimensions[2] * .2], [dimensions[0] * .083, .019, dimensions[2] * .2], cream);
  }
}

function camera(model, position, size, thermal = false) {
  const part = model.part('payload', [0, -.71, -1]);
  model.box(part, position, [size * 1.55, size * .9, size * .82], dark);
  const [x, y, z] = position;
  const lenses = thermal ? [[-.42, -.14, .23], [.32, .02, .31], [-.28, .30, .15]] : [[0, 0, .39]];
  for (const [offset, lift, radius] of lenses) {
    const lens = [x + offset * size, y + lift * size, z - size * .46];
    model.cylinder(part, lens, size * radius, size * .23, silver, [Math.PI / 2, 0, 0]);
    model.cylinder(part, [lens[0], lens[1], lens[2] - size * .14], size * radius * .74, size * .09, blue, [Math.PI / 2, 0, 0]);
  }
}

function electronics(model, id, position, dimensions, explode) {
  const board = model.part(id, explode);
  model.box(board, position, dimensions, id === 'gnss' ? blue : teal);
  model.box(board, [position[0], position[1] + .067, position[2]], [dimensions[0] * .47, .067, dimensions[2] * .50], dark);
  for (const side of [-1, 1]) {
    model.box(board, [position[0] + side * dimensions[0] * .39, position[1] + .043, position[2]], [dimensions[0] * .085, .029, dimensions[2] * .82], orange);
  }
}

function x500(model) {
  const frame = model.part('frame', [0, .35, .68]);
  const mounts = quad(1.54, 1.54);
  const outline = [[-.52, -.61], [.52, -.61], [.63, -.48], [.63, .48], [.52, .61], [-.52, .61], [-.63, .48], [-.63, -.48]];
  model.plate(frame, outline, .24, .036, carbon);
  model.plate(frame, outline, -.02, .036, graphite);
  for (const [x, z] of quad(.47, .47)) {
    model.cylinder(frame, [x, .11, z], .042, .24, silver);
    model.cylinder(frame, [x, .28, z], .065, .035, silver);
  }
  arms(model, frame, mounts, { width: .074 });
  for (const x of [-.26, .26]) {
    model.rod(frame, [x, -.16, -1.1], [x, -.16, 1.1], .046, silver);
  }
  skids(model, .76, -.05, -.91, .95, carbon);
  electronics(model, 'pdb', [0, .10, 0], [.65, .04, .68], [.7, -.52, -.62]);
  mounts.forEach(([x, z], index) => {
    const esc = model.part('esc', [x * .35, -.65, z * .39]);
    const escMount = esc.group([x * .74, -.045, z * .74], [0, Math.atan2(x, z), 0]);
    model.box(escMount, [0, 0, 0], [.17, .08, .31], teal);
    model.box(escMount, [0, -.005, -.14], [.095, .043, .08], orange);
    rotor(model, x, .15, z, .99, index, .16);
  });
}

function mini(model) {
  const frame = model.part('frame', [0, .52, -.25]);
  const mounts = [[-1.30, -1.34], [1.30, -1.34], [-1.32, 1.06], [1.32, 1.06]];
  model.oval(frame, [0, .04, .09], [.48, .26, 1.02], cream);
  model.oval(frame, [0, -.105, -.2], [.44, .15, .7], silver);
  model.oval(frame, [0, .20, -.55], [.40, .13, .33], silver);
  arms(model, frame, mounts, { height: -.01, start: .28, width: .10, folded: true, color: cream });
  mounts.forEach(([x, z], i) => rotor(model, x, .025, z, .59, i, .15));
  battery(model, [0, .03, .64], [.62, .21, .56], [0, .42, 1.28]);
  camera(model, [0, -.18, -.84], .37);
}

function fpv(model, real = false) {
  const frame = model.part('frame', [0, -.45, -.35]);
  const mounts = quad(1.02, .94);
  model.oval(frame, [0, .05, -.08], [.47, .235, .98], real ? graphite : blue);
  model.box(frame, [0, .13, .12], [.72, .21, 1.24], graphite);
  for (const [x, z] of mounts) {
    model.ring(frame, [x, .095, z], .69, .058, real ? graphite : teal);
    model.ring(frame, [x, -.11, z], .69, .031, carbon);
    for (let index = 0; index < 3; index++) {
      const angle = index * Math.PI * 2 / 3;
      model.rod(frame, [x + .68 * Math.cos(angle), -.11, z + .68 * Math.sin(angle)], [x + .68 * Math.cos(angle), .095, z + .68 * Math.sin(angle)], .033, graphite);
    }
  }
  arms(model, frame, mounts, { width: .075, height: -.065 });
  mounts.forEach(([x, z], i) => rotor(model, x, -.02, z, .54, i, .138));
  battery(model, [0, .27, .32], [.58, .14, .70], [0, .61, 1.06]);
  camera(model, [0, .15, -.95], .31);
}

function matrice(model) {
  const frame = model.part('frame', [0, .5, -.3]);
  const mounts = [[-1.43, -1.46], [1.43, -1.46], [-1.51, 1.26], [1.51, 1.26]];
  model.plate(frame, [[-.48, -.92], [.48, -.92], [.67, -.57], [.58, .8], [.39, 1.08], [-.39, 1.08], [-.58, .8], [-.67, -.57]], .02, .45, graphite);
  model.oval(frame, [0, .27, -.15], [.53, .16, .87], carbon);
  arms(model, frame, mounts, { height: .12, width: .12, folded: true });
  mounts.forEach(([x, z], i) => rotor(model, x, .16, z, .73, i, .17));
  for (const side of [-1, 1]) {
    battery(model, [side * .26, .09, .81], [.43, .23, .54], [side * .95, .46, .71]);
  }
  const gear = model.part('landing-gear', [0, -.88, .54]);
  for (const [x, z] of mounts.slice(0, 2)) {
    model.beam(gear, [x, .10, z], [x * .84, -.55, z * .97], .10, graphite);
  }
  model.beam(gear, [-.40, -.1, .73], [-.43, -.57, .82], .09, graphite);
  model.beam(gear, [.40, -.1, .73], [.43, -.57, .82], .09, graphite);
  camera(model, [0, -.35, -.62], .62, true);
}

function agras(model) {
  const frame = model.part('frame', [0, .56, -.42]);
  const mounts = quad(1.74, 1.56);
  model.box(frame, [0, .13, 0], [1.15, .24, 1.54], graphite);
  model.oval(frame, [0, .19, -.46], [.59, .37, .60], cream);
  arms(model, frame, mounts, { width: .13, height: .11, folded: true });
  mounts.forEach(([x, z], i) => rotor(model, x, .22, z, 1.08, i, .235, i % 2 ? .63 : 2.5));
  battery(model, [0, .33, .66], [.75, .31, .77], [0, .71, .91]);
  skids(model, .77, -.16, -.78, .94);
  const sprayer = model.part('payload', [0, -.58, -.83]);
  model.oval(sprayer, [0, -.26, .04], [.57, .37, .72], cream);
  model.cylinder(sprayer, [0, .11, -.32], .18, .065, orange);
  for (const side of [-1, 1]) {
    model.rod(sprayer, [side * .32, -.48, .23], [side * 1.14, -.48, .77], .041, teal);
    model.cylinder(sprayer, [side * 1.14, -.57, .77], .088, .15, orange);
  }
}

function crazyflie(model) {
  const frame = model.part('frame', [0, -.55, .38]);
  const mounts = quad(1.14, 1.14);
  model.plate(frame, [[-.58, -.65], [.53, -.65], [.65, -.52], [.65, .54], [.52, .67], [-.53, .67], [-.65, .54], [-.65, -.54]], .0, .067, dark);
  arms(model, frame, mounts, { width: .071, height: .014 });
  const flight = model.part('flight-controller', [.87, .65, -.39]);
  model.box(flight, [0, .05, -.12], [.42, .093, .35], graphite);
  for (const side of [-1, 1]) {
    model.box(flight, [side * .38, .041, .06], [.074, .065, .8], orange);
  }
  const radio = model.part('radio', [-.79, .38, -.55]);
  model.box(radio, [0, .045, -.50], [.41, .075, .16], cream);
  mounts.forEach(([x, z], i) => {
    rotor(model, x, -.04, z, .57, i, .111);
    model.cylinder(frame, [x, -.13, z], .15, .33, cream);
  });
  battery(model, [0, .19, .12], [.54, .17, .76], [0, .83, .77]);
}

function wingtra(model) {
  const wing = model.part('wing', [0, .37, .55]);
  model.plate(wing, [[-2.5, -.11], [-2.34, -.60], [-.59, -.91], [.59, -.91], [2.34, -.60], [2.5, -.11], [2.30, .34], [.59, .57], [-.59, .57], [-2.30, .34]], .0, .13, orange);
  const frame = model.part('frame', [0, .69, -.34]);
  model.oval(frame, [0, .02, -.10], [.45, .31, 1.06], orange);
  model.oval(frame, [0, .24, -.28], [.37, .13, .46], graphite);
  const gear = model.part('landing-gear', [0, -.82, .71]);
  for (const side of [-1, 1]) {
    model.beam(gear, [side * 2.23, .04, -.1], [side * 2.31, .32, .82], .098, graphite);
    model.beam(gear, [side * 2.23, .00, -.1], [side * 2.31, -.28, .82], .098, graphite);
  }
  model.beam(gear, [0, .08, .47], [0, .10, 1.13], .13, graphite);
  for (const side of [-1, 1]) {
    const motor = model.part('motor', [side * .8, .25, -.49]);
    model.cylinder(motor, [side * 1.12, .05, -.82], .15, .35, graphite, [Math.PI / 2, 0, 0]);
    prop(model, side * 1.12, .05, -1.02, .57, side * .25, true);
    battery(model, [side * .20, .115, .17], [.30, .17, .59], [side * .65, .62, .38]);
  }
  camera(model, [0, -.28, -.23], .28);
}

function plane(model, variant) {
  const delivery = variant === 'delivery';
  const vtol = variant !== 'plane';
  const frame = model.part('frame', [0, .46, -.48]);
  const wing = model.part('wing', [0, .37, .66]);
  model.oval(frame, [0, .07, .03], [delivery ? .45 : .29, delivery ? .37 : .27, 1.85], cream);
  model.oval(frame, [0, .23, -.79], [.24, .24, .64], blue);
  model.plate(wing, [[-2.3, -.23], [-2.24, -.52], [-.68, -.79], [.68, -.79], [2.24, -.52], [2.3, -.23], [2.17, .22], [.54, .42], [-.54, .42], [-2.17, .22]], .03, .12, cream);
  model.plate(wing, [[-.74, 1.06], [.74, 1.06], [.85, 1.35], [.55, 1.58], [-.55, 1.58], [-.85, 1.35]], .065, .08, cream);
  model.beam(wing, [0, .06, 1.25], [0, .50, 1.60], .13, cream);
  if (vtol) {
    const mounts = quad(1.31, .86);
    for (const side of [-1, 1]) {
      model.rod(frame, [side * 1.31, .025, -1.1], [side * 1.31, .025, 1.19], .071, graphite);
    }
    mounts.forEach(([x, z], i) => rotor(model, x, .11, z, .54, i, .12));
  }
  const motor = model.part('motor', [0, .29, vtol ? .74 : -.74]);
  model.cylinder(motor, [0, .09, vtol ? 1.72 : -1.80], .15, .23, graphite, [Math.PI / 2, 0, 0]);
  prop(model, 0, .09, vtol ? 1.87 : -1.94, .55, .19, true);
  if (delivery) {
    const droid = model.part('payload', [0, -1.13, -.18]);
    model.oval(droid, [0, -.24, -.07], [.32, .20, .49], blue);
    model.box(droid, [0, -.35, -.04], [.47, .16, .53], cream);
    model.rod(droid, [0, -.21, -.07], [0, -.34, -.07], .028, silver);
  } else {
    battery(model, [0, .19, .07], [.42, .17, .67]);
    electronics(model, 'flight-controller', [0, .11, .64], [.35, .05, .27], [-.7, .66, .40]);
    camera(model, [0, -.19, -.46], .24);
  }
}

function multirotor(model, hex = false) {
  const mounts = hex ? Array.from({ length: 6 }, (_, i) => [1.67 * Math.cos(i * Math.PI / 3), 1.67 * Math.sin(i * Math.PI / 3)]) : quad(1.4, 1.37);
  const frame = model.part('frame', [0, -.41, .52]);
  model.cylinder(frame, [0, .03, 0], hex ? .74 : .63, .15, graphite);
  model.cylinder(frame, [0, .17, 0], hex ? .61 : .52, .12, blue);
  arms(model, frame, mounts, { width: hex ? .082 : .10 });
  mounts.forEach(([x, z], i) => rotor(model, x, .17, z, hex ? .61 : .68, i));
  battery(model, [0, .07, .45], [.54, .18, .58]);
  electronics(model, 'flight-controller', [0, .23, -.22], [.47, .05, .41], [-.63, .72, -.46]);
  electronics(model, 'gnss', [0, .43, .20], [.24, .044, .27], [0, 1.16, .52]);
  model.rod(frame, [0, .20, .20], [0, .43, .20], .026, silver);
  skids(model, .51, -.04, -.52, .68);
  if (hex) camera(model, [0, -.24, -.36], .36);
}

function helicopter(model) {
  const frame = model.part('frame', [0, -.37, -.35]);
  model.oval(frame, [0, .02, -.45], [.52, .44, 1.02], blue);
  model.oval(frame, [0, .14, -.84], [.42, .38, .64], dark);
  model.rod(frame, [0, .12, .32], [0, .17, 1.97], .095, graphite);
  model.beam(frame, [0, .11, 1.82], [0, .57, 2.03], .13, blue);
  const motor = model.part('motor', [0, .65, -.33]);
  model.cylinder(motor, [0, .50, -.35], .19, .19, silver);
  model.rod(motor, [0, .56, -.35], [0, .76, -.35], .057, graphite);
  prop(model, 0, .78, -.35, 2.13, -.18);
  const tail = model.part('propeller', [.66, .25, .53]);
  const hub = tail.group([.12, .22, 1.91], [0, 0, Math.PI / 2]);
  model.cylinder(hub, [0, 0, 0], .085, .10, silver);
  model.oval(hub, [0, 0, 0], [.32, .023, .058], graphite);
  model.oval(hub, [0, 0, 0], [.059, .023, .32], graphite);
  battery(model, [0, -.03, .03], [.42, .22, .62], [.76, .57, .56]);
  electronics(model, 'flight-controller', [0, .31, -.52], [.34, .04, .30], [-.63, .68, -.43]);
  skids(model, .55, -.26, -.61, .96);
}

const specific = (id, label, build, evidence, fidelity = 'exterior-schematic') => ({
  id, label, build, source: evidence, fidelity, representative: false,
});
const representative = (id, label, build, evidence = px4) => ({
  id, label, build, source: evidence, fidelity: 'representative', representative: true,
});

export const airframes = [
  specific('holybro-x500-v2', 'Holybro X500 V2 ARF (SKU 30125)', x500, source('X500 V2 Kits', 'Holybro', 'https://holybro.com/collections/multicopter-kit/products/x500-v2-kits', 'Kit contents, frame details and mechanical specifications'), 'documented-assembly'),
  specific('dji-mini-4-pro', 'DJI Mini 4 Pro', mini, source('DJI Mini 4 Pro', 'DJI', 'https://www.dji.com/mini-4-pro', 'Product imagery and camera overview')),
  specific('dji-avata-2', 'DJI Avata 2', (model) => fpv(model, true), source('DJI Avata 2', 'DJI', 'https://www.dji.com/avata-2', 'Product imagery and integrated propeller guards')),
  specific('dji-matrice-30t', 'DJI Matrice 30T', matrice, source('Matrice 30 Series', 'DJI Enterprise', 'https://enterprise.dji.com/matrice-30', 'M30T aircraft and integrated camera system')),
  specific('dji-agras-t70p', 'DJI Agras T70P', agras, source('DJI Agras T70P specs', 'DJI Agriculture', 'https://ag.dji.com/t70p/specs', 'Aircraft, propulsion and spraying system')),
  specific('wingtraone-gen-ii', 'WingtraOne GEN II', wingtra, source('Getting started with WingtraOne GEN II', 'Wingtra', 'https://knowledge.wingtra.com/en/register-your-drone', 'Aircraft component diagram and battery compartment')),
  specific('crazyflie-2-1-plus', 'Bitcraze Crazyflie 2.1+', crazyflie, source('Crazyflie 2.1+', 'Bitcraze', 'https://www.bitcraze.io/products/crazyflie-2-1-plus/', 'Aircraft imagery, mechanics and radio')),
  specific('zipline-platform-2', 'Zipline Platform 2', (model) => plane(model, 'delivery'), source('Zipline Dallas–Fort Worth final environmental assessment', 'FAA', 'https://www.faa.gov/uas/advanced_operations/nepa_and_drones/20251223_Zipline_Final_DFW_EA_508_signed.pdf', 'Section 2.2.1 and Figure 2.2-4, P2 Zip aircraft')),
  representative('class-quad', 'Quadcopter', (model) => multirotor(model)),
  representative('class-fpv', 'Guarded FPV quadcopter', (model) => fpv(model), source('DJI Avata 2', 'DJI', 'https://www.dji.com/avata-2', 'Integrated propeller guards as one FPV configuration')),
  representative('class-multirotor', 'Hexacopter', (model) => multirotor(model, true)),
  representative('class-fixed-wing', 'Fixed-wing aircraft', (model) => plane(model, 'plane')),
  representative('class-vtol', 'Lift-and-cruise VTOL', (model) => plane(model, 'vtol')),
  representative('class-helicopter', 'Single-main-rotor helicopter', helicopter),
];
