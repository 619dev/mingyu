import assert from 'node:assert/strict';
import test from 'node:test';

import { generateTaiyi } from '../packages/core/src/taiyi/index.ts';

// 《武经总要》后集卷二十阴局立成、 《太乙秘书》阴局七十二局：
// https://zh.wikisource.org/wiki/武經總要/後集/卷二十
// https://zh.wikisource.org/wiki/太乙秘書
test('夏至后实际时计的阴遁局式采用原典同文数值并保留已知异文', () => {
  const first = Date.parse('2026-06-25T00:30:00+08:00');
  const examples = [
    // 局数、太乙宫、天目、始击、主算、客算、主将参、客将参、计神。
    [4, 8, '巽', '丑', 25, 33, 5, 5, 3, 9, '巳'],
    [9, 7, '坤', '酉', 7, 34, 7, 1, 4, 2, '子'],
    [30, 8, '戌', '申', 2, 8, 2, 6, 8, 4, '卯'],
    [33, 7, '子', '艮', 26, 38, 6, 8, 8, 4, '子'],
    [34, 6, '丑', '卯', 26, 22, 6, 8, 2, 6, '亥'],
    [48, 1, '乾', '寅', 1, 19, 1, 3, 9, 7, '酉'],
    [51, 9, '子', '坤', 25, 29, 5, 5, 9, 7, '午'],
    [52, 8, '丑', '酉', 33, 9, 3, 9, 9, 7, '巳'],
    [61, 4, '午', '亥', 27, 12, 7, 1, 2, 6, '申'],
    [62, 4, '未', '艮', 26, 30, 6, 8, 3, 9, '未'],
    [64, 3, '申', '巽', 16, 3, 6, 8, 3, 9, '巳'],
    [66, 3, '戌', '申', 10, 16, 1, 3, 6, 8, '卯'],
    [72, 1, '艮', '亥', 31, 25, 1, 3, 5, 5, '酉'],
  ] as const;

  for (const [
    bureau,
    taiyiPalace,
    wenChangPosition,
    shiJiPosition,
    lordCount,
    guestCount,
    lordGeneral,
    lordAssistant,
    guestGeneral,
    guestAssistant,
    jiShenPosition,
  ] of examples) {
    const date = new Date(first + (bureau - 1) * 2 * 60 * 60 * 1000);
    const result = generateTaiyi({ scope: 'hour', date });
    assert.equal(result.yinYang, '阴遁', date.toISOString());
    assert.deepEqual(
      [
        result.bureau,
        result.taiyiPalace,
        result.wenChangPosition,
        result.shiJiPosition,
        result.lordCount,
        result.guestCount,
        result.lordGeneral,
        result.lordAssistant,
        result.guestGeneral,
        result.guestAssistant,
        result.jiShenPosition,
      ],
      [
        bureau,
        taiyiPalace,
        wenChangPosition,
        shiJiPosition,
        lordCount,
        guestCount,
        lordGeneral,
        lordAssistant,
        guestGeneral,
        guestAssistant,
        jiShenPosition,
      ],
      date.toISOString(),
    );
    assert.ok(result.prompt.includes(`阴遁第 ${bureau} 局`));
    assert.ok(result.prompt.includes(`文昌（主目）在${wenChangPosition}`));
    assert.ok(result.prompt.includes(`始击（客目）在${shiJiPosition}`));
    assert.ok(result.prompt.includes(`主算 ${lordCount}`));
    assert.ok(result.prompt.includes(`客算 ${guestCount}`));
  }
});

test('阳遁三十和六十六局的始击也按《太乙秘书》武德定位', () => {
  for (const [year, bureau] of [
    [2001, 30],
    [1965, 66],
  ] as const) {
    const result = generateTaiyi({ scope: 'year', year });
    assert.equal(result.yinYang, '阳遁');
    assert.equal(result.bureau, bureau);
    assert.equal(result.shiJiPosition, '申');
    assert.ok(result.prompt.includes('始击（客目）在申'));
  }
});
