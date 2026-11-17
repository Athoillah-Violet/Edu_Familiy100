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
