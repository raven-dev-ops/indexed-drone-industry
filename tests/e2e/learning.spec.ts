import { expect, test } from '@playwright/test';

test('guided practice provides feedback and keeps progress across lessons', async ({ page }) => {
  await page.goto('./learn/');
  await expect(page.getByText('0 of 8 lessons completed.')).toBeVisible();
  await page.getByRole('link', { name: /What a drone is made of/ }).click();
  await expect(page.getByRole('link', { name: /Open the X500 V2 teardown/ })).toHaveAttribute('href', /\/aircraft\/holybro-x500-v2\/$/);
  await page.getByRole('radio', { name: 'The frame and motors' }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toHaveText(/Try again/);
  await expect(page.getByText('0 of 8 lessons completed.')).toBeVisible();
  await page.getByRole('radio', { name: 'The flight controller and battery' }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toHaveText(/Correct.*SKU 30125/);
  await expect(page.getByText('1 of 8 lessons completed.')).toBeVisible();
  await page.getByRole('link', { name: /Next lesson.*How a drone flies/ }).click();
  await expect(page.getByText('1 of 8 lessons completed.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 of 8 lessons completed.')).toBeVisible();
  await page.getByRole('link', { name: 'All lessons' }).click();
  const firstLesson = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: /What a drone is made of/ }) });
  await expect(firstLesson.getByText('Completed', { exact: true })).toBeVisible();
});

test('a lesson can be completed when local storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => { throw new DOMException('Storage is unavailable', 'SecurityError'); },
    });
  });
  await page.goto('./learn/flight/');
  await expect(page.getByText(/Progress is available on this page only/)).toBeVisible();
  await page.getByRole('radio', { name: 'It falls' }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toHaveText(/Correct/);
  await expect(page.getByText(/1 of 8 lessons completed/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Next lesson/ })).toBeVisible();
});

test('the seven journeys link aircraft, part, pathway, atlas and history records', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./journeys/');
  const links = await page.locator('main article h2 a').evaluateAll(elements => elements.map(link => (link as HTMLAnchorElement).href));
  expect(links).toHaveLength(7);
  expect(new Set(links).size).toBe(7);
  for (const link of links) {
    await page.goto(link);
    const steps = page.locator('main ol li');
    await expect(steps).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await expect(steps.nth(0)).toContainText('Documented aircraft');
    await expect(steps.nth(4)).toContainText('Documented history');
    const destinations = await steps.locator('h2 a').evaluateAll(elements => elements.map(link => (link as HTMLAnchorElement).href));
    expect(new URL(destinations[2]).searchParams.get('aircraft')).toBe(new URL(destinations[0]).pathname.split('/').at(-2));
    expect(new URL(destinations[3]).searchParams.has('layer')).toBe(true);
    const responses = await Promise.all(destinations.map(destination => request.get(destination)));
    for (const response of responses) expect(response.ok(), response.url()).toBe(true);
  }
  await page.goto('./journeys/public-safety/');
  await expect(page.getByText('Historical scenario', { exact: true })).toBeVisible();
  await expect(page.getByText(/Direct aircraft case/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Sanctions squeeze/ })).toHaveAttribute('href', /\/history\/skydio-battery-2024\/$/);
});
