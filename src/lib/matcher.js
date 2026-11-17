/**
 * Pure functions for matching user answers against answer list as suggestions for teachers/counselors.
 * Does not automatically decide right/wrong.
 */

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates Levenshtein distance between two strings.
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const prevRow = new Array(bLen + 1);
  const currRow = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i;
    const aChar = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLen; j++) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    for (let j = 0; j <= bLen; j++) {
      prevRow[j] = currRow[j];
    }
  }

  return prevRow[bLen];
}

/**
 * Normalizes text by lowercasing, stripping punctuation, and trimming extra spaces.
 */
export function normalizeText(text) {
  if (typeof text !== 'string') {
    if (text === null || text === undefined) return '';
    text = String(text);
  }
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Suggests matching answers ranked by confidence score.
 * Never decides automatically; purely provides prioritized suggestions for the teacher.
 *
 * @param {string} input - The answer given by the player/student.
 * @param {Array} answers - List of candidate answers ({ id, answer_text, points, keywords, ... }).
 * @param {Array|Set} revealedIds - Answers already opened/revealed, which must be ignored.
 * @returns {Array<{ answer: object, score: number, matchType: string, matchedTerm: string }>}
 */
export function suggestMatches(input, answers, revealedIds = []) {
  if (!input || !Array.isArray(answers) || answers.length === 0) {
    return [];
  }

  const normalizedInput = normalizeText(input);
  if (!normalizedInput) {
    return [];
  }

  const revealedSet = revealedIds instanceof Set ? revealedIds : new Set(revealedIds || []);
  const availableAnswers = answers.filter((ans) => ans && !revealedSet.has(ans.id));
  if (availableAnswers.length === 0) {
    return [];
  }

  const inputWords = normalizedInput.split(' ').filter(Boolean);
  const results = [];

  for (const answer of availableAnswers) {
    const normAnswerText = normalizeText(answer.answer_text);
    const keywords = Array.isArray(answer.keywords) ? answer.keywords : [];
    const normKeywords = keywords.map(normalizeText).filter(Boolean);

    let bestMatch = null;

    // 1. Exact match with answer_text
    if (normalizedInput === normAnswerText) {
      bestMatch = {
        score: 100,
        matchType: 'exact',
        matchedTerm: answer.answer_text,
      };
    }

    // 2. Exact match with any keyword
    if (!bestMatch) {
      for (const kw of normKeywords) {
        if (normalizedInput === kw) {
          bestMatch = {
            score: 95,
            matchType: 'exact_keyword',
            matchedTerm: kw,
          };
          break;
        }
      }
    }

    // 3. Whole-word match on keywords
    if (!bestMatch) {
      for (const kw of normKeywords) {
        const kwWords = kw.split(' ').filter(Boolean);

        if (kwWords.length > 1) {
          // Multi-word keyword phrase match with whole word boundaries
          const phraseRegex = new RegExp(`(^|\\s)${escapeRegex(kw)}(\\s|$)`);
          if (phraseRegex.test(normalizedInput)) {
            bestMatch = {
              score: 85,
              matchType: 'keyword_phrase',
              matchedTerm: kw,
            };
            break;
          }
          // Or all words of multi-word keyword exist as whole words in input
          const allKwInInput = kwWords.every((w) => inputWords.includes(w));
          if (allKwInInput) {
            bestMatch = {
              score: 80,
              matchType: 'keyword_all_words',
              matchedTerm: kw,
            };
            break;
          }
        } else if (kwWords.length === 1) {
          const singleKw = kwWords[0];
          // Single word keyword: exact whole-word match in input
          if (inputWords.includes(singleKw)) {
            bestMatch = {
              score: 80,
              matchType: 'keyword_word',
              matchedTerm: singleKw,
            };
            break;
          }
        }
      }

      // Input as a whole phrase inside answer text (only if input is at least 4 chars)
      if (!bestMatch && normalizedInput.length >= 4) {
        const phraseRegex = new RegExp(`(^|\\s)${escapeRegex(normalizedInput)}(\\s|$)`);
        if (phraseRegex.test(normAnswerText)) {
          bestMatch = {
            score: 75,
            matchType: 'answer_phrase',
            matchedTerm: normalizedInput,
          };
        }
      }
    }

    // 4. Fuzzy Levenshtein (ONLY for words >= 5 characters, strict tolerance)
    if (!bestMatch) {
      for (const kw of normKeywords) {
        const kwWords = kw.split(' ').filter(Boolean);
        for (const kwWord of kwWords) {
          if (kwWord.length < 5) continue; // Words < 5 chars NEVER use Levenshtein

          for (const inWord of inputWords) {
            if (inWord.length < 5) continue; // Words < 5 chars NEVER use Levenshtein

            // Strict tolerance: len 5-7 => max 1 diff; len >= 8 => max 2 diffs
            const maxDistance = kwWord.length >= 8 && inWord.length >= 8 ? 2 : 1;
            const dist = levenshteinDistance(inWord, kwWord);

            if (dist <= maxDistance) {
              const score = dist === 1 ? 65 : 55;
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = {
                  score,
                  matchType: 'fuzzy_keyword',
                  matchedTerm: `${inWord} ~ ${kwWord}`,
                };
              }
            }
          }
        }
      }
    }

    if (bestMatch) {
      results.push({
        answer,
        score: bestMatch.score,
        matchType: bestMatch.matchType,
        matchedTerm: bestMatch.matchedTerm,
      });
    }
  }

  // Sort descending by score, then answer points
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.answer.points || 0) - (a.answer.points || 0);
  });

  return results;
}
