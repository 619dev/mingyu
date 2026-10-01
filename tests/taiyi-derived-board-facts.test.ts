import assert from 'node:assert/strict';
import test from 'node:test';

import { generateTaiyi } from '../packages/core/src/taiyi/index.ts';

// 《太乙金镜式经》卷一的宫目循环，卷二的逐宫行算和计神加和德，
// 卷一阴二十七局原例：计神午加和德艮，文昌坤下临卯，主算二十九。
// https://www.kanripo.org/text/KR3g0047/001
// https://www.kanripo.org/text/KR3g0047/002
const POSITIONS = [
  '子',
  '丑',
  '艮',
  '寅',
  '卯',
  '辰',
  '巽',
  '巳',
  '午',
  '未',
  '坤',
  '申',
  '酉',
  '戌',
  '乾',
  '亥',
];
const PALACE_NUMBERS = new Map<string, number>([
  ['乾', 1],
  ['午', 2],
  ['艮', 3],
  ['卯', 4],
  ['酉', 6],
  ['坤', 7],
  ['子', 8],
  ['巽', 9],
]);
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const YANG_TIANMU = [
  '申',
  '酉',
  '戌',
  '乾',
  '乾',
  '亥',
  '子',
  '丑',
  '艮',
  '寅',
  '卯',
  '辰',
  '巽',
  '巳',
  '午',
  '未',
  '坤',
  '坤',
];
const YIN_TIANMU = [
  '寅',
  '卯',
  '辰',
  '巽',
  '巽',
  '巳',
  '午',
  '未',
  '坤',
  '申',
  '酉',
  '戌',
  '乾',
  '亥',
  '子',
  '丑',
  '艮',
  '艮',
];

function countToTaiyi(origin: string, destination: string): number {
  const start = POSITIONS.indexOf(origin);
  const end = POSITIONS.indexOf(destination);
  let count = PALACE_NUMBERS.get(origin) ?? 1;
  if (start !== end) {
    for (let position = (start + 1) % 16; position !== end; position = (position + 1) % 16) {
      count += PALACE_NUMBERS.get(POSITIONS[position]) ?? 0;
    }
  }
  return count;
}

function generalForCount(count: number): number {
  return count % 10 || count / 10;
}

test('阴阳七十二局的宫目、主客算及将参符合原典独立推法', () => {
  const palaceOrder = ['乾', '午', '艮', '卯', '酉', '坤', '子', '巽'];
  for (const [yinYang, startTime] of [
    ['阳遁', '2026-01-10T00:30:00+08:00'],
    ['阴遁', '2026-07-10T00:30:00+08:00'],
  ] as const) {
    const seen = new Set<number>();
    for (let hourOffset = 0; hourOffset < 144; hourOffset += 2) {
      const actual = generateTaiyi({
        scope: 'hour',
        date: new Date(Date.parse(startTime) + hourOffset * 3_600_000),
      });
      const bureauIndex = actual.bureau - 1;
      const yin = yinYang === '阴遁';
      const palaceIndex = Math.floor(bureauIndex / 3) % 8;
      const taiyiPosition = palaceOrder[yin ? 7 - palaceIndex : palaceIndex];
      const tianMuPosition = (yin ? YIN_TIANMU : YANG_TIANMU)[bureauIndex % 18];
      const jiShenPosition = BRANCHES[((((yin ? 8 : 2) - bureauIndex) % 12) + 12) % 12];
      const shiJiPosition =
        POSITIONS[
          (POSITIONS.indexOf(tianMuPosition) +
            POSITIONS.indexOf('艮') -
            POSITIONS.indexOf(jiShenPosition) +
            16) %
            16
        ];
      const hostCount = countToTaiyi(tianMuPosition, taiyiPosition);
      const guestCount = countToTaiyi(shiJiPosition, taiyiPosition);
      const hostGeneral = generalForCount(hostCount);
      const guestGeneral = generalForCount(guestCount);
      const label = `${yinYang}${actual.bureau}局`;
      assert.equal(actual.yinYang, yinYang, label);
      assert.ok(actual.bureau >= 1 && actual.bureau <= 72, label);
      assert.equal(actual.taiyiPalace, PALACE_NUMBERS.get(taiyiPosition), label);
      assert.equal(actual.wenChangPosition, tianMuPosition, label);
      assert.equal(actual.jiShenPosition, jiShenPosition, label);
      assert.equal(actual.shiJiPosition, shiJiPosition, label);
      assert.equal(actual.lordCount, hostCount, label);
      assert.equal(actual.guestCount, guestCount, label);
      assert.equal(actual.lordGeneral, hostGeneral, label);
      assert.equal(actual.lordAssistant, (hostGeneral * 3) % 10, label);
      assert.equal(actual.guestGeneral, guestGeneral, label);
      assert.equal(actual.guestAssistant, (guestGeneral * 3) % 10, label);
      seen.add(actual.bureau);
    }
    assert.equal(seen.size, 72, `${yinYang}实际时计覆盖七十二局`);
  }
});
