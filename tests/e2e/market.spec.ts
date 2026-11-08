import { expect, test } from '@playwright/test';

const us2025Sales = 'a[href$="/market/us-asdc-spray-sales-2025/"]';

test('market groups keep sales, shares, and activity separate as filters change', async ({ page }) => {
  await page.goto('./market/');
  await expect(page.getByRole('heading', { name: 'Market', level: 1, exact: true })).toBeVisible();
  for (const heading of ['Aircraft shipments and unit sales', 'Market shares', 'Registrations, fleets, and delivery activity']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  const rows = page.locator('[data-market-row]');
  const usSales = rows.filter({ has: page.locator(us2025Sales) });
  const japanInspection = rows.filter({ has: page.locator('a[href$="/market/jp-juav-inspection-sales-2024/"]') });
  const japanSpray = rows.filter({ has: page.locator('a[href$="/market/jp-maff-spray-sales-fy-2024/"]') });
  const usFleet = rows.filter({ has: page.locator('a[href$="/market/us-active-fleet-2025/"]') });
  await expect(usSales).toBeVisible();
  await expect(usSales).toContainText('3,711 aircraft');
  await expect(japanInspection).toBeVisible();
  await expect(japanInspection).toContainText('266 aircraft');
  await expect(page.getByText(/^Revenue share/).first()).toBeVisible();
  await expect(page.getByText(/^Unit-sales share/).first()).toBeVisible();

  const geography = page.getByRole('combobox', { name: 'Geography', exact: true });
  const segment = page.getByRole('combobox', { name: 'Segment', exact: true });
  await geography.selectOption({ label: 'United States' });
  await expect(usSales).toBeVisible();
  await expect(japanInspection).toBeHidden();
  await expect(japanSpray).toBeHidden();
  await expect(usFleet).toBeVisible();
  await segment.selectOption({ label: 'Agricultural spray drones' });
  await expect(geography.locator('option:checked')).toHaveText('United States');
  await expect(usSales).toBeVisible();
  await expect(usFleet).toBeHidden();

  await geography.selectOption({ index: 0 });
  await expect(segment.locator('option:checked')).toHaveText('Agricultural spray drones');
  await expect(japanSpray).toBeVisible();
  await expect(japanInspection).toBeHidden();
  await segment.selectOption({ index: 0 });
  await expect(usSales).toBeVisible();
  await expect(japanInspection).toBeVisible();
  await expect(usFleet).toBeVisible();
});

test('a market record links to evidence and the CSV carries metric provenance', async ({ page, request }) => {
  await page.goto('./market/');
  const detail = page.locator(us2025Sales);
  await expect(detail).toBeVisible();
  await detail.click();
  await expect(page).toHaveURL(/\/market\/[^/]+\/$/);
  await expect(page.getByText(/3,711/).first()).toBeVisible();
  await expect(page.locator('main a[href*="2025-ASDC-Impact-Survey-Results.pdf"]').first()).toBeVisible();

  const csv = await request.get('./data/v1/market.csv');
  expect(csv.ok()).toBe(true);
  const text = await csv.text();
  expect(text.split('\n')[0]).toContain('denominator');
  expect(text).toContain('3711');
  expect(text).toContain('2025-ASDC-Impact-Survey-Results.pdf');
});
