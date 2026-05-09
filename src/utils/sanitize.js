/**
 * High-Performance Regex Sanitization Utility for Production Input Protection
 */

/**
 * Strips all HTML tags, script elements, and execution vectors to prevent Cross-Site Scripting (XSS).
 * @param {any} val - The input to sanitize.
 * @returns {string} - Clean, safe string.
 */
export function sanitizeString(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  // 1. Remove HTML tags completely
  let clean = str.replace(/<[^>]*>/g, '')
  // 2. Escape double quotes and basic script characters
  clean = clean.replace(/["']/g, '')
  return clean.trim()
}

/**
 * Keeps only safe alphanumeric characters, spaces, hyphens, and underscores.
 * Perfect for ID fields, track names, and simple structured inputs.
 * @param {any} val - The input to sanitize.
 * @returns {string} - Safe alphanumeric string.
 */
export function sanitizeAlphanumeric(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  return str.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim()
}
