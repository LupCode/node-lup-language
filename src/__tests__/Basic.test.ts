import { ROOT } from 'lup-root';
import * as lupLang from '../index';

const TRANSLATIONS_DIR = ROOT + '/src/__tests__/translations';

test('Loading languages from translations directory', async () => {
  await expect(lupLang.reloadTranslations(TRANSLATIONS_DIR)).resolves.not.toThrow();
});

describe('Checking loaded translations', () => {
  beforeAll(async () => {
    await lupLang.reloadTranslations(TRANSLATIONS_DIR);
  });

  test('Language codes correctly determined', async () => {
    const languageNames = await lupLang.getLanguageNames(TRANSLATIONS_DIR);
    expect(languageNames).toBeInstanceOf(Object);
    const langs = Object.keys(languageNames);
    expect(langs.length).toBe(2);
    expect(langs).toContain('en');
    expect(langs).toContain('de');
  });

  test('Load all translations if no translation keys are specified', async () => {
    const TEXT = await lupLang.getTranslations('de', 'en', [], TRANSLATIONS_DIR);
    expect(TEXT).toBeInstanceOf(Object);
    expect(Object.keys(TEXT).length).toBeGreaterThanOrEqual(3);
  });

  test('Only load specified translation keys', async () => {
    const TEXT = await lupLang.getTranslations('de', 'en', ['HelloWorld'], TRANSLATIONS_DIR);
    expect(TEXT).toBeInstanceOf(Object);
    expect(Object.keys(TEXT).length).toBe(1);
    expect(TEXT['HelloWorld']).toBeDefined();
  });

  test('Provide translation key if no translation found', async () => {
    const TEXT = await lupLang.getTranslations('de', 'en', ['GoodNight'], TRANSLATIONS_DIR);
    expect(TEXT).toBeInstanceOf(Object);
    expect(TEXT['GoodNight']).toEqual('GoodNight');
  });

  test('Translation keys in correct language loaded', async () => {
    const TEXT = await lupLang.getTranslations('de', 'en', [], TRANSLATIONS_DIR);
    expect(TEXT).toBeInstanceOf(Object);
    expect(TEXT['HelloWorld']).toEqual('Hallo Welt');
  });

  test('Global variables loaded', async () => {
    const TEXT = await lupLang.getTranslations('de', 'en', [], TRANSLATIONS_DIR);
    expect(TEXT).toBeInstanceOf(Object);
    expect(TEXT['NAME']).toEqual('lup-language');
  });

  test('Language specific translations can overwrite global variables', async () => {
    const TEXT = await lupLang.getTranslations('de', 'en', [], TRANSLATIONS_DIR);
    expect(TEXT).toBeInstanceOf(Object);
    expect(TEXT['OverwriteMe']).toEqual('Hab ich gemacht');
  });
});

test('Load HTML file async', async () => {
  const content = await lupLang.getTranslationFileContent('./html/test-de.html', TRANSLATIONS_DIR);
  expect(content.indexOf('Hallo Welt')).toBeGreaterThan(-1);
});
