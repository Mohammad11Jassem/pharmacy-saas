export function normalizeDrugName(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

export function normalizedLevenshteinSimilarity(
  first: string,
  second: string,
): number {
  if (first === second) {
    return 1;
  }

  if (!first.length || !second.length) {
    return 0;
  }

  const previous = Array.from(
    { length: second.length + 1 },
    (_, index) => index,
  );

  for (let i = 1; i <= first.length; i += 1) {
    const current = new Array<number>(second.length + 1);
    current[0] = i;

    for (let j = 1; j <= second.length; j += 1) {
      const substitutionCost = first[i - 1] === second[j - 1] ? 0 : 1;

      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
    }

    for (let j = 0; j <= second.length; j += 1) {
      previous[j] = current[j];
    }
  }

  const distance = previous[second.length];
  const maxLength = Math.max(first.length, second.length);

  return 1 - distance / maxLength;
}

export function jaroWinklerSimilarity(first: string, second: string): number {
  if (first === second) {
    return 1;
  }

  const firstLength = first.length;
  const secondLength = second.length;

  if (!firstLength || !secondLength) {
    return 0;
  }

  const matchDistance = Math.max(
    Math.floor(Math.max(firstLength, secondLength) / 2) - 1,
    0,
  );

  const firstMatches = new Array<boolean>(firstLength).fill(false);
  const secondMatches = new Array<boolean>(secondLength).fill(false);

  let matches = 0;

  for (let i = 0; i < firstLength; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, secondLength);

    for (let j = start; j < end; j += 1) {
      if (secondMatches[j] || first[i] !== second[j]) {
        continue;
      }

      firstMatches[i] = true;
      secondMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (!matches) {
    return 0;
  }

  let transpositions = 0;
  let secondIndex = 0;

  for (let i = 0; i < firstLength; i += 1) {
    if (!firstMatches[i]) {
      continue;
    }

    while (!secondMatches[secondIndex]) {
      secondIndex += 1;
    }

    if (first[i] !== second[secondIndex]) {
      transpositions += 1;
    }

    secondIndex += 1;
  }

  const halfTranspositions = transpositions / 2;
  const jaro =
    (matches / firstLength +
      matches / secondLength +
      (matches - halfTranspositions) / matches) /
    3;

  let commonPrefixLength = 0;
  const maxPrefixLength = Math.min(4, firstLength, secondLength);

  while (
    commonPrefixLength < maxPrefixLength &&
    first[commonPrefixLength] === second[commonPrefixLength]
  ) {
    commonPrefixLength += 1;
  }

  return jaro + commonPrefixLength * 0.1 * (1 - jaro);
}

export function calculateDrugNameSimilarity(
  searchedName: string,
  candidateName: string,
): number {
  const first = normalizeDrugName(searchedName);
  const second = normalizeDrugName(candidateName);

  if (!first || !second) {
    return 0;
  }

  const jaroWinkler = jaroWinklerSimilarity(first, second);
  const levenshtein = normalizedLevenshteinSimilarity(first, second);

  return jaroWinkler * 0.6 + levenshtein * 0.4;
}
