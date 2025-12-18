/**
 * Password Generator Utility
 * Provides functions for generating secure random passwords
 */

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

/**
 * Generate a random password
 * @param {Object} options - Configuration options
 * @param {number} options.length - Length of password (default: 12)
 * @param {boolean} options.uppercase - Include uppercase letters (default: true)
 * @param {boolean} options.lowercase - Include lowercase letters (default: true)
 * @param {boolean} options.numbers - Include numbers (default: true)
 * @param {boolean} options.symbols - Include symbols (default: true)
 * @param {string} options.exclude - Characters to exclude (default: '')
 * @returns {string} Generated password
 */
export function generatePassword(options?: {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  exclude?: string;
}): string {
  const {
    length = 12,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    exclude = "",
  } = options ?? {};

  // Validate length
  if (length < 4) {
    throw new Error("Password length must be at least 4 characters");
  }

  // Build character set
  let charset = "";
  const requiredChars: string[] = [];

  if (lowercase) {
    charset += LOWERCASE;
    requiredChars.push(getRandomChar(LOWERCASE, exclude));
  }
  if (uppercase) {
    charset += UPPERCASE;
    requiredChars.push(getRandomChar(UPPERCASE, exclude));
  }
  if (numbers) {
    charset += NUMBERS;
    requiredChars.push(getRandomChar(NUMBERS, exclude));
  }
  if (symbols) {
    charset += SYMBOLS;
    requiredChars.push(getRandomChar(SYMBOLS, exclude));
  }

  // Remove excluded characters
  if (exclude) {
    charset = charset
      .split("")
      .filter((c) => !exclude.includes(c))
      .join("");
  }

  if (charset.length === 0) {
    throw new Error("No valid characters available for password generation");
  }

  // Generate password with at least one character from each enabled set
  let password = [...requiredChars];

  // Fill remaining length with random characters
  for (let i = requiredChars.length; i < length; i++) {
    password.push(charset[getRandomInt(0, charset.length - 1)]);
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleArray(password).join("");
}

/**
 * Generate multiple passwords
 * @param {number} count - Number of passwords to generate
 * @param {Object} options - Password generation options
 * @returns {string[]} Array of generated passwords
 */
export function generatePasswords(
  count: number,
  options: {
    length?: number;
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
    exclude?: string;
  },
): string[] {
  return Array.from({ length: count }, () => generatePassword(options));
}

/**
 * Generate a memorable password using words and separators
 * @param {Object} options - Configuration options
 * @param {number} options.wordCount - Number of words (default: 3)
 * @param {string} options.separator - Separator between words (default: '-')
 * @param {boolean} options.capitalize - Capitalize first letter of each word (default: true)
 * @param {boolean} options.includeNumber - Add number at the end (default: true)
 * @returns {string} Generated memorable password
 */
export function generateMemorablePassword(options: {
  wordCount?: number;
  separator?: string;
  capitalize?: boolean;
  includeNumber?: boolean;
}): string {
  const {
    wordCount = 3,
    separator = "-",
    capitalize = true,
    includeNumber = true,
  } = options;

  const words = [
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "zeta",
    "theta",
    "iota",
    "kappa",
    "lambda",
    "sigma",
    "omega",
    "quantum",
    "photon",
    "neutron",
    "proton",
    "solar",
    "lunar",
    "cosmic",
    "stellar",
    "nova",
    "aurora",
    "crystal",
    "diamond",
    "emerald",
    "sapphire",
    "ruby",
    "amber",
    "jade",
    "thunder",
    "lightning",
    "storm",
    "wind",
    "rain",
    "snow",
    "cloud",
    "mountain",
    "ocean",
    "river",
    "forest",
    "desert",
    "valley",
    "peak",
  ];

  const selectedWords: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    let word = words[getRandomInt(0, words.length - 1)];
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    selectedWords.push(word);
  }

  let password = selectedWords.join(separator);

  if (includeNumber) {
    password += separator + getRandomInt(10, 999);
  }

  return password;
}

/**
 * Calculate password strength
 * @param {string} password - Password to evaluate
 * @returns {Object} Strength score and feedback
 */
export function calculatePasswordStrength(password: string) {
  let score = 0;
  const feedback: string[] = [];

  if (!password) {
    return { score: 0, strength: "Very Weak", feedback: ["Password is empty"] };
  }

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length < 8)
    feedback.push("Password should be at least 8 characters");

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push("Add special characters");

  // Determine strength level
  let strength;
  if (score <= 2) strength = "Very Weak";
  else if (score <= 4) strength = "Weak";
  else if (score <= 6) strength = "Medium";
  else if (score <= 7) strength = "Strong";
  else strength = "Very Strong";

  return { score, strength, feedback };
}

// Helper functions
function getRandomInt(min: number, max: number) {
  const range = max - min + 1;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return min + (bytes[0] % range);
}

function getRandomChar(charset: string, exclude = "") {
  const available = charset
    .split("")
    .filter((c) => !exclude.includes(c))
    .join("");
  return available[getRandomInt(0, available.length - 1)];
}

function shuffleArray(array: string[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getRandomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Default export
export default {
  generatePassword,
  generatePasswords,
  generateMemorablePassword,
  calculatePasswordStrength,
};
