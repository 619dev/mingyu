import assert from 'node:assert/strict';
import test from 'node:test';

import { formatEnhancedDivinationInfo } from '../packages/core/src/prompt/divination-enhanced';
import { generateQimen } from '../packages/core/src/divination/algorithms/qimen';
import { analyzeQimenEvidence } from '../packages/core/src/divination/qimen-evidence';

test('奇门证据提示词保留命中条件并省略同宫格局的重复前提', () => {
  const data = generateQimen(new Date('2026-05-19T10:30:00+08:00'));
  const prompt = analyzeQimenEvidence(data).promptText;
  const patterns = prompt.split('【传统格局】\n')[1]?.split('【应期资料】')[0] ?? '';

  assert.match(patterns, /吉格：天遁（兑七宫）；生门、丙奇、地盘戊同宫/);
  assert.doesNotMatch(patterns, /乃天遁之格/);
  assert.doesNotMatch(patterns, /^吉格：月奇得使（/mu);
  assert.match(
    patterns,
    /吉格：月奇得使临吉门；丙奇加地盘戊（甲子\/甲申所遁）于兑七宫；同宫临生门/,
  );
  assert.doesNotMatch(patterns, /月奇得使又临吉门生门/);
  assert.match(patterns, /凶格：门迫；惊门（金）克巽四宫（木）/);
});

test('奇门完整在线提示词只保留一处旬空与驿马位置映射', () => {
  const data = generateQimen(new Date('2026-05-19T10:30:00+08:00'));
  const prompt = formatEnhancedDivinationInfo('qimen', data);
  const palaceTable = prompt.match(/九宫简表：\r?\n((?:  [^\r\n]*(?:\r?\n|$))*)/u)?.[1] ?? '';

  assert.match(prompt, /旬空与马星：旬空子空落坎一宫、丑空落艮八宫；马星巳时驿马在亥，落乾六宫/u);
  assert.doesNotMatch(palaceTable, /逢空|马星/u);
  assert.match(palaceTable, /兑七宫[^\n]*天盘壬、丙（丙为寄干），地盘戊/u);
  assert.doesNotMatch(prompt, /同干定位：/u);
});

test('三奇得、马星和击刑在在线提示词中各保留一次有效事实', () => {
  const data = generateQimen(new Date('2026-05-19T10:30:00+08:00'));
  const analysis = analyzeQimenEvidence(data);
  const prompt = analysis.promptText;
  const patterns = prompt.split('【传统格局】\n')[1]?.split('【应期资料】')[0] ?? '';

  assert.match(patterns, /吉格：三奇得（丙奇（月奇）合生门于兑七宫）\n/u);
  assert.match(patterns, /吉格：三奇得（丁奇（星奇）合开门于离九宫）\n/u);
  assert.doesNotMatch(patterns, /三奇与开休生吉门同宫|中性格局：马星（/u);
  assert.match(prompt, /乾六宫[^\n]*马星/u);
  assert.match(prompt, /驿马发动，出现行动、迁移、消息流转时更容易触发进展/u);
  assert.match(patterns, /凶格：癸击刑；癸在巽四宫击刑\n/u);
  assert.doesNotMatch(patterns, /在此宫落于相刑之位/u);
  assert.ok(analysis.patternFacts.some((item) => item.name.startsWith('马星（')));
  assert.ok(analysis.patternFacts.some((item) => item.originalText.includes('在此宫落于相刑之位')));
});

test('三奇入墓在固定盘与证据提示词中只保留三奇专名', () => {
  const data = generateQimen(new Date('2026-05-01T14:00:00+08:00'));
  const tombNames = (data.classicPatterns ?? []).map((pattern) => pattern.name);
  assert.ok(tombNames.includes('日奇入墓'));
  assert.ok(!tombNames.includes('乙入墓'));
  assert.ok(tombNames.includes('己入墓'));

  const prompt = analyzeQimenEvidence(data).promptText;
  const patterns = prompt.split('【传统格局】\n')[1]?.split('【应期资料】')[0] ?? '';
  assert.match(patterns, /凶格：日奇入墓；乙奇入坤二宫/);
  assert.doesNotMatch(patterns, /凶格：乙入墓/);
  assert.match(patterns, /凶格：己入墓/);
});

test('复合格局引用同盘经典格局时省略占位复述并保留独有兵事依据', () => {
  const data = generateQimen(new Date('2026-05-19T10:30:00+08:00'));
  const prompt = formatEnhancedDivinationInfo('qimen', data, '军事战术如何行动');
  const combos = prompt.split('复合格局：\n')[1]?.split('\n值符宫应期参考')[0] ?? '';

  assert.doesNotMatch(combos, /：该格局(?:同宫生门)?[，；]/);
  assert.match(combos, /飞鸟跌穴利客（兑七宫）：合“丙加甲利为客”/);
  assert.match(combos, /螣蛇夭矫宜守（巽四宫）：合“主军宜固守”/);
  assert.match(combos, /螣蛇迁戊己（巽四宫）：古法急迁甲子戊、甲戌己两土宫/);

  const hostGuestInjury = combos.split('星门主客互伤：')[1]?.split('\n八门余气')[0] ?? '';
  assert.match(hostGuestInjury, /同宫星门与宫各见一生一克：坤二宫、艮八宫、离九宫/);
  assert.doesNotMatch(hostGuestInjury, /天英火星生宫利主|休门水宫克门利主/);
  assert.match(hostGuestInjury, /合“一克一生，主客互伤”/);
});
