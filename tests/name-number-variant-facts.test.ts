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

test('复、钟的默认原字形与明确写出的繁体字形在任务书中不混用', () => {
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
