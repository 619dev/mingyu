import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSignByNumber } from '../packages/core/src/divination/algorithms/ssgw.ts';
import { resolveSsgwStoryContent } from '../packages/core/src/divination/ssgw-content.ts';
import { formatEnhancedDivinationInfo } from '../packages/core/src/prompt/divination-enhanced.ts';

test('三山国王第79签保留传统签解，不把分项运势说成已经发生的事实', () => {
  const sign = resolveSignByNumber(79, new Date('2026-09-01T12:00:00+08:00'));
  const prompt = formatEnhancedDivinationInfo('ssgw', sign);

  assert.match(prompt, /签号：第79签/);
  assert.match(prompt, /签诗：千祥云集照门庭/);
  assert.match(prompt, /吉凶级别：上签（大吉）/);
  assert.match(prompt, /基础解签：签诗以千祥、百福写喜庆汇集的传统吉象/);
  assert.match(prompt, /补充解释：诗句取象：千万种吉祥如云朵般聚集照耀家门/);
  assert.doesNotMatch(prompt, /健康、财运全都好|财运全面向好|学习考试顺利|整体康泰/);
  assert.doesNotMatch(prompt, /解签总论：|事业：|财运：|健康：|行动建议：|风险提醒：/);
  assert.equal((prompt.match(/基础解签：/gu) ?? []).length, 1);
});

test('灵签补充解释保留本签诗句的独有释义，不复述分项运势断语', () => {
  const second = formatEnhancedDivinationInfo('ssgw', resolveSignByNumber(2));
  assert.match(second, /签诗：六出奇花开晚香/);
  assert.match(second, /补充解释：诗句取象："六出"指雪花/);
  assert.doesNotMatch(second, /最终方能蟾宫折桂、一举成名|收入上的好转会来得晚一些/);

  const thirtySixth = formatEnhancedDivinationInfo('ssgw', resolveSignByNumber(36));
  assert.match(thirtySixth, /典故：.*破镜重圆/);
  assert.match(thirtySixth, /补充解释：诗句取象：破碎的铜镜重新明亮/);
  assert.doesNotMatch(thirtySixth, /失去的东西终将回来|关系可以修复/);
});

test('三山国王签谱典故不把别签对照或误引典籍写进本签提示词', () => {
  const eightyNinth = formatEnhancedDivinationInfo('ssgw', resolveSignByNumber(89));
  assert.match(eightyNinth, /《周易·坤·文言》有“积善之家，必有余庆”/);
  assert.doesNotMatch(eightyNinth, /“吉人自有天相”出自《周易》/);

  const ninetySecond = resolveSignByNumber(92);
  const story = resolveSsgwStoryContent(ninetySecond);
  const prompt = formatEnhancedDivinationInfo('ssgw', ninetySecond);
  assert.doesNotMatch(story.canonicalStory, /第一签/);
  assert.doesNotMatch(prompt, /第一签|第1签/);
  assert.match(prompt, /签号：第92签/);
  assert.match(prompt, /基础解签：签诗以万殊归一/);
});
