import { describe, it, expect } from 'vitest';
import {
  buildTaskDate,
  buildNotifications,
  buildCreateTaskPayload,
  buildUpdateTaskPayload,
} from '../../src/commands/tasks.js';
import { BaseTaskGroupMissingError, ValidationFailedError } from '../../src/core/errors.js';
import { requireConfirmation } from '../../src/core/guards.js';
import type { ExecutionContext } from '../../src/core/context.js';

const fakeCtx: ExecutionContext = {
  cwd: '/',
  json: false,
  color: false,
  dryRun: false,
  timeoutMs: 30000,
};

describe('buildTaskDate', () => {
  it('date-only returns useTime false, date unchanged', () => {
    const r = buildTaskDate('2026-07-01', 'GMT+3');
    expect(r).toEqual({ date: '2026-07-01', useTime: false });
  });

  it('space-separated datetime with GMT+3', () => {
    const r = buildTaskDate('2026-07-01 15:00', 'GMT+3');
    expect(r).toEqual({ date: '2026-07-01T15:00:00+03:00', useTime: true });
  });

  it('T-separated datetime with GMT+3', () => {
    const r = buildTaskDate('2026-07-01T15:00', 'GMT+3');
    expect(r).toEqual({ date: '2026-07-01T15:00:00+03:00', useTime: true });
  });

  it('UTC timezone uses +00:00 offset', () => {
    const r = buildTaskDate('2026-07-01T12:00', 'UTC');
    expect(r).toEqual({ date: '2026-07-01T12:00:00+00:00', useTime: true });
  });

  it('GMT timezone uses +00:00 offset', () => {
    const r = buildTaskDate('2026-07-01T12:00', 'GMT');
    expect(r).toEqual({ date: '2026-07-01T12:00:00+00:00', useTime: true });
  });

  it('explicit offset is preserved as-is', () => {
    const r = buildTaskDate('2026-07-01T10:00', '+05:30');
    expect(r).toEqual({ date: '2026-07-01T10:00:00+05:30', useTime: true });
  });

  it('GMT-5 becomes -05:00', () => {
    const r = buildTaskDate('2026-07-01T10:00', 'GMT-5');
    expect(r).toEqual({ date: '2026-07-01T10:00:00-05:00', useTime: true });
  });
});

describe('buildNotifications', () => {
  it('notifyMinutes parses and sets notify:1, descending order', () => {
    const r = buildNotifications({ notifyMinutes: '15,60' });
    expect(r.notify).toBe(1);
    expect(r.notifyMinutes).toEqual([60, 15]);
    expect('alarmNotify' in r).toBe(false);
  });

  it('notify:true sets notify:1 only', () => {
    const r = buildNotifications({ notify: true });
    expect(r).toEqual({ notify: 1 });
  });

  it('alarmNotify:true sets alarmNotify:true only', () => {
    const r = buildNotifications({ alarmNotify: true });
    expect(r).toEqual({ alarmNotify: true });
  });

  it('empty opts returns empty object', () => {
    const r = buildNotifications({});
    expect(r).toEqual({});
  });

  it('alarmNotify:false does not set alarmNotify key', () => {
    const r = buildNotifications({ alarmNotify: false });
    expect('alarmNotify' in r).toBe(false);
  });

  it('notifyMinutes with alarmNotify:true combines both', () => {
    const r = buildNotifications({ notifyMinutes: '60,15', alarmNotify: true });
    expect(r.notify).toBe(1);
    expect(r.notifyMinutes).toEqual([60, 15]);
    expect(r.alarmNotify).toBe(true);
  });
});

