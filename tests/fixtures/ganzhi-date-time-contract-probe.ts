import { getGanZhiFromDate, getLunarHourFromDate } from '../../packages/core/src/ganzhi';
import { LunarUtil } from '../../packages/core/src/calendar/lunar';
import { TimeManager } from '../../packages/core/src/calendar/timeManager';
import { calculateSolarTermEvidence } from '../../packages/core/src/calendar/solar-term-evidence';

const instant = new Date('2024-02-04T08:30:00.000Z');
const afterMidnight = new Date('2024-02-04T16:30:00.000Z');
const term = calculateSolarTermEvidence(2024, 3);
const before = new Date(term.utcTimestamp - 1);
const at = new Date(term.utcTimestamp);

const defaultResult = {
  helper: getGanZhiFromDate(instant),
  lunarUtil: LunarUtil.getGanZhi(instant),
  lunarHour: getLunarHourFromDate(instant).getEightChar().getHour().getName(),
  afterMidnight: {
    helper: getGanZhiFromDate(afterMidnight),
    lunarUtil: LunarUtil.getGanZhi(afterMidnight),
  },
  before: getGanZhiFromDate(before),
  at: getGanZhiFromDate(at),
};

TimeManager.setTimezoneOffsetMinutesOverride(-300);
try {
  console.log(
    JSON.stringify({
      defaultResult,
      customResult: {
        clock: TimeManager.getWallClockParts(instant),
        helper: getGanZhiFromDate(instant),
        managed: TimeManager.getDivinationTime(instant).ganzhi,
        lunarHour: getLunarHourFromDate(instant).getEightChar().getHour().getName(),
      },
    }),
  );
} finally {
  TimeManager.setTimezoneOffsetMinutesOverride(480);
}
