import type { PalaceFact, PatternFact } from '../../types/analysis';

/** 判断命中条件是否只是在复述已展示宫位中的同宫星曜。 */
export function isRepeatedZiweiCoLocationCondition(
  pattern: Pick<PatternFact, 'palace_indexes' | 'palace_names' | 'star_names'>,
  condition: string,
  displayedPalaces: readonly PalaceFact[],
) {
  const match = /^(.+?)(?:同守|同坐|同宫)(.+宫)$/u.exec(condition);
  if (!match) return false;

  const starText = match[1];
  const conditionStars = [...new Set(pattern.star_names)]
    .filter((name) => starText.includes(name))
    .sort((left, right) => starText.indexOf(left) - starText.indexOf(right));
  if (
    conditionStars.length < 2 ||
    starText.replace(/[、，,与和及\s]/gu, '') !== conditionStars.join('')
  ) {
    return false;
  }

  const palaceName = match[2].replace(/宫$/u, '');
  if (!pattern.palace_names.some((name) => name.replace(/宫$/u, '') === palaceName)) {
    return false;
  }

  const targetPalaces = pattern.palace_indexes
    .map((index) =>
      displayedPalaces.find(
        (palace) => palace.index === index && palace.name.replace(/宫$/u, '') === palaceName,
      ),
    )
    .filter((palace): palace is PalaceFact => Boolean(palace));
  if (targetPalaces.length !== 1) return false;

  const palaceStars = new Set(
    [
      ...targetPalaces[0].major_stars,
      ...targetPalaces[0].minor_stars,
      ...targetPalaces[0].other_stars,
    ].map((star) => star.name),
  );
  return conditionStars.every((name) => palaceStars.has(name));
}
