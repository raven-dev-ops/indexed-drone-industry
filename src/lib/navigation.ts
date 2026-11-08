export const labels: Record<string, string> = {
  aircraft: 'Aircraft',
  parts: 'Parts',
  materials: 'Materials',
  organizations: 'Companies',
  facilities: 'Facilities',
  history: 'History',
  supply: 'Supply chains',
  learn: 'Learning paths',
  bottlenecks: 'Bottlenecks',
  regulations: 'Regulations',
  market: 'Market',
  compare: 'Compare',
  labs: 'Labs',
  atlas: 'World atlas',
  downloads: 'Open data',
  coverage: 'Coverage',
  search: 'Search',
};

export function path(relative = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const target = relative.replace(/^\//, '');
  return `${base}/${target}`;
}

export function page(section: string, id?: string): string {
  return path(id ? `${section}/${id}/` : `${section}/`);
}
