import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeChineseCharacters,
  analyzeChineseCharactersWithReferences,
  analyzeChineseName,
  buildChineseCharacterPrompt,
  buildChineseNameAnalysisPrompt,
  buildChineseNamingPrompt,
  calculateZhugeNumber,
  generateChineseNames,
  selectNamingCharacters,
} from 'mingyu-core/name-number';

const glyphs = [
  ['后', '后', 6, 6],
  ['後', '後', 9, 9],
  ['干', '干', 3, 3],
  ['乾', '乾', 11, 11],
  ['台', '台', 5, 5],
  ['檯', '檯', 18, 18],
  ['复', '複', 15, 14],
  ['復', '復', 12, 12],
  ['複', '複', 15, 14],
  ['钟', '鐘', 20, 20],
  ['鍾', '鍾', 17, 17],
  ['鐘', '鐘', 20, 20],
  ['发', '發', 12, 12],
  ['發', '發', 12, 12],
  ['髮', '髮', 15, 15],
  ['于', '于', 3, 3],
  ['於', '於', 8, 8],
  ['准', '准', 10, 10],
  ['準', '準', 14, 13],
  ['斗', '斗', 4, 4],
  ['鬥', '鬥', 10, 10],
  ['余', '余', 7, 7],
  ['餘', '餘', 16, 15],
  ['里', '裏', 13, 13],
  ['裏', '裏', 13, 13],
  ['云', '雲', 12, 12],
  ['雲', '雲', 12, 12],
  ['叶', '葉', 15, 12],
  ['葉', '葉', 15, 12],
] as const;

test('明确字形的现代繁体画数、康熙取数在字符、姓名与诸葛入口一致', () => {
  for (const [char, traditional, kangxiStrokes, traditionalStrokes] of glyphs) {
    const analysis = analyzeChineseCharacters(char);
    const detail = analysis.characters[0].detail;
    assert.ok(detail, `${char} 应有独立字形资料`);
    assert.equal(detail.traditional, traditional, char);
    assert.equal(detail.kangxiStrokes, kangxiStrokes, char);
    assert.equal(detail.traditionalStrokes, traditionalStrokes, char);
    assert.equal(analysis.totalKangxiStrokes, kangxiStrokes, char);
    const name = analyzeChineseName({ fullName: `李${char}` });
    assert.equal(name.chars[1].char, char);
    assert.equal(name.chars[1].kangxiStrokes, kangxiStrokes);
    assert.deepEqual(calculateZhugeNumber(char.repeat(3)).strokes, Array(3).fill(kangxiStrokes));
  }
});

test('起名明确选入的不同繁体字形保留原字形', () => {
  const selected = selectNamingCharacters({ preferredCharacters: '鐘複鍾髮', limit: 4 });
  assert.deepEqual(
    selected.map((item) => item.char),
    ['鐘', '複', '鍾', '髮'],
  );
  assert.equal(
    generateChineseNames({
      surname: '李',
      givenNameLength: 1,
      preferredCharacters: '鐘',
      limit: 1,
    })[0].fullName,
    '李鐘',
  );
  assert.equal(
    generateChineseNames({
      surname: '李',
      givenNameLength: 1,
      preferredCharacters: '鍾',
      limit: 1,
    })[0].fullName,
    '李鍾',
  );
});

test('起名偏好与任务书字池逐字保留简繁原字形', () => {
  const suitableCharacters = selectNamingCharacters({ preferredCharacters: '复複', limit: 2 });
  const candidates = generateChineseNames({
    surname: '李',
    givenNameLength: 1,
    preferredCharacters: '复複',
    limit: 2,
  });
  assert.deepEqual(
    candidates.map((candidate) => [
      candidate.fullName,
      candidate.selectionEvidence.preferredCharacters,
    ]),
    [
      ['李复', ['复']],
      ['李複', ['複']],
    ],
  );
  const prompt = buildChineseNamingPrompt({ surname: '李', suitableCharacters, candidates });
  const pool = prompt.split('\n').find((line) => line.startsWith('适配字池：'));
  assert.ok(pool);
  assert.match(pool, /复（/u);
  assert.match(pool, /複（/u);
  assert.ok(pool.indexOf('复（') < pool.indexOf('複（'));
  assert.match(prompt, /1\. 李复[\s\S]*2\. 李複/u);
});

