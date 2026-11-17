/**
 * Pure validation functions.
 */

/**
 * Validates category data before sending to dataService / Supabase.
 *
 * Rules:
 * - title: not empty after trim, max 100 characters.
 * - description: optional, but if present max 300 characters.
 *
 * @param {{ title?: string, description?: string }} category
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateCategory(category = {}) {
  const errors = [];
  const rawTitle = category.title;
  const rawDesc = category.description;

  const trimmedTitle = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  const trimmedDesc = typeof rawDesc === 'string' ? rawDesc.trim() : '';

  if (!trimmedTitle) {
    errors.push('Judul kategori tidak boleh kosong.');
  } else if (trimmedTitle.length > 100) {
    errors.push('Judul kategori maksimal 100 karakter.');
  }

  if (trimmedDesc && trimmedDesc.length > 300) {
    errors.push('Deskripsi kategori maksimal 300 karakter.');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Validates a question data object.
 *
 * Rules:
 * - question_text: not empty after trim.
 * - multiplier: integer 1, 2, or 3.
 * - discussion_prompts: max 2 prompts.
 *
 * @param {{ question_text?: string, multiplier?: number, discussion_prompts?: string[] }} question
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateQuestion(question = {}) {
  const errors = [];
  const text = typeof question.question_text === 'string' ? question.question_text.trim() : '';

  if (!text) {
    errors.push('Teks soal tidak boleh kosong.');
  }

  const mult = Number(question.multiplier);
  if (!Number.isInteger(mult) || mult < 1 || mult > 3) {
    errors.push('Multiplier harus berupa bilangan bulat antara 1 sampai 3.');
  }

  if (question.discussion_prompts !== undefined && question.discussion_prompts !== null) {
    if (!Array.isArray(question.discussion_prompts)) {
      errors.push('Discussion prompts harus berupa array.');
    } else {
      const filtered = question.discussion_prompts
        .map((p) => (typeof p === 'string' ? p.trim() : ''))
        .filter(Boolean);
      if (filtered.length > 2) {
        errors.push('Maksimal discussion prompts adalah 2.');
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Validates an answers array for a question.
 *
 * Rules:
 * - 3 to 8 answers.
 * - Each answer text not empty after trim.
 * - Each answer points integer >= 0.
 * - No duplicate answer texts (case-insensitive).
 *
 * @param {Array<{ answer_text?: string, points?: number, keywords?: string[]|string }>} answers
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAnswers(answers) {
  const errors = [];

  if (!Array.isArray(answers)) {
    return {
      ok: false,
      errors: ['Daftar jawaban harus berupa array.'],
    };
  }

  if (answers.length < 3 || answers.length > 8) {
    errors.push('Jumlah jawaban harus antara 3 hingga 8 buah.');
  }

  const seenTexts = new Set();

  answers.forEach((ans, index) => {
    const rawText = ans?.answer_text;
    const text = typeof rawText === 'string' ? rawText.trim() : '';

    if (!text) {
      errors.push(`Teks jawaban ke-${index + 1} tidak boleh kosong.`);
    } else {
      const lowerText = text.toLowerCase();
      if (seenTexts.has(lowerText)) {
        errors.push(`Terdapat teks jawaban kembar/duplikat: "${text}".`);
      } else {
        seenTexts.add(lowerText);
      }
    }

    const pts = Number(ans?.points);
    if (!Number.isInteger(pts) || pts < 0) {
      errors.push(`Poin jawaban ke-${index + 1} harus berupa bilangan bulat >= 0.`);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Parses comma-separated keywords into cleaned array:
 * split koma, trim, lowercase, buang kosong dan duplikat.
 *
 * @param {string|string[]} input
 * @returns {string[]}
 */
export function parseKeywords(input) {
  if (!input) return [];

  let rawList = [];
  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    rawList = input.split(',');
  } else {
    rawList = [String(input)];
  }

  const result = [];
  const seen = new Set();

  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const cleaned = item.trim().toLowerCase();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      result.push(cleaned);
    }
  }

  return result;
}

/**
 * Validates the structure and content of an import package.
 *
 * @param {any} pkg
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateImportPackage(pkg) {
  const errors = [];

  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    return { ok: false, errors: ['Format data paket impor tidak valid (harus berupa objek JSON).'] };
  }

  if (pkg.version !== 1) {
    errors.push('Versi format data impor tidak didukung (harus version: 1).');
  }

  if (!pkg.category || typeof pkg.category !== 'object') {
    errors.push('Field category tidak ditemukan atau tidak valid.');
  } else {
    const catVal = validateCategory(pkg.category);
    if (!catVal.ok) {
      errors.push(...catVal.errors);
    }
  }

  if (!Array.isArray(pkg.questions)) {
    errors.push('Field questions harus berupa array.');
  } else {
    pkg.questions.forEach((q, idx) => {
      const qPrefix = `Soal ke-${idx + 1}: `;
      const qVal = validateQuestion(q);
      if (!qVal.ok) {
        errors.push(...qVal.errors.map((e) => `${qPrefix}${e}`));
      }
      const ansVal = validateAnswers(q?.answers);
      if (!ansVal.ok) {
        errors.push(...ansVal.errors.map((e) => `${qPrefix}${e}`));
      }
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
