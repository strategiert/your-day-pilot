#!/usr/bin/env tsx
/**
 * Translation script using DeepL API
 *
 * Usage:
 *   DEEPL_API_KEY=your_key_here npm run translate
 *
 * This script will:
 * 1. Read all English translation files from src/i18n/locales/en/
 * 2. Translate them to German, Spanish, French, and Italian using DeepL
 * 3. Write the translated files to their respective locale directories
 */

import * as fs from 'fs';
import * as path from 'path';

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

const LOCALES_DIR = path.join(process.cwd(), 'src', 'i18n', 'locales');
const EN_DIR = path.join(LOCALES_DIR, 'en');

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

/**
 * Translate text using DeepL API
 */
async function translateText(text: string, targetLang: string): Promise<string> {
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
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
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
 * Main execution
 */
async function main() {
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
    console.log(`\n🔄 Translating to ${targetLangCode.toUpperCase()} (${deeplLangCode})`);
    console.log('─'.repeat(50));

    for (const file of files) {
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
