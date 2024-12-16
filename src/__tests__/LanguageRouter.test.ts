import { ROOT } from 'lup-root';
import {
  DEFAULTS,
  getLanguages,
  LanguageRouter,
} from '../index';

const TRANSLATIONS_DIR = ROOT + '/src/__tests__/translations';

var handle: Function | any;
var locales: string[];
beforeAll(async () => {

  DEFAULTS.REQUEST_ADD_TRANSLATIONS_ATTRIBUTE = 'TEXT'; // by default disabled

  handle = LanguageRouter({
    translationsDir: TRANSLATIONS_DIR,
    redirectRoot: true,
  });

  await handle.preload();
  locales = await getLanguages(TRANSLATIONS_DIR);
});

const emulateRequestResponse = function (
  url: string,
  langCookieValue: string | null,
  acceptLangHeader: string | null,
): [req: any, res: any, exec: () => Promise<void>] {
  const req: any = new Object();
  req.url = url;
  req.headers = {};
  if (acceptLangHeader) req.headers['accept-language'] = acceptLangHeader;
  if (langCookieValue) req.headers['cookie'] = DEFAULTS.COOKIE_NAME + '=' + langCookieValue;

  const res: any = new Object();
  res.get = (key: string) => res[key];
  res.set = (key: string, value: any) => (res[key] = value);
  res.redirects = [];
  res.redirect = (status: number, location: string) => res.redirects.push({ location, status });

  return [
    req,
    res,
    async function () {
      return handle(req, res);
    },
  ];
};

test('LanguageRouter valid handle', () => {
  expect(handle).not.toBeNull();
  expect(handle).toBeInstanceOf(Function);
});

test('Language code list present', async () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', null, null);
  await expect(exec).not.toThrow();
  let foundList = req[DEFAULTS.REQUEST_ADD_LANGUAGE_ATTRIBUTE + 's'];
  expect(foundList).toBeInstanceOf(Array);
  expect(foundList.length === locales.length);
  expect(foundList).toEqual(expect.arrayContaining(locales));
});

test('Detect correct language from URI', async () => {
  const [req, _res, exec] = emulateRequestResponse('/de/hello', 'en', null);
  await expect(exec).not.toThrow();
  expect(req[DEFAULTS.REQUEST_ADD_LANGUAGE_ATTRIBUTE]).toBe('de');
});

test('Detect correct language from cookie', async () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', 'de', null);
  await expect(exec).not.toThrow();
  expect(req[DEFAULTS.REQUEST_ADD_LANGUAGE_ATTRIBUTE]).toBe('de');
});

test('Detect correct language from HTTP Accept-Language header field', async () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', null, 'de');
  await expect(exec).not.toThrow();
  expect(req[DEFAULTS.REQUEST_ADD_LANGUAGE_ATTRIBUTE]).toBe('de');
});

test('Fallback to default language if no language detected', async () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', null, null);
  await expect(exec).not.toThrow();
  expect(req[DEFAULTS.REQUEST_ADD_LANGUAGE_ATTRIBUTE]).toBe(DEFAULTS.LANGUAGE);
});

test('Translations attribute set', async () => {
  const [req, _res, exec] = emulateRequestResponse('/de/hello', null, null);
  await expect(exec).not.toThrow();
  expect(req[DEFAULTS.REQUEST_ADD_TRANSLATIONS_ATTRIBUTE]).toBeDefined();
  expect(req[DEFAULTS.REQUEST_ADD_TRANSLATIONS_ATTRIBUTE]['HelloWorld']).toEqual('Hallo Welt');
});

test('Path attribute set', async () => {
  const [req, _res, exec] = emulateRequestResponse('/de/hello?test', null, null);
  await expect(exec).not.toThrow();
  expect(req[DEFAULTS.REQUEST_ADD_PATH_ATTRIBUTE]).toBeDefined();
  expect(req[DEFAULTS.REQUEST_ADD_PATH_ATTRIBUTE]).toEqual('/hello');
});

test('Redirect root document to language prefixed root', async () => {
  const [req, res, exec] = emulateRequestResponse('/', 'de', null);
  await expect(exec).not.toThrow();
  expect(res.redirects.length === 1);
  expect(res.redirects[0].location === '/de/');
});

test('Do not redirect non-root documents', async () => {
  const [req, res, exec] = emulateRequestResponse('/en/', 'de', null);
  await expect(exec).not.toThrow();
  expect(res.redirects.length === 0);
});
