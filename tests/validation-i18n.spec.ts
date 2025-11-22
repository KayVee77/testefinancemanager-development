import { test, expect } from '@playwright/test';

/**
 * Validation Internationalization Tests
 * Tests that form validation messages are localized (LT/EN) and do not show browser-native messages
 */

test.describe('Transaction Form Validation - Lithuanian', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Login with test user (assuming default test credentials)
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('text=Apžvalga');
    
    // Verify we're in Lithuanian (default)
    await expect(page.locator('text=Apžvalga')).toBeVisible();
  });

  test('should show Lithuanian validation error when amount is empty', async ({ page }) => {
    // Open transaction form
    await page.click('button:has-text("Pridėti transakciją")');
    
    // Wait for modal to open
    await page.waitForSelector('text=Pridėti transakciją');
    
    // Try to submit with empty amount
    await page.click('button[type="submit"]:has-text("Pridėti")');
    
    // Check for Lithuanian error message (NOT browser native)
    await expect(page.locator('text=Suma yra privaloma.')).toBeVisible();
    
    // Verify no browser-native validation tooltip
    const amountInput = page.locator('input[type="number"]');
    const validationMessage = await amountInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBe(''); // Should be empty since we removed 'required'
  });

  test('should show Lithuanian error when amount is zero', async ({ page }) => {
    await page.click('button:has-text("Pridėti transakciją")');
    await page.waitForSelector('text=Pridėti transakciją');
    
    // Fill form with zero amount
    await page.fill('input[type="number"]', '0');
    await page.fill('input[type="text"]', 'Test transaction');
    await page.selectOption('select', { index: 1 }); // Select first category
    
    await page.click('button[type="submit"]:has-text("Pridėti")');
    
    // Verify Lithuanian error for positive amount
    await expect(page.locator('text=Suma turi būti didesnė už 0.')).toBeVisible();
  });

  test('should show Lithuanian error when amount is negative', async ({ page }) => {
    await page.click('button:has-text("Pridėti transakciją")');
    await page.waitForSelector('text=Pridėti transakciją');
    
    await page.fill('input[type="number"]', '-10');
    await page.fill('input[type="text"]', 'Test transaction');
    await page.selectOption('select', { index: 1 });
    
    await page.click('button[type="submit"]:has-text("Pridėti")');
    
    await expect(page.locator('text=Suma turi būti didesnė už 0.')).toBeVisible();
  });

  test('should show Lithuanian error when description is empty', async ({ page }) => {
    await page.click('button:has-text("Pridėti transakciją")');
    await page.waitForSelector('text=Pridėti transakciją');
    
    await page.fill('input[type="number"]', '50');
    // Leave description empty
    await page.selectOption('select', { index: 1 });
    
    await page.click('button[type="submit"]:has-text("Pridėti")');
    
    await expect(page.locator('text=Įveskite aprašymą.')).toBeVisible();
    
    // Verify no browser validation
    const descInput = page.locator('input[type="text"]');
    const validationMessage = await descInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBe('');
  });

  test('should show Lithuanian error when category is not selected', async ({ page }) => {
    await page.click('button:has-text("Pridėti transakciją")');
    await page.waitForSelector('text=Pridėti transakciją');
    
    await page.fill('input[type="number"]', '50');
    await page.fill('input[type="text"]', 'Test transaction');
    // Don't select category
    
    await page.click('button[type="submit"]:has-text("Pridėti")');
    
    await expect(page.locator('text=Pasirinkite kategoriją.')).toBeVisible();
  });

  test('should clear errors when user starts typing', async ({ page }) => {
    await page.click('button:has-text("Pridėti transakciją")');
    await page.waitForSelector('text=Pridėti transakciją');
    
    // Submit empty form to trigger errors
    await page.click('button[type="submit"]:has-text("Pridėti")');
    
    // Verify error appears
    await expect(page.locator('text=Suma yra privaloma.')).toBeVisible();
    
    // Start typing in amount field
    await page.fill('input[type="number"]', '50');
    
    // Error should disappear
    await expect(page.locator('text=Suma yra privaloma.')).not.toBeVisible();
  });
});

