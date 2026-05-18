import { expect, test } from '@playwright/test';

async function apiRequest(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:8787${pathname}`, {
    ...options,
    headers: {
      ...(options.body && typeof options.body !== 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(JSON.stringify(payload));
  return payload.data;
}

test('creates project, saves text node, and restores after reload', async ({ page }) => {
  const projectName = `PW Smoke ${Date.now()}`;
  const nodeText = `Playwright saved text ${Date.now()}`;
  let projectSlug = '';

  await page.goto('/');
  await page.getByTestId('create-project').click();
  await page.getByTestId('input-dialog-field').fill(projectName);
  await page.getByTestId('input-dialog-confirm').click();
  await expect(page.getByText(projectName)).toBeVisible();

  const projects = await apiRequest('/api/project/list');
  projectSlug = projects.find((project) => project.name === projectName)?.slug || '';
  expect(projectSlug).toBeTruthy();

  try {
    await page.getByTestId('add-text-node').click();
    await page.getByTestId('text-node-textarea').fill(nodeText);
    await page.getByRole('button', { name: /保存当前工程/ }).click();
    await expect(page.getByTestId('save-status')).toHaveText('已保存');

    await page.reload();
    await page.getByTestId(`open-project-${projectSlug}`).click();
    await expect(page.getByTestId('text-node-textarea')).toHaveValue(nodeText);
  } finally {
    if (projectSlug) {
      await apiRequest(`/api/project/delete?slug=${encodeURIComponent(projectSlug)}`, { method: 'DELETE' });
    }
  }
});