describe('buildCreateTaskPayload', () => {
  it('uses priority 1 when none configured', () => {
    const p = buildCreateTaskPayload(
      { title: 'T', tags: [] },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: 'g1', priority: 1, timezone: 'GMT+0' },
    );
    expect(p.priority).toBe(1);
  });

  it('uses configured priority when set', () => {
    const p = buildCreateTaskPayload(
      { title: 'T', tags: [] },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: 'g1', priority: 3, timezone: 'GMT+0' },
    );
    expect(p.priority).toBe(3);
  });

  it('throws BaseTaskGroupMissingError when no baseTaskGroupId', () => {
    expect(() => buildCreateTaskPayload(
      { title: 'T', tags: [] },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: undefined, priority: 1, timezone: 'GMT+0' },
    )).toThrow(BaseTaskGroupMissingError);
  });

  it('isNote only set when requested', () => {
    const withNote = buildCreateTaskPayload(
      { title: 'T', tags: [], isNote: true },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: 'g1', priority: 1, timezone: 'GMT+0' },
    );
    expect(withNote.isNote).toBe(true);

    const noNote = buildCreateTaskPayload(
      { title: 'T', tags: [] },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: 'g1', priority: 1, timezone: 'GMT+0' },
    );
    expect('isNote' in noNote).toBe(false);
  });

  it('date-only sets useTime false', () => {
    const p = buildCreateTaskPayload(
      { title: 'T', tags: [], date: '2026-07-01' },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: 'g1', priority: 1, timezone: 'GMT+0' },
    );
    expect(p.useTime).toBe(false);
  });

  it('timed date sets useTime true', () => {
    const p = buildCreateTaskPayload(
      { title: 'T', tags: [], date: '2026-07-01 15:00' },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: 'g1', priority: 1, timezone: 'GMT+3' },
    );
    expect(p.useTime).toBe(true);
  });

  it('notifyMinutes sets notify:1 and notifyMinutes, no alarmNotify', () => {
    const p = buildCreateTaskPayload(
      { title: 'T', tags: [], notifyMinutes: '15,60' },
      fakeCtx,
      { projectId: 'p1', baseTaskGroupId: 'g1', priority: 1, timezone: 'GMT+0' },
    );
    expect(p.notify).toBe(1);
    expect(p.notifyMinutes).toEqual([60, 15]);
    expect('alarmNotify' in p).toBe(false);
  });
});

describe('buildUpdateTaskPayload', () => {
  it('empty opts throws ValidationFailedError', () => {
    expect(() => buildUpdateTaskPayload('id', {}, { timezone: 'GMT+0' })).toThrow(ValidationFailedError);
  });

  it('title-only yields exactly { id, title }', () => {
    const p = buildUpdateTaskPayload('task-1', { title: 'New' }, { timezone: 'GMT+0' });
    expect(p).toEqual({ id: 'task-1', title: 'New' });
  });

  it('multiple fields contain only those fields plus id', () => {
    const p = buildUpdateTaskPayload('t1', { title: 'A', priority: 2 }, { timezone: 'GMT+0' });
    expect(Object.keys(p).sort()).toEqual(['id', 'priority', 'title']);
  });
});

describe('requireConfirmation', () => {
  it('human mode without --yes throws ConfirmationRequiredError', () => {
    const ctx: ExecutionContext = { cwd: '/', json: false, color: false, dryRun: false, timeoutMs: 30000 };
    expect(() => requireConfirmation(ctx, {})).toThrow();
  });

  it('JSON mode without --yes and without --force throws ConfirmationRequiredError', () => {
    const ctx: ExecutionContext = { cwd: '/', json: true, color: false, dryRun: false, timeoutMs: 30000 };
    expect(() => requireConfirmation(ctx, {})).toThrow();
  });

  it('human mode with --yes does not throw', () => {
    const ctx: ExecutionContext = { cwd: '/', json: false, color: false, dryRun: false, timeoutMs: 30000 };
    expect(() => requireConfirmation(ctx, { yes: true })).not.toThrow();
  });

  it('JSON mode with --force does not throw', () => {
    const ctx: ExecutionContext = { cwd: '/', json: true, color: false, dryRun: false, timeoutMs: 30000 };
    expect(() => requireConfirmation(ctx, { force: true })).not.toThrow();
  });
});