test.describe('Transaction Form Validation - English', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Login
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('text=Apžvalga');
    
    // Switch to English
    await page.click('button:has-text("EN")');
    
    // Verify language switched
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show English validation error when amount is empty', async ({ page }) => {
    await page.click('button:has-text("Add Transaction")');
    await page.waitForSelector('text=Add Transaction');
    
    await page.click('button[type="submit"]:has-text("Add")');
    
    // Check for English error message
    await expect(page.locator('text=Amount is required.')).toBeVisible();
    
    // Verify no browser-native validation
    const amountInput = page.locator('input[type="number"]');
    const validationMessage = await amountInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBe('');
  });

  test('should show English error when amount is zero', async ({ page }) => {
    await page.click('button:has-text("Add Transaction")');
    await page.waitForSelector('text=Add Transaction');
    
    await page.fill('input[type="number"]', '0');
    await page.fill('input[type="text"]', 'Test transaction');
    await page.selectOption('select', { index: 1 });
    
    await page.click('button[type="submit"]:has-text("Add")');
    
    await expect(page.locator('text=Amount must be greater than 0.')).toBeVisible();
  });

  test('should show English error when description is empty', async ({ page }) => {
    await page.click('button:has-text("Add Transaction")');
    await page.waitForSelector('text=Add Transaction');
    
    await page.fill('input[type="number"]', '50');
    await page.selectOption('select', { index: 1 });
    
    await page.click('button[type="submit"]:has-text("Add")');
    
    await expect(page.locator('text=Please enter a description.')).toBeVisible();
  });

  test('should show English error when category is not selected', async ({ page }) => {
    await page.click('button:has-text("Add Transaction")');
    await page.waitForSelector('text=Add Transaction');
    
    await page.fill('input[type="number"]', '50');
    await page.fill('input[type="text"]', 'Test transaction');
    
    await page.click('button[type="submit"]:has-text("Add")');
    
    await expect(page.locator('text=Please select a category.')).toBeVisible();
  });
});

test.describe('Language Switching with Validation', () => {
  test('should update validation messages when language is switched', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Login
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('text=Apžvalga');
    
    // Open form in Lithuanian
    await page.click('button:has-text("Pridėti transakciją")');
    await page.waitForSelector('text=Pridėti transakciją');
    
    // Trigger validation error in Lithuanian
    await page.click('button[type="submit"]:has-text("Pridėti")');
    await expect(page.locator('text=Suma yra privaloma.')).toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Switch to English
    await page.click('button:has-text("EN")');
    await page.waitForSelector('text=Dashboard');
    
    // Open form again in English
    await page.click('button:has-text("Add Transaction")');
    await page.waitForSelector('text=Add Transaction');
    
    // Trigger same validation error in English
    await page.click('button[type="submit"]:has-text("Add")');
    await expect(page.locator('text=Amount is required.')).toBeVisible();
    
    // Verify Lithuanian message is NOT visible
    await expect(page.locator('text=Suma yra privaloma.')).not.toBeVisible();
  });
});

test.describe('Auth Form Validation - Already Localized', () => {
  test('should show Lithuanian validation on login form', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Verify we're in Lithuanian
    await expect(page.locator('text=Prisijungimas')).toBeVisible();
    
    // Try to submit empty login form
    await page.click('button[type="submit"]');
    
    // Check for Lithuanian validation errors
    await expect(page.locator('text=El. paštas yra privalomas.')).toBeVisible();
    
    // Verify no browser validation tooltip
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBe('');
  });

  test('should show English validation on login form after language switch', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Switch to English on login screen
    await page.click('button:has-text("EN")');
    
    await expect(page.locator('text=Login')).toBeVisible();
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for English validation
    await expect(page.locator('text=Email is required.')).toBeVisible();
  });
});
