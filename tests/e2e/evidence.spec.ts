import { expect, test } from '@playwright/test';

test('documented assemblies show variant claims and preserve material unknowns', async ({ page }) => {
  await page.goto('./aircraft/holybro-x500-v2/?part=motor#aircraft-anatomy');
  const anatomy = page.locator('[data-model="holybro-x500-v2"]');
  await anatomy.scrollIntoViewIfNeeded();
  await expect(anatomy.getByText('Four Holybro 2216 KV920 motors')).toBeVisible();
  await expect(anatomy.getByText('Material evidence (unknown)')).toBeVisible();
  await expect(anatomy.getByRole('link', { name: /Holybro.*30125/ })).toHaveAttribute('href', /holybro\.com/);
  await page.goto('./aircraft/crazyflie-2-1-plus/?part=battery#aircraft-anatomy');
  const crazyflie = page.locator('[data-model="crazyflie-2-1-plus"]');
  await crazyflie.scrollIntoViewIfNeeded();
  await expect(crazyflie.getByText('Schematic of documented assembly')).toBeVisible();
  await expect(crazyflie.getByText('250 mAh lithium-polymer pack')).toBeVisible();
  await expect(crazyflie.getByText('Material evidence (documented)')).toBeVisible();
});

test('industry supply context leads to the aircraft and the recorded Skydio effects', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./supply/?aircraft=skydio-x10');
  const explorer = page.getByRole('region', { name: 'Industry supply explorer' });
  await expect(explorer.getByRole('combobox')).toHaveValue('skydio-x10');
  await expect(explorer.getByRole('link', { name: /motors/i })).toHaveCount(0);
  await explorer.getByRole('link', { name: 'Skydio X10 battery disruption' }).click();
  await expect(page).toHaveURL(/skydio-battery\/\?aircraft=skydio-x10/);
  await expect(page.getByRole('region', { name: 'Aircraft context' }).getByText('Documented component')).toBeVisible();
  const simulator = page.getByRole('region', { name: 'Disruption simulator' });
  await simulator.getByRole('button', { name: /^Established battery supply/ }).click();
  await expect(simulator.getByRole('button', { name: /^Standard battery bundle/ })).toHaveAttribute('data-state', 'indeterminate');
  await expect(simulator.locator('animate')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'What was observed' })).toBeVisible();
  await expect(page.getByText(/allocated one battery per X10 aircraft/)).toBeVisible();
  await page.getByRole('link', { name: 'Read the dated case and evidence' }).click();
  await expect(page).toHaveURL(/history\/skydio-battery-2024\//);
});

test('a second historical case can be replayed and reset', async ({ page }) => {
  await page.goto('./history/gopro-karma-recall-2016/');
  await page.getByRole('link', { name: 'Open the separate simulation' }).click();
  const simulator = page.getByRole('region', { name: 'Disruption simulator' });
  const sales = simulator.getByRole('button', { name: /^Original Karma available for sale/ });
  await simulator.getByRole('button', { name: /^Original battery retention/ }).click();
  await expect(sales).toHaveAttribute('data-state', 'affected');
  await simulator.getByRole('button', { name: 'Reset scenario' }).click();
  await expect(sales).toHaveAttribute('data-state', 'available');
});
