import { ROOT } from 'lup-root';
import {
  DEFAULT_COOKIE_NAME,
  DEFAULT_LANGUAGE,
  DEFAULT_REQUEST_LANGUAGE_ATTR,
  DEFAULT_REQUEST_PROCESSED_PATH_ATTR,
  DEFAULT_REQUEST_TRANSLATIONS_ATTR,
  getLocales,
  LanguageRouter,
} from '../index';

const TRANSLATIONS_DIR = ROOT + '/src/__tests__/translations';

var handle: Function | any;
var locales: string[];
beforeAll(async () => {
  handle = LanguageRouter({
    translationsDir: TRANSLATIONS_DIR,
    redirectRoot: true,
  });
  await handle.preload();
  locales = await getLocales(TRANSLATIONS_DIR);
});

const emulateRequestResponse = function (
  url: string,
  langCookieValue: string | null,
  acceptLangHeader: string | null,
): [req: any, res: any, exec: Function] {
  const req: any = new Object();
  req.url = url;
  req.headers = {};
  if (acceptLangHeader) req.headers['accept-language'] = acceptLangHeader;
  if (langCookieValue) req.headers['cookie'] = DEFAULT_COOKIE_NAME + '=' + langCookieValue;

  const res: any = new Object();
  res.get = (key: string) => res[key];
  res.set = (key: string, value: any) => (res[key] = value);
  res.redirects = [];
  res.redirect = (status: number, location: string) => res.redirects.push({ location, status });

  return [
    req,
    res,
    async function () {
      await handle(req, res);
    },
  ];
};

test('LanguageRouter valid handle', () => {
  expect(handle).not.toBeNull();
  expect(handle).toBeInstanceOf(Function);
});

test('Language code list present', async () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', null, null);
  expect(exec).not.toThrow();
  let foundList = req[DEFAULT_REQUEST_LANGUAGE_ATTR + 's'];
  expect(foundList).toBeInstanceOf(Array);
  expect(foundList.length === locales.length);
  expect(foundList).toEqual(expect.arrayContaining(locales));
});

test('Detect correct language from URI', () => {
  const [req, _res, exec] = emulateRequestResponse('/de/hello', 'en', null);
  expect(exec).not.toThrow();
  expect(req[DEFAULT_REQUEST_LANGUAGE_ATTR]).toBe('de');
});

test('Detect correct language from cookie', () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', 'de', null);
  expect(exec).not.toThrow();
  expect(req[DEFAULT_REQUEST_LANGUAGE_ATTR]).toBe('de');
});

test('Detect correct language from HTTP Accept-Language header field', () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', null, 'de');
  expect(exec).not.toThrow();
  expect(req[DEFAULT_REQUEST_LANGUAGE_ATTR]).toBe('de');
});

test('Fallback to default language if no language detected', () => {
  const [req, _res, exec] = emulateRequestResponse('/hello', null, null);
  expect(exec).not.toThrow();
  expect(req[DEFAULT_REQUEST_LANGUAGE_ATTR]).toBe(DEFAULT_LANGUAGE);
});

test('Translations attribute set', () => {
  const [req, _res, exec] = emulateRequestResponse('/de/hello', null, null);
  expect(exec).not.toThrow();
  expect(req[DEFAULT_REQUEST_TRANSLATIONS_ATTR]).toBeDefined();
  expect(req[DEFAULT_REQUEST_TRANSLATIONS_ATTR]['HelloWorld']).toEqual('Hallo Welt');
});

test('Path attribute set', () => {
  const [req, _res, exec] = emulateRequestResponse('/de/hello?test', null, null);
  expect(exec).not.toThrow();
  expect(req[DEFAULT_REQUEST_PROCESSED_PATH_ATTR]).toBeDefined();
  expect(req[DEFAULT_REQUEST_PROCESSED_PATH_ATTR]).toEqual('/hello');
});

test('Redirect root document to language prefixed root', () => {
  const [req, res, exec] = emulateRequestResponse('/', 'de', null);
  expect(exec).not.toThrow();
  expect(res.redirects.length === 1);
  expect(res.redirects[0].location === '/de/');
});

test('Do not redirect non-root documents', () => {
  const [req, res, exec] = emulateRequestResponse('/en/', 'de', null);
  expect(exec).not.toThrow();
  expect(res.redirects.length === 0);
});
