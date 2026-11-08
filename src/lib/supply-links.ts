import { aircraft, collections, componentClaims, parts, pathwayContexts } from './data';
import { page } from './navigation';

export const supplyPaths = collections.supply.map((scenario) => {
  const context = pathwayContexts.find((row) => row.id === scenario.id);
  return {
    id: scenario.id,
    name: scenario.name,
    href: page('supply', scenario.id),
    aircraft: context?.aircraft.map((link) => ({
      id: link.id,
      name: aircraft.find((row) => row.id === link.id)!.name,
      href: `${page('aircraft', link.id)}?part=${link.part}#aircraft-anatomy`,
      part: parts.find((row) => row.id === link.part)!.name,
      partHref: page('parts', link.part),
      evidenceType: link.evidenceType,
      scope: link.scope,
      source: componentClaims.find((claim) => claim.aircraft === link.id && claim.part === link.part)?.source,
    })) ?? [],
  };
});
