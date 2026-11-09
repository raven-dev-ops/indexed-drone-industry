import { expect, test, type Locator } from '@playwright/test';

async function waitForIsland(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
}

test('bench rows keep reported thrust and electrical power together', async ({ page }) => {
  await page.goto('./labs/');
  const lab = page.getByRole('region', { name: 'Propulsion & Endurance Lab' });
  await waitForIsland(lab);
  const setup = lab.getByRole('combobox', { name: 'Motor and propeller setup' });
  const point = lab.getByRole('combobox', { name: 'Measured operating point' });
  const watts = lab.getByRole('spinbutton', { name: 'Electrical power per rotor (W)' });
  await watts.fill('55');
  await setup.selectOption('mn2212-kv780-9545b');
  await point.selectOption('65');
  await expect(watts).toHaveValue('59.2');
  await expect(watts).toHaveAttribute('readonly', '');
  await expect(lab.getByText(/476 gf and electrical power is 59.2 W/)).toBeVisible();
  await expect(lab.getByRole('link', { name: 'T-Motor' })).toHaveAttribute('href', /mn2212/);
  await setup.selectOption('mn4004-kv300-13x44');
  await expect(point).toHaveValue('50');
  await expect(watts).toHaveValue('22');
  await expect(lab.getByText(/311 gf and electrical power is 22 W/)).toBeVisible();
  await setup.selectOption('');
  await expect(watts).toBeEditable();
  await expect(watts).toHaveValue('55');
});

test('survey preview updates spacing and clears invalid output', async ({ page }) => {
  await page.goto('./labs/');
  const lab = page.getByRole('region', { name: 'Survey Coverage Lab' });
  await waitForIsland(lab);
  const preview = lab.getByRole('img', { name: 'Survey footprint and flight-line preview' });
  const sideOverlap = lab.getByRole('spinbutton', { name: 'Side overlap (%)' });
  await expect(preview).toHaveAccessibleDescription(/35\.68 meters apart/);
  const track = preview.locator('line').first();
  const previousX = await track.getAttribute('x1');
  await sideOverlap.fill('50');
  await expect(preview).toHaveAccessibleDescription(/50\.97 meters apart/);
  await expect(track).not.toHaveAttribute('x1', previousX ?? '');
  await sideOverlap.fill('100');
  await expect(preview).toHaveCount(0);
  await lab.getByRole('button', { name: 'Reset lab' }).click();
  await expect(preview).toHaveAccessibleDescription(/35\.68 meters apart/);
});

test('mission and component comparisons preserve evidence and deep links', async ({ page }) => {
  await page.goto('./compare/');
  const mission = page.getByRole('combobox', { name: 'Comparison mission' });
  await waitForIsland(mission);
  await mission.selectOption('enterprise');
  await expect(page).toHaveURL(/mission=enterprise/);
  const first = page.getByRole('combobox', { name: 'Aircraft 1' });
  const second = page.getByRole('combobox', { name: 'Aircraft 2' });
  await expect(first).toHaveValue('dji-mavic-3e');
  await expect(second).toHaveValue('wingtraone-gen-ii');
  await expect(first.getByRole('option', { name: 'DJI Avata 2' })).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Aircraft specification comparison' }).getByRole('rowheader').first()).toContainText('Sensors');
  await page.reload();
  await expect(mission).toHaveValue('enterprise');
  await expect(second).toHaveValue('wingtraone-gen-ii');
  await mission.selectOption('');
  await expect(first.getByRole('option', { name: 'DJI Avata 2' })).toHaveCount(1);
  const compare = page.getByRole('region', { name: 'Component comparison' });
  await waitForIsland(compare);
  const category = compare.getByRole('combobox', { name: 'Component category' });
  await category.selectOption('battery');
  await expect(compare.getByRole('table', { name: 'Battery component comparison' }).getByText('28.4 Wh')).toBeVisible();
  await expect(compare.getByRole('link', { name: /DJI · DJI Mini 4 Pro/ })).toHaveAttribute('href', 'https://www.dji.com/mini-4-pro/specs');
  await category.selectOption('avionics');
  await expect(compare.getByText('STM32H753')).toBeVisible();
  await category.selectOption('payload');
  await expect(compare.getByText('1,280 × 1,024 pixels')).toBeVisible();
  await category.selectOption('propulsion');
  await compare.getByRole('link', { name: /Open T-Motor MN4004/ }).click();
  await expect(page).toHaveURL(/setup=mn4004-kv300-13x44&point=65#propulsion-lab$/);
  await expect(page.getByRole('combobox', { name: 'Measured operating point' })).toHaveValue('65');
  await expect(page.getByText(/477 gf and electrical power is 41 W/)).toBeVisible();
});
