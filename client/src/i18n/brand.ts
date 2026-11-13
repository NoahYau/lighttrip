/**
 * The fork's name, and how the upstream locale packs are made to say it.
 *
 * The shared packs still carry the upstream brand ("TREK") in every language.
 * Rewriting them would mean ~17k strings in ~960 files and would not translate
 * anything new; instead the fork's own name is substituted when a string is
 * resolved, so every language, the help guides and the generated documents say
 * LightTrip without touching the packs.
 *
 * Functional spellings stay as they are: `TREK_*` environment variables,
 * `@trek/*` imports, `trek_*` ids and a `/TREK` path inside a URL are not a
 * display name, and changing them would break instructions and links.
 */
const BRAND_NAME = 'LightTrip';

// `TREK` as a word: at the start of a string or after anything that is not a
// word character, `/` or `@` (so URLs and scopes are skipped), and not followed
// by a word character or `_` (so `TREK_PLUGINS_ENABLED` is skipped).
const BRAND_TERM = /(^|[^\w/@])TREK(?=[^\w_]|$)/g;

export function withBrand(text: string): string {
  // A missing key reaches `t()` as a non-string in a few defensive callers;
  // returning it unchanged keeps their old behaviour instead of throwing.
  if (typeof text !== 'string') return text;
  return text.replace(BRAND_TERM, (_match, lead: string) => `${lead}${BRAND_NAME}`);
}