test('多义简体默认原字形与明确繁体在任务书中不混用', () => {
  for (const [char, traditional, kangxiStrokes, traditionalStrokes] of [
    ['复', '複', 15, 14],
    ['複', '複', 15, 14],
    ['钟', '鐘', 20, 20],
    ['鐘', '鐘', 20, 20],
  ] as const) {
    const prompt = buildChineseCharacterPrompt({ analysis: analyzeChineseCharacters(char) });
    assert.match(prompt, new RegExp(`繁体：${traditional}`), char);
    assert.match(prompt, new RegExp(`繁体笔画：${traditionalStrokes}`), char);
    assert.match(prompt, new RegExp(`姓名学康熙笔画：${kangxiStrokes}`), char);
  }

  for (const [char, incorrectTraditional] of [
    ['后', '後'],
    ['干', '乾'],
    ['台', '檯'],
    ['于', '於'],
    ['准', '準'],
    ['斗', '鬥'],
    ['余', '餘'],
  ] as const) {
    const prompt = buildChineseCharacterPrompt({ analysis: analyzeChineseCharacters(char) });
    assert.doesNotMatch(prompt, new RegExp(`繁体：${incorrectTraditional}`), char);
  }

  for (const [char, strokes] of [
    ['複', 15],
    ['鐘', 20],
  ] as const) {
    const namePrompt = buildChineseNameAnalysisPrompt({
      analysis: analyzeChineseName({ fullName: `李${char}` }),
    });
    assert.match(namePrompt, new RegExp(`${char}（康熙${strokes}画、五行未定`));
  }
  for (const [char, strokes] of [
    ['於', 8],
    ['準', 14],
    ['鬥', 10],
    ['餘', 16],
  ] as const) {
    const namePrompt = buildChineseNameAnalysisPrompt({
      analysis: analyzeChineseName({ fullName: `李${char}` }),
    });
    assert.match(namePrompt, new RegExp(`${char}（康熙${strokes}画`));
  }
});

test('原字形的康熙条目与现代读音保持对应', async () => {
  const analysis = await analyzeChineseCharactersWithReferences('后干台复複钟鐘');
  for (const [index, glyph] of ['后', '干', '台', '複', '複', '鐘', '鐘'].entries()) {
    assert.match(analysis.characters[index].detail?.kangxiText ?? '', new RegExp(`】 ${glyph}`));
  }
  assert.equal(analyzeChineseCharacters('干').characters[0].detail?.pinyin, 'gān');
  assert.match(analyzeChineseCharacters('干').characters[0].detail?.readingNote ?? '', /干扰/);
  assert.equal(analyzeChineseCharacters('複').characters[0].detail?.pinyin, 'fù');
  assert.equal(analyzeChineseCharacters('鐘').characters[0].detail?.pinyin, 'zhōng');
  assert.equal(analyzeChineseCharacters('複').characters[0].detail?.wuxing, null);
  assert.equal(analyzeChineseCharacters('鐘').characters[0].detail?.wuxing, null);
});

test('默认本字与明确繁体的原文字头、部位和义项分别对应', async () => {
  const input = '于於准準斗鬥余餘里裏云雲叶葉';
  const analysis = await analyzeChineseCharactersWithReferences(input);
  const headings = [
    '于',
    '於',
    '准',
    '準',
    '斗',
    '鬥',
    '余',
    '餘',
    '裏',
    '裏',
    '雲',
    '雲',
    '葉',
    '葉',
  ];
  const positions = [
    ['子集上', '二字部'],
    ['卯集下', '方字部'],
    ['子集下', '冫字部'],
    ['巳集上', '水字部'],
    ['卯集下', '斗字部'],
    ['亥集上', '鬥字部'],
    ['子集中', '人字部'],
    ['戌集下', '食字部'],
    ['申集下', '衣字部'],
    ['申集下', '衣字部'],
    ['戌集中', '雨字部'],
    ['戌集中', '雨字部'],
    ['申集上', '艸字部'],
    ['申集上', '艸字部'],
  ] as const;
  for (const [index, char] of [...input].entries()) {
    const detail = analysis.characters[index].detail;
    assert.ok(detail, char);
    assert.match(detail.kangxiText ?? '', new RegExp(`】 ${headings[index]}`), char);
    assert.equal(detail.kangxiVolume, positions[index][0], char);
    assert.equal(detail.kangxiSection, positions[index][1], char);
  }
  const inner = analysis.characters[9].detail;
  const cloud = analysis.characters[11].detail;
  const leaf = analysis.characters[13].detail;
  assert.match(inner?.definition ?? '', /衣服的内层/u);
  assert.doesNotMatch(inner?.definition ?? '', /里程|故里/u);
  assert.match(cloud?.definition ?? '', /水汽凝结/u);
  assert.doesNotMatch(cloud?.definition ?? '', /说话|子曰诗云/u);
  assert.match(leaf?.definition ?? '', /草木的叶/u);
  assert.doesNotMatch(leaf?.kangxiText ?? '', /【口字部】/u);
  for (const detail of [inner, cloud, leaf]) {
    assert.equal(detail?.wuxing, null);
    assert.equal(detail?.strokeNote, undefined);
  }
  assert.match(analyzeChineseCharacters('斗').characters[0].detail?.readingNote ?? '', /dǒu.*dòu/u);
  for (const [index, heading, position] of [
    [9, '裏', '【申集下】【衣字部】 裏'],
    [11, '雲', '【戌集中】【雨字部】 雲'],
    [13, '葉', '【申集上】【艸字部】 葉'],
  ] as const) {
    const prompt = buildChineseCharacterPrompt({
      analysis: { ...analysis, characters: [analysis.characters[index]] },
    });
    assert.match(prompt, new RegExp(`【${heading}】[\\s\\S]*康熙字典原文：[\\s\\S]*${position}`));
  }
});
