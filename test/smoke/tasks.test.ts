import { describe, it, expect } from 'vitest';

const hasCredentials =
  !!process.env.SINGULARITY_REFRESH_TOKEN &&
  !!process.env.SINGULARITY_SMOKE_PROJECT_ID;

describe.skipIf(!hasCredentials)('smoke: task lifecycle', () => {
  const projectId = process.env.SINGULARITY_SMOKE_PROJECT_ID!;

  it('creates, fetches, completes, and deletes a task', async () => {
    const { createSingularityAdapter } = await import('../../src/adapters/singularity/index.js');

    const adapter = createSingularityAdapter({
      baseUrl: process.env.SINGULARITY_API_URL ?? 'https://api.singularity-app.com',
      accessToken: process.env.SINGULARITY_REFRESH_TOKEN!,
      requestTimeoutMs: 30_000,
    });

    const created = (await adapter.createTask({
      title: `smoke-${Date.now()}`,
      projectId,
      priority: 1,
      useTime: false,
      notify: 0,
      alarmNotify: false,
      notifyMinutes: [],
    })) as { id: string; projectId: string };

    expect(created.id).toBeTruthy();
    expect(created.projectId).toBe(projectId);

    const fetched = (await adapter.getTask(created.id)) as { id: string };
    expect(fetched.id).toBe(created.id);

    await adapter.completeTask({ id: created.id });
    await adapter.deleteTask(created.id);
  }, 60_000);
});
