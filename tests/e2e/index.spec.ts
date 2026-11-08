import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function waitForIsland(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
}

test('the teardown leads from a model to its motor, magnet supply and national data', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The drone industry, part by part.');
  await page.getByRole('link', { name: 'Open the X500 teardown' }).click();
  await expect(page).toHaveURL(/\/aircraft\/holybro-x500-v2\/$/);
  const model = page.locator('[data-model="holybro-x500-v2"]');
  await expect(model).toHaveAttribute('data-model-ready', 'true', { timeout: 15_000 });
  await model.getByRole('slider', { name: 'Explode view' }).press('End');
  await expect(model.getByRole('slider', { name: 'Explode view' })).toHaveValue('100');
  await model.getByRole('button', { name: 'Rotate left' }).click();
  await model.getByRole('button', { name: 'Zoom in' }).click();
  await model.getByRole('button', { name: 'Reset' }).click();
  await expect(model.getByRole('slider', { name: 'Explode view' })).toHaveValue('0');
  await model.getByRole('button', { name: 'Motor', exact: true }).click();
  await expect(model.getByRole('heading', { name: 'Motor', exact: true })).toBeVisible();
  await model.getByRole('link', { name: 'Explore this part' }).click();
  await expect(page).toHaveURL(/\/parts\/motor\/$/);
  await page.locator('main a[href$="/supply/motors/"]').first().click();
  await expect(page).toHaveURL(/\/supply\/motors\/$/);
  await expect(page.getByRole('heading', { name: 'Input evidence' })).toBeVisible();
  const atlasLink = page.locator('main a[href*="/atlas/?layer=rare-earths-production"]').first();
  await expect(atlasLink).toBeVisible();
  await atlasLink.click();
  await expect(page.getByRole('combobox', { name: 'Map layer' })).toHaveValue('rare-earths-production');
  const table = page.getByRole('table', { name: /observations/i });
  await expect(table.getByRole('rowheader', { name: 'China', exact: true })).toBeVisible();
  await expect(table.getByRole('link', { name: /geological survey|USGS/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Load interactive map' }).click();
  const map = page.getByRole('region', { name: 'World industry map' });
  await expect(map).toHaveAttribute('data-map-ready', 'true', { timeout: 15_000 });
  expect((await map.locator('.maplibregl-map').boundingBox())?.height).toBeGreaterThan(300);
  await page.getByRole('combobox', { name: 'Country' }).selectOption('CN');
  await expect(table.getByRole('rowheader')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Map layer' }).selectOption('facilities');
  const facilities = page.getByRole('table', { name: 'Filtered facilities' });
  await expect(facilities.getByRole('link').first()).toHaveAttribute('href', /\/facilities\/.+\/$/);
});

test('comparison follows the URL and keeps variant evidence visible', async ({ page }) => {
  await page.goto('./compare/?a=dji-mini-4-pro&b=dji-avata-2');
  await expect(page.getByRole('combobox', { name: 'Aircraft 1' })).toHaveValue('dji-mini-4-pro');
  await expect(page.getByRole('combobox', { name: 'Aircraft 2' })).toHaveValue('dji-avata-2');
  const table = page.getByRole('table', { name: 'Aircraft specification comparison' });
  await expect(table.getByRole('columnheader', { name: /DJI Mini 4 Pro/i })).toBeVisible();
  await expect(table.getByText('Conditions may differ').first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Aircraft 2' }).selectOption('holybro-x500-v2');
  await expect(page).toHaveURL(/\?a=dji-mini-4-pro&b=holybro-x500-v2$/);
  await expect(table.getByRole('columnheader', { name: /Holybro X500/i })).toBeVisible();
});

test('a disruption propagates and resets, and labs handle invalid inputs', async ({ page }) => {
  await page.goto('./supply/motors/');
  const simulator = page.getByRole('region', { name: 'Disruption simulator' });
  await waitForIsland(simulator);
  const ore = simulator.getByRole('button', { name: /^Rare earth ore:/ });
  const aircraft = simulator.getByRole('button', { name: /^Electric aircraft propulsion:/ });
  await expect(aircraft).toHaveAttribute('data-state', 'available');
  await ore.click();
  await expect(ore).toHaveAttribute('aria-pressed', 'true');
  await expect(aircraft).toHaveAttribute('data-state', 'affected');
  await simulator.getByRole('button', { name: 'Reset scenario' }).click();
  await expect(aircraft).toHaveAttribute('data-state', 'available');

  await page.goto('./labs/');
  const propulsion = page.getByRole('region', { name: 'Propulsion & Endurance Lab' });
  await waitForIsland(propulsion);
  const mass = propulsion.getByRole('spinbutton', { name: 'Aircraft mass (kg)' });
  await expect(propulsion.getByText('15.52 min')).toBeVisible();
  await mass.fill('0');
  await expect(propulsion.getByText(/Enter positive finite values/)).toBeVisible();
  await propulsion.getByRole('button', { name: 'Reset lab' }).click();
  await expect(mass).toHaveValue('1.5');
  const survey = page.getByRole('region', { name: 'Survey Coverage Lab' });
  await waitForIsland(survey);
  await survey.getByRole('spinbutton', { name: 'Side overlap (%)' }).fill('100');
  await expect(survey.getByText(/Use positive height and speed/)).toBeVisible();
});

test('the diagram and parts remain usable on mobile without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'WebGL2RenderingContext', { value: undefined });
  });
  await page.goto('./aircraft/holybro-x500-v2/');
  const model = page.locator('[data-model="holybro-x500-v2"]');
  await expect(model.getByText('The 3D view is unavailable. Select parts in the diagram or list.')).toBeVisible();
  const hotspot = model.getByRole('button', { name: 'Locate Motor' });
  await expect(hotspot).toBeVisible();
  await hotspot.focus();
  await page.keyboard.press('Enter');
  await expect(hotspot).toHaveAttribute('aria-pressed', 'true');
  await expect(model.getByRole('button', { name: 'Motor', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(model.getByRole('link', { name: 'Explore this part' })).toHaveAttribute('href', /\/parts\/motor\/$/);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  const audit = await new AxeBuilder({ page }).include('.anatomy').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
});

test('the open data page exposes downloadable records', async ({ page, request }) => {
  await page.goto('./downloads/');
  const downloads = page.locator('main a[href$=".json"], main a[href$=".csv"], main a[href$=".geojson"]');
  await expect(downloads.first()).toBeVisible();
  const urls = await downloads.evaluateAll((links) => links.slice(0, 3).map((link) => (link as HTMLAnchorElement).href));
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.ok(), `${response.status()} for ${url}`).toBe(true);
    expect((await response.body()).length).toBeGreaterThan(0);
  }
});

test('search finds an aircraft and links to its profile under the site base', async ({ page }) => {
  await page.goto('./search/');
  await page.locator('#search-widget input').fill('Holybro X500');
  const result = page.locator('#search-widget a[href$="/aircraft/holybro-x500-v2/"]').first();
  await expect(result).toBeVisible({ timeout: 12_000 });
  await result.click();
  await expect(page).toHaveURL(/\/aircraft\/holybro-x500-v2\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /Holybro X500/i })).toBeVisible();
});
