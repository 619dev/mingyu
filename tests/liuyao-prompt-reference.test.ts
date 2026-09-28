import assert from 'node:assert/strict';
import test from 'node:test';
import { generateLiuyao } from 'mingyu-core/divination/liuyao';
import { formatEnhancedDivinationInfo, getDivinationSummaryBlocks } from 'mingyu-core/prompt';
import { formatEnhancedDivinationInfo as formatSourceLiuyaoPrompt } from '../packages/core/src/prompt/divination-enhanced.ts';

test('六爻静卦不把未变化的本卦写成变卦', () => {
  const staticData = generateLiuyao(new Date('2025-01-01T08:00:00+08:00'), {
    method: 'manual',
    yaos: [7, 7, 7, 7, 7, 7],
  });
  assert.equal(staticData.originalName, '乾为天');
  assert.equal(staticData.changedName, '乾为天');
  assert.equal(staticData.changingYaos.length, 0);
  assert.match(
    formatEnhancedDivinationInfo('liuyao', staticData),
    /主卦乾为天（乾宫）；变卦无；互卦/,
  );
  assert.ok(getDivinationSummaryBlocks('liuyao', staticData).tags.includes('变卦：无'));

  const movingData = generateLiuyao(new Date('2025-01-01T08:00:00+08:00'), {
    method: 'manual',
    yaos: [9, 7, 7, 7, 7, 7],
  });
  assert.equal(movingData.changingYaos.length, 1);
  assert.match(
    formatEnhancedDivinationInfo('liuyao', movingData),
    new RegExp(`主卦乾为天（乾宫）；变卦${movingData.changedName}；互卦`),
  );
  assert.ok(
    getDivinationSummaryBlocks('liuyao', movingData).tags.includes(
      `变卦：${movingData.changedName}`,
    ),
  );
});

test('六爻事业用神与世爻不同五行时保留原忌仇神的作用对象', () => {
  const data = generateLiuyao(new Date('2026-05-19T10:30:00+08:00'), {
    method: 'manual',
    yaos: [6, 8, 8, 8, 8, 6],
  });
  const text = formatEnhancedDivinationInfo('liuyao', data, '', undefined, {
    liuyaoTemplate: 'shiye',
  });
  assert.match(text, /世爻第6爻子孙酉金/);
  assert.match(text, /生克参照：本次所选用神第3爻官鬼卯木/);
  assert.match(text, /原神水（水生木）见第5爻妻财亥水/);
  assert.match(text, /忌神金（金克木）见第6爻子孙酉金/);
  assert.match(text, /仇神土（土生金并克水）/);
  assert.doesNotMatch(text, /原神水（水生金）/);
  assert.match(text, /动变五行：本爻未土克变爻子水/);
  assert.match(text, /动变五行：本爻酉金克变爻寅木/);
  assert.equal(text.split('动变五行：本爻未土克变爻子水').length - 1, 1);
  assert.equal(text.split('动变五行：本爻酉金克变爻寅木').length - 1, 1);
  assert.doesNotMatch(text, /^动变：/m);
  assert.doesNotMatch(text, /变爻寅木克本爻酉金|变爻子水生本爻未土/);
});

test('六爻有实际伏神时保留伏藏位置和飞神资料', () => {
  const data = generateLiuyao(new Date('2025-06-18T10:30:00+08:00'), {
    method: 'manual',
    yaos: [7, 8, 8, 8, 7, 8],
  });
  const text = formatEnhancedDivinationInfo('liuyao', data);
  assert.equal(data.hiddenSpirits?.length, 1);
  assert.match(text, /伏神1爻：妻财伏第3爻午火/);
  assert.match(text, /伏于官鬼辰土下/);
});

test('六爻静卦按实际世应和空爻给出月日生克及冲空对象', () => {
  const data = generateLiuyao(new Date('2026-05-19T10:30:00+08:00'), {
    method: 'manual',
    yaos: [8, 8, 7, 8, 8, 7],
  });
  const text = formatEnhancedDivinationInfo('liuyao', data, '', undefined, {
    liuyaoTemplate: 'shiye',
  });
  assert.match(text, /世应五行：应爻第3爻子孙申金克世爻第6爻官鬼寅木/);
  assert.match(text, /第5爻妻财子水克月建、日辰巳火/);
  assert.match(text, /第6爻官鬼寅木生月建、日辰巳火/);
  assert.match(text, /第2爻父母午火（本爻空亡；本爻午逢值，子冲午）/);
  assert.doesNotMatch(text, /动变五行：/);
  assert.match(text, /明伏分布：本卦明爻6爻，六亲为兄弟、父母、子孙、妻财、官鬼；伏神0爻/);
});

test('六爻逐爻表同时呈现化空、回头关系与进神', () => {
  const date = new Date('2025-01-01T08:00:00+08:00');
  const voidData = generateLiuyao(date, { method: 'manual', yaos: [6, 6, 6, 6, 6, 6] });
  const voidText = formatSourceLiuyaoPrompt('liuyao', voidData);
  const voidLine = voidText.split('\n').find((line) => line.startsWith('  第6爻'));
  assert.deepEqual(voidData.yaosDetail[5].changeRelations, ['回头生', '化空']);
  assert.match(voidLine ?? '', /化兄弟戌土（回头生、化空）/);
  const legacyVoidData = structuredClone(voidData);
  delete legacyVoidData.yaosDetail[5].changeRelations;
  assert.match(formatSourceLiuyaoPrompt('liuyao', legacyVoidData), /化兄弟戌土（化空）/);

  const advanceData = generateLiuyao(date, { method: 'manual', yaos: [7, 6, 8, 8, 8, 8] });
  const advanceText = formatSourceLiuyaoPrompt('liuyao', advanceData);
  const advanceLine = advanceText.split('\n').find((line) => line.startsWith('  第2爻'));
  assert.equal(advanceData.yaosDetail[1].changeDirection, '化进神');
  assert.match(advanceLine ?? '', /化官鬼卯木（比和、化进神）/);
});

test('六爻用神只有限制没有支持时不写盘面平稳', () => {
  const data = generateLiuyao(new Date('2025-06-18T10:30:00+08:00'), {
    method: 'manual',
    yaos: [6, 6, 7, 6, 6, 6],
  });
  const text = formatSourceLiuyaoPrompt('liuyao', data, '', undefined, {
    liuyaoTemplate: 'caifu',
  });
  assert.equal(data.originalName, '地山谦');
  assert.match(text, /用神：妻财；盘面伏神第/u);
  assert.match(text, /支持未见明确支持；限制伏藏待透、受飞神/u);
  assert.doesNotMatch(text, /支持盘面平稳/u);
});
