import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateQimenLifetime,
  buildLifetimePrompt,
} from '../packages/core/src/divination/algorithms/qimen/index.ts';
import { TimeManager } from '../packages/core/src/calendar/timeManager.ts';

test('奇门终身局当前时间与所标北京时间一致，不受全局占卜时区覆盖影响', () => {
  const data = calculateQimenLifetime({
    birthDateTime: '2024-03-20T10:00:00',
    timezone: 8,
  });
  const beijingMinute = () => {
    const time = TimeManager.getWallClockParts(new Date(), 480);
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  };

  TimeManager.setTimezoneOffsetMinutesOverride(-300);
  try {
    const before = beijingMinute();
    const prompt = buildLifetimePrompt(data);
    const after = beijingMinute();
    const displayed = prompt.match(/【当前时间】\n([^\n]+)（UTC\+08:00）/)?.[1];
    assert.ok(displayed === before || displayed === after, prompt.slice(0, 80));
  } finally {
    TimeManager.setTimezoneOffsetMinutesOverride(480);
  }
});
