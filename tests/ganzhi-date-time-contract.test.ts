import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ProbeResult {
  defaultResult: {
    helper: { year: string; month: string; day: string; hour: string };
    lunarUtil: { year: string; month: string; day: string; hour: string };
    lunarHour: string;
    afterMidnight: {
      helper: { year: string; month: string; day: string; hour: string };
      lunarUtil: { year: string; month: string; day: string; hour: string };
    };
    before: { year: string; month: string };
    at: { year: string; month: string };
  };
  customResult: {
    clock: { year: number; month: number; day: number; hour: number; minute: number };
    helper: { year: string; month: string; day: string; hour: string };
    managed: { year: string; month: string; day: string; hour: string };
    lunarHour: string;
  };
}

function runProbe(timeZone: string): ProbeResult {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const root = resolve(testDir, '..');
  const tsxCli = resolve(root, 'node_modules/tsx/dist/cli.mjs');
  const tsconfig = resolve(root, 'tsconfig.app.json');
  const probe = resolve(testDir, 'fixtures/ganzhi-date-time-contract-probe.ts');
  const result = spawnSync(process.execPath, [tsxCli, '--tsconfig', tsconfig, probe], {
    cwd: root,
    env: { ...process.env, TZ: timeZone },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${timeZone}\n${result.stderr}`);
  return JSON.parse(result.stdout.trim()) as ProbeResult;
}

test('公共 Date 干支入口对同一真实瞬时在不同宿主时区保持四柱和交节一致', () => {
  const utc = runProbe('UTC');
  assert.deepEqual(runProbe('Asia/Shanghai'), utc);
  assert.deepEqual(utc.defaultResult.helper, {
    year: '甲辰',
    month: '丙寅',
    day: '戊戌',
    hour: '庚申',
  });
  assert.deepEqual(utc.defaultResult.helper, utc.defaultResult.lunarUtil);
  assert.equal(utc.defaultResult.lunarHour, utc.defaultResult.helper.hour);
  assert.deepEqual(
    utc.defaultResult.afterMidnight.helper,
    utc.defaultResult.afterMidnight.lunarUtil,
  );
  assert.notEqual(utc.defaultResult.afterMidnight.helper.day, utc.defaultResult.helper.day);
  assert.deepEqual(
    [utc.defaultResult.before.year, utc.defaultResult.before.month],
    ['癸卯', '乙丑'],
  );
  assert.deepEqual([utc.defaultResult.at.year, utc.defaultResult.at.month], ['甲辰', '丙寅']);
});

test('公共 Date 干支入口遵循显式时区钟表并以真实瞬时判断节气年、月', () => {
  const result = runProbe('UTC').customResult;
  assert.deepEqual(result.helper, result.managed);
  assert.deepEqual(result.clock, {
    year: 2024,
    month: 2,
    day: 4,
    hour: 3,
    minute: 30,
    second: 0,
  });
  assert.equal(result.helper.year, '甲辰');
  assert.equal(result.helper.month, '丙寅');
  assert.equal(result.lunarHour, result.helper.hour);
});
