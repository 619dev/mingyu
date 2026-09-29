import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateCompatibilityBundle } from 'mingyu-core/compatibility';

const primary = {
  name: '第一人',
  gender: 'male' as const,
  calendarType: 'solar' as const,
  year: 1990,
  month: 5,
  day: 15,
  timeIndex: 5,
};

const partner = {
  name: '第二人',
  gender: 'female' as const,
  calendarType: 'solar' as const,
  year: 1992,
  month: 8,
  day: 20,
  timeIndex: 7,
};

test('双人 BirthProfile 应直接生成八字合盘证据', async () => {
  const bundle = await calculateCompatibilityBundle(primary, partner, {
    systems: ['bazi'],
  });

  assert.deepEqual(bundle.systems, ['bazi']);
  assert.equal(bundle.primary.bazi?.pillars.hour.ganZhi.length, 2);
  assert.equal(bundle.partner.bazi?.pillars.hour.ganZhi.length, 2);
  assert.equal(bundle.bazi?.people.person1, '第一人');
  assert.equal(bundle.bazi?.people.person2, '第二人');
  assert.equal(bundle.astrolabe, undefined);
  assert.equal(bundle.ziwei, undefined);
});

test('合盘 Bundle 应拒绝未知系统而不是静默忽略', async () => {
  await assert.rejects(
    () =>
      calculateCompatibilityBundle(primary, partner, {
        systems: ['bazi', 'unknown' as never],
      }),
    /不支持的合盘系统/,
  );
});

test('双人档案姓名与方向覆盖下层分析选项中的旧姓名', async () => {
  const bundle = await calculateCompatibilityBundle(primary, partner, {
    systems: ['bazi', 'ziwei'],
    bazi: { person1Name: '旧对方', person2Name: '旧主方' },
    ziwei: { person1Name: '旧对方', person2Name: '旧主方' },
    chart: {
      ziwei: {
        scopes: ['origin'],
        skipAnalysis: true,
        horoscopeContext: { dateStr: '2025-01-01', hourIndex: 6 },
      },
    },
  });
  assert.deepEqual(bundle.bazi?.people, { person1: primary.name, person2: partner.name });
  assert.deepEqual(bundle.ziwei?.people, { person1: primary.name, person2: partner.name });
});

test('单点紫微合盘在时辰边界只读取一次默认运限上下文', async () => {
  const nativeDate = Date;
  const beforeBoundary = nativeDate.parse('2026-09-29T14:59:59.000Z');
  const afterBoundary = nativeDate.parse('2026-09-29T15:00:00.000Z');
  let contextReads = 0;
  globalThis.Date = new Proxy(nativeDate, {
    construct(target, args, newTarget) {
      if (args.length === 0 && new Error().stack?.includes('getDefaultHoroscopeContext')) {
        return Reflect.construct(
          target,
          [contextReads++ === 0 ? beforeBoundary : afterBoundary],
          newTarget,
        );
      }
      return Reflect.construct(target, args, newTarget);
    },
  });

  try {
    const bundle = await calculateCompatibilityBundle(primary, partner, {
      systems: ['ziwei'],
      chart: { ziwei: { scopes: ['origin'], skipAnalysis: true } },
    });
    assert.equal(contextReads, 1);
    assert.deepEqual(bundle.primary.ziwei?.horoscopeContext, {
      dateStr: '2026-09-29',
      hourIndex: 11,
    });
    assert.deepEqual(
      bundle.partner.ziwei?.horoscopeContext,
      bundle.primary.ziwei?.horoscopeContext,
    );
  } finally {
    globalThis.Date = nativeDate;
  }
});

test('单点紫微合盘保留显式 now 与 horoscopeContext 的优先级', async () => {
  const now = new Date('2025-01-01T04:00:00.000Z');
  const fromNow = await calculateCompatibilityBundle(primary, partner, {
    systems: ['ziwei'],
    chart: { ziwei: { scopes: ['origin'], skipAnalysis: true, now } },
  });
  assert.deepEqual(fromNow.primary.ziwei?.horoscopeContext, {
    dateStr: '2025-01-01',
    hourIndex: 6,
  });
  assert.deepEqual(
    fromNow.partner.ziwei?.horoscopeContext,
    fromNow.primary.ziwei?.horoscopeContext,
  );

  const horoscopeContext = { dateStr: '2025-03-01', hourIndex: 3 };
  const explicit = await calculateCompatibilityBundle(primary, partner, {
    systems: ['ziwei'],
    chart: { ziwei: { scopes: ['origin'], skipAnalysis: true, now, horoscopeContext } },
  });
  assert.deepEqual(explicit.primary.ziwei?.horoscopeContext, horoscopeContext);
  assert.deepEqual(explicit.partner.ziwei?.horoscopeContext, horoscopeContext);
});
