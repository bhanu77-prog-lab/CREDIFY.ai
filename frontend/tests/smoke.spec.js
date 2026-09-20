import { expect, test } from '@playwright/test'

const FAKE_KYC =
  'Dear Customer, your SBI account will be blocked within 2 hours due to incomplete KYC. Update immediately at http://sbi-verify-kyc.info/update'
const GENUINE_OTP = 'Your OTP for login is 738291. Do not share this OTP with anyone.'

/** Collects console errors and page exceptions so every test can assert on them. */
function watchConsole(page) {
  const problems = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
    // React warnings (keys, act, invalid props) come through as warnings.
    if (message.type() === 'warning' && /React|Warning:/i.test(message.text())) {
      problems.push(`react warning: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  return problems
}

test('landing page renders and the live mini-scanner returns a real verdict', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Know if it')
  await expect(page.getByRole('link', { name: 'Scan a message free' }).first()).toBeVisible()

  // The hero scanner is pre-filled with a real scam SMS and calls the real API.
  await page.getByRole('button', { name: 'Check this message' }).click()
  await expect(page.getByText('High Risk').first()).toBeVisible({ timeout: 20_000 })

  expect(problems).toEqual([])
})

test('scanner flags a fake KYC message and clears a genuine OTP alert', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/scanner')

  const box = page.getByRole('textbox', { name: /to check/i })

  await box.fill(FAKE_KYC)
  await page.getByRole('button', { name: 'Check for scam' }).click()
  await expect(page.getByRole('heading', { name: 'This looks like a scam' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('heading', { name: 'Why we flagged this' })).toBeVisible()
  await expect(page.getByText('Do this', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Do not do this', { exact: true }).first()).toBeVisible()

  // A genuine bank OTP alert must come back Safe - the headline false-positive case.
  await page.getByRole('button', { name: 'Scan another' }).click()
  await box.fill(GENUINE_OTP)
  await page.getByRole('button', { name: 'Check for scam' }).click()
  await expect(page.getByRole('heading', { name: 'Nothing suspicious found' })).toBeVisible({
    timeout: 20_000,
  })

  expect(problems).toEqual([])
})

test('dashboard loads every widget with real data', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: 'Fraud overview' })).toBeVisible()

  for (const label of [
    'Total scans',
    'High-risk detected',
    'Threats blocked',
    'Estimated money protected',
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 20_000 })
  }

  for (const widget of [
    'Scans over time',
    'Scam categories',
    'Risk by channel',
    'Top flagged indicators',
  ]) {
    await expect(page.getByRole('heading', { name: widget })).toBeVisible()
  }

  // Charts are inline SVG, so their presence is the proof they rendered.
  await expect(page.locator('svg.chart').first()).toBeVisible({ timeout: 20_000 })

  // The KPI must show a real number, not the loading placeholder.
  const total = page.locator('.stat__value').first()
  await expect(total).not.toHaveText('—', { timeout: 20_000 })

  expect(problems).toEqual([])
})

test('theme toggle switches themes and persists across a reload', async ({ page }) => {
  await page.goto('/')
  const root = page.locator('html')
  const before = await root.getAttribute('data-theme')

  await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click()
  const after = await root.getAttribute('data-theme')
  expect(after).not.toBe(before)

  await page.reload()
  await expect(root).toHaveAttribute('data-theme', after)
})

test('sign in with the demo account and reach scan history', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/login')

  await page.getByLabel('Email').fill('demo@scamshield.in')
  await page.getByLabel('Password').fill('Demo@123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

  await page.goto('/history')
  await expect(page.getByRole('heading', { name: 'Your scans' })).toBeVisible()

  expect(problems).toEqual([])
})

test('threat intel lookup reports a known-bad indicator', async ({ page }) => {
  await page.goto('/intel')
  await expect(page.getByRole('heading', { name: 'Shared blocklist' })).toBeVisible()

  await page.getByLabel('Value to look up').fill('sbi-kyc-verify.info')
  await page.getByRole('button', { name: 'Check the blocklist' }).click()
  await expect(page.getByText(/has been reported/i).first()).toBeVisible({ timeout: 15_000 })
})

test('every page is clean and fits at 360px', async ({ page }) => {
  // One sweep covering the pages the focused tests above do not open, asserting
  // both that nothing overflows and that no page logs an error or React warning.
  const problems = watchConsole(page)
  await page.setViewportSize({ width: 360, height: 780 })

  for (const path of ['/', '/scanner', '/dashboard', '/community', '/intel', '/about', '/login']) {
    await page.goto(path)
    await page.waitForTimeout(700)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1)
    expect(problems, `console problems after visiting ${path}`).toEqual([])
  }
})

test('every page is clean at desktop width in dark theme', async ({ page }) => {
  const problems = watchConsole(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('scamshield-theme', 'dark'))

  for (const path of ['/', '/scanner', '/dashboard', '/community', '/intel', '/about', '/gallery']) {
    await page.goto(path)
    await page.waitForTimeout(700)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(problems, `console problems after visiting ${path}`).toEqual([])
  }
})

test('skip link is reachable by keyboard from the top of the page', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
})
