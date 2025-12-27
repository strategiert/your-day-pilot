#!/usr/bin/env tsx
/**
 * Translation script using DeepL API
 *
 * Usage:
 *   npm run translate
 *
 *   OR with inline API key:
 *   DEEPL_API_KEY=your_key_here npm run translate
 *
 * The script will load DEEPL_API_KEY from .env file or environment variable.
 *
 * This script will:
 * 1. Read all English translation files from src/i18n/locales/en/
 * 2. Translate them to German, Spanish, French, and Italian using DeepL
 * 3. Write the translated files to their respective locale directories
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

if (!DEEPL_API_KEY) {
  console.error('❌ Error: DEEPL_API_KEY environment variable is not set');
  console.error('Usage: DEEPL_API_KEY=your_key_here npm run translate');
  process.exit(1);
}

// Language codes mapping (i18n code -> DeepL code)
const TARGET_LANGUAGES = {
  de: 'DE',
  es: 'ES',
  fr: 'FR',
  it: 'IT',
};

// Rate limiting settings
const DELAY_BETWEEN_REQUESTS = 500; // ms between each translation
const RETRY_DELAY = 5000; // ms to wait on rate limit error
const MAX_RETRIES = 3;

const LOCALES_DIR = path.join(process.cwd(), 'src', 'i18n', 'locales');
const EN_DIR = path.join(LOCALES_DIR, 'en');

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

/**
 * Translate text using DeepL API with retry logic
 */
async function translateText(text: string, targetLang: string, retries = 0): Promise<string> {
  const params = new URLSearchParams({
    auth_key: DEEPL_API_KEY!,
    text,
    target_lang: targetLang,
    source_lang: 'EN',
  });

  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (response.status === 429) {
    if (retries < MAX_RETRIES) {
      console.log(`  ⏳ Rate limited, waiting ${RETRY_DELAY / 1000}s before retry ${retries + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return translateText(text, targetLang, retries + 1);
    }
    throw new Error(`DeepL API rate limit exceeded after ${MAX_RETRIES} retries`);
  }

  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}

/**
 * Recursively translate an object, preserving structure
 */
async function translateObject(
  obj: TranslationObject,
  targetLang: string,
  path: string = ''
): Promise<TranslationObject> {
  const result: TranslationObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      console.log(`  Translating: ${currentPath}`);
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      result[key] = await translateText(value, targetLang);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await translateObject(value, targetLang, currentPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Process a single translation file
 */
async function processFile(fileName: string, targetLang: string, targetLangCode: string) {
  const sourceFilePath = path.join(EN_DIR, fileName);
  const targetDir = path.join(LOCALES_DIR, targetLangCode);
  const targetFilePath = path.join(targetDir, fileName);

  console.log(`\n📄 Processing: ${fileName} → ${targetLangCode.toUpperCase()}`);

  // Read source file
  const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');
  const sourceJson: TranslationObject = JSON.parse(sourceContent);

  // Translate
  const translatedJson = await translateObject(sourceJson, targetLang);

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write translated file
  fs.writeFileSync(
    targetFilePath,
    JSON.stringify(translatedJson, null, 2) + '\n',
    'utf-8'
  );

  console.log(`✅ Saved: ${targetFilePath}`);
}

/**
 * Check if a translation file needs updating
 */
function needsTranslation(fileName: string, targetLangCode: string): boolean {
  const sourceFilePath = path.join(EN_DIR, fileName);
  const targetDir = path.join(LOCALES_DIR, targetLangCode);
  const targetFilePath = path.join(targetDir, fileName);

  // If target doesn't exist, needs translation
  if (!fs.existsSync(targetFilePath)) {
    return true;
  }

  // Check if target has same keys as source (simple check)
  try {
    const sourceContent = JSON.parse(fs.readFileSync(sourceFilePath, 'utf-8'));
    const targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf-8'));

    // If target equals source (English), it needs translation
    if (JSON.stringify(sourceContent) === JSON.stringify(targetContent)) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Main execution
 */
async function main() {
  // Check for --only flag to translate specific languages
  const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
  const onlyLangs = onlyArg ? onlyArg.split('=')[1].split(',') : null;

  console.log('🌐 Starting translation process...\n');
  console.log(`Source: ${EN_DIR}`);
  console.log(`Target languages: ${Object.keys(TARGET_LANGUAGES).join(', ')}\n`);

  // Get all JSON files from English directory
  const files = fs.readdirSync(EN_DIR).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.error('❌ No translation files found in', EN_DIR);
    process.exit(1);
  }

  console.log(`Found ${files.length} file(s) to translate: ${files.join(', ')}\n`);

  // Process each file for each target language
  for (const [targetLangCode, deeplLangCode] of Object.entries(TARGET_LANGUAGES)) {
    // Skip if --only flag is set and this language is not in the list
    if (onlyLangs && !onlyLangs.includes(targetLangCode)) {
      console.log(`\n⏭️  Skipping ${targetLangCode.toUpperCase()} (not in --only list)`);
      continue;
    }

    console.log(`\n🔄 Translating to ${targetLangCode.toUpperCase()} (${deeplLangCode})`);
    console.log('─'.repeat(50));

    for (const file of files) {
      // Check if translation is needed
      if (!needsTranslation(file, targetLangCode)) {
        console.log(`\n⏭️  Skipping ${file} → ${targetLangCode.toUpperCase()} (already translated)`);
        continue;
      }

      try {
        await processFile(file, deeplLangCode, targetLangCode);
      } catch (error) {
        console.error(`❌ Error translating ${file} to ${targetLangCode}:`, error);
        process.exit(1);
      }
    }
  }

  console.log('\n\n✨ Translation complete!');
  console.log('\nTranslated files created:');
  for (const lang of Object.keys(TARGET_LANGUAGES)) {
    console.log(`  - src/i18n/locales/${lang}/`);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
