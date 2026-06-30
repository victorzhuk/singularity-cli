import { describe, expect, it } from 'vitest';
import { verifyUpstreamRuntime } from '../../src/upstream/runtime.js';

const P0_METHODS = [
  'listTasks',
  'getTask',
  'createTask',
  'updateTask',
  'deleteTask',
  'listProjects',
  'getProject',
  'createProject',
  'updateProject',
];

describe('mcpb bundle structure', () => {
  it('ApiClient exposes all P0 methods', async () => {
    const { discovery } = await verifyUpstreamRuntime();
    for (const method of P0_METHODS) {
      expect(discovery.client.functions, `missing method: ${method}`).toContain(method);
    }
  });

  it('adapterMap covers P0 adapter methods', async () => {
    const { discovery } = await verifyUpstreamRuntime();
    for (const method of P0_METHODS) {
      expect(discovery.adapterMap[method], `missing adapterMap entry: ${method}`).toBeDefined();
      expect(discovery.adapterMap[method]?.source).toBe('ApiClient');
    }
  });

  it('discovery.modules has entries', async () => {
    const { discovery } = await verifyUpstreamRuntime();
    expect(Object.keys(discovery.modules).length).toBeGreaterThan(0);
  });
});
