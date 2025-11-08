import DOMPurify from 'dompurify';

/**
 * Sanitizes input by removing all HTML tags and potentially dangerous content.
 * Use this for user inputs that should be plain text only.
 * 
 * @param input - The user input string to sanitize
 * @returns Sanitized string with all HTML removed
 */
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitizes HTML content while allowing safe formatting tags.
 * Use this for rich text content where basic formatting is allowed.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML with only safe tags allowed
 */
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitizes and trims whitespace from input.
 * Use this for text fields where leading/trailing spaces should be removed.
 * 
 * @param input - The user input string to sanitize and trim
 * @returns Sanitized and trimmed string
 */
export const sanitizeAndTrim = (input: string): string => {
  return sanitizeInput(input).trim();
};
