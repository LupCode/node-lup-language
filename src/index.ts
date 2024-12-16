import { ROOT } from 'lup-root';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Language detection methods.
 *  - uri: Detects language from URI e.g. '/en/about/' -> 'en'.
 *  - http-accept: Detects language from HTTP header 'accept-language'.
 *  - cookie: Detects language from cookie.
 */
type LanguageDetectionMethod = 'uri' | 'http-accept' | 'cookie';


/** Contains default settings that will be used if an option is not specified. */
export const DEFAULTS: {

  /** Default language code that will be used if no other method can detect the language. */
  LANGUAGE: string,

  /** Default list of language codes that will be accepted. */
  LANGUAGES: string[],



  /** Path to next.config.js file from which languages will be loaded from path i18n.locales (empty string to disable). */
  USE_NEXT_CONFIG_LANGUAGES: string,
  
  /** Default if language codes should be loaded from files in translations directory. */
  LANGUAGES_FROM_TRANSLATIONS_DIR: boolean,

  /** Default relative path from project root to a directory containing translation files.
   * Translation files are json files with the name of a language code e.g. 'en.json'.
   * Can also be an absolute path.
   */
  TRANSLATIONS_DIR: string,

  /** Default order of language detection methods. Entries can be removed if those methods should not be used. */
  LANGUAGE_DETECTION_METHODS: LanguageDetectionMethod[],


  /** Default setting if request to root document should be redirected to language prefixed root. */
  REDIRECT_ROOT: boolean,

  /** If root gets redirected to language prefixed root this HTTP response code will be sent. */
  REDIRECT_ROOT_RESPONSE_CODE: number,


  /** Default name of cookie to read/store user's language or null to disable cookie reading/storing. */
  COOKIE_NAME: string,

  /** Default expire seconds for cookie that gets set. */
  COOKIE_EXPIRE: number,

  /** Default path for which cookie will be set (can be null to not set property). */
  COOKIE_PATH: string,

  /** Default domain the cookie will be set for (can be null to not set property). */
  COOKIE_DOMAIN: string | null,

  /** 
   * Default cookie setting if cookie should be set containing detected language.
   * (otherwise cookie just get read if 'DEFAULTS.COOKIE_NAME' is valid).
   */
  COOKIE_UPDATE: boolean,


  /** Name of the output attribute added to the request object that tells which language is requested. */
  REQUEST_ADD_LANGUAGE_ATTRIBUTE: string,

  /** 
   * Name of the output attribute added to the request object that points to a key/value map with the translations in the requested language 
   * (empty string to disable).
   */
  REQUEST_ADD_TRANSLATIONS_ATTRIBUTE: string,

  /** Name of the attribute added to the request object containing the path of the URI without the language prefix and without the query string. */
  REQUEST_ADD_PATH_ATTRIBUTE: string,

  /** Default behavior if the locale prefix should be remove from the req.url attribute. */
  REQUEST_URL_REMOVE_LANGUAGE_PREFIX: boolean,

} = {
  LANGUAGE: 'en',
  LANGUAGES: ['en'],

  USE_NEXT_CONFIG_LANGUAGES: '',
  LANGUAGES_FROM_TRANSLATIONS_DIR: true,
  TRANSLATIONS_DIR: './translations/',
  LANGUAGE_DETECTION_METHODS: ['uri', 'cookie', 'http-accept'],

  REDIRECT_ROOT: false,
  REDIRECT_ROOT_RESPONSE_CODE: 302,

  COOKIE_NAME: 'L',
  COOKIE_EXPIRE: 5184000,
  COOKIE_PATH: '/',
  COOKIE_DOMAIN: null,
  COOKIE_UPDATE: true,

  REQUEST_ADD_LANGUAGE_ATTRIBUTE: 'lang',
  REQUEST_ADD_TRANSLATIONS_ATTRIBUTE: '',
  REQUEST_ADD_PATH_ATTRIBUTE: 'PATH', // 'path' is already used by express
  REQUEST_URL_REMOVE_LANGUAGE_PREFIX: true,
};




type NextRequest = Request & {
  get cookies(): {
    get(name: string): { value: string };
  },
};

type LanguageNextResponse = {

  /** URI to redirect to. */
  redirect?: string,

  /** HTTP response code to use when redirecting. */
  redirectResponseCode?: number,

  /** Cookie to set. */
  cookie?: {
    name: string,
    value: string,
    expire: number,
    domain?: string,
    path?: string,
  },

  /** Language code that was detected. */
  language: string,

  /** List of language codes that are supported. */
  languages: string[],

  /** Path of the URI without the language prefix and without the query string. */
  path: string,

  /** Object containing all translations in the detected language (only if requestAddTranslationsAttribute is set). */
  translations?: { [key: string]: string },
}

type WithMethods = {
  /**
   * Optionally preload LanguageRouter so first request can be handled faster.
   * @return Promise<void> that resolves when preloading is done.
   */
  preload: () => Promise<void>;

  /**
   * Optionally preload LanguageRouter so first request can be handled faster.
   */
  preloadSync: () => void;

  /**
   * Can be called inside a Next.js middleware to handle language detection and translation loading. 
   * @param req NextRequest object that should be handled.
   * @returns Object containing redirect and redirectResponseCode if a redirect should be done.
   */
  nextJsMiddlewareHandler: (req: NextRequest) => LanguageNextResponse;
}

type LanguageDetectionRequestHandler = ((req: any, res: any, next?: () => void) => Promise<void>) & WithMethods;


// GLOBAL VARIABLES FOR CACHING
const LANGUAGES: { [translationsDir: string]: string[] } = {}; // { translationsDir: [] }
const DICTONARY: { [translationsDir: string]: { [lang: string]: { [key: string]: string } } } = {}; // { translationsDir: {lang: {key: translation} } }


/**
 * Reloads translations from files inside given directory.
 * @param translationsDir Relative path to directory containing JSON files with translations.
 * @returns Promise that resolves with a list of language codes that where found after translations have been reloaded from files.
 */
export const reloadTranslations = async (translationsDir: string = DEFAULTS.TRANSLATIONS_DIR): Promise<string[]> => {
  if (!translationsDir) translationsDir = DEFAULTS.TRANSLATIONS_DIR;
  // do not pre-initialize LANGUAGES and DICTONARY here so in multi-threaded environments all threads wait
  return new Promise((resolve, reject) => {
    const TRANSLATIONS_DIR = path.resolve(ROOT, translationsDir).toString();

    function scanFiles() {
      fs.readdir(TRANSLATIONS_DIR, null, (err: any, files: string[]) => {
        if (err) console.error(err);
        if (files.length === 0) {
          reject("No files found in '" + translationsDir + "' (" + TRANSLATIONS_DIR + ' | ' + ROOT + ')');
        }
        const dict: any = {};
        const langs = new Set<string>();
        let globals: any = null;
        let remaining = files.length;

        for (let i = 0; i < files.length; i++) {
          const file = files[i].toString();

          // if not a json file skip it
          if (!file.endsWith('.json')) {
            if (--remaining === 0) {
              LANGUAGES[translationsDir] = Array.from(langs);
              DICTONARY[translationsDir] = dict;
              resolve(LANGUAGES[translationsDir]);
              return;
            }
            continue;
          }

          // start reading json file
          const filePath = path.resolve(TRANSLATIONS_DIR, file).toString();
          fs.readFile(filePath, {}, (err2: any, data: any) => {
            if (err2) console.error(err2);
            try {
              const json = JSON.parse(data.toString());
              const lang = file.substring(0, file.length - '.json'.length);
              if (lang.startsWith('global')) {
                globals = json;
                for (const l in dict) for (const k in json) dict[l][k] = dict[l][k] || json[k];
              } else {
                langs.add(lang);
                if (!dict[lang]) dict[lang] = {};
                if (globals) for (const k in globals) dict[lang][k] = globals[k];
                for (const k in json) dict[lang][k] = json[k];
              }
            } catch (ex) {
              if (!err) console.error(ex);
            }
            if (--remaining === 0) {
              LANGUAGES[translationsDir] = Array.from(langs);
              LANGUAGES[translationsDir].sort();
              DICTONARY[translationsDir] = dict;
              resolve(LANGUAGES[translationsDir]);
            }
          });
        }
      });
    }

    fs.access(TRANSLATIONS_DIR, (err: any) => {
      if(!err) 
        scanFiles();
      else
        fs.mkdir(TRANSLATIONS_DIR, { recursive: true }, (err2: any) => {
          if (err2) console.error(err2);
          scanFiles();
        });
    });
  });
};


/**
 * Reloads translations from files inside given directory.
 * @param translationsDir Relative path to directory containing JSON files with translations.
 * @returns Promise that resolves with a list of language codes that where found after translations have been reloaded from files.
 */
export const reloadTranslationsSync = (translationsDir: string = DEFAULTS.TRANSLATIONS_DIR): string[] => {
  if (!translationsDir) translationsDir = DEFAULTS.TRANSLATIONS_DIR;
  // do not pre-initialize LANGUAGES and DICTONARY here so in multi-threaded environments all threads wait
  const TRANSLATIONS_DIR = path.resolve(ROOT, translationsDir).toString();

  // create translations dir if not exists
  fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });

  const files = fs.readdirSync(TRANSLATIONS_DIR, null);
  if (files.length === 0) {
    throw new Error("No files found in '" + translationsDir + "' (" + TRANSLATIONS_DIR + ' | ' + ROOT + ')');
  }
  const dict: any = {};
  const langs = new Set<string>();
  let globals: any = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i].toString();

    // if not a json file skip it
    if (!file.endsWith('.json')) continue;

    // start reading json file
    const filePath = path.resolve(TRANSLATIONS_DIR, file).toString();
    try {
      const data = fs.readFileSync(filePath, {});
      const json = JSON.parse(data.toString());
      const lang = file.substring(0, file.length - '.json'.length);
      if (lang.startsWith('global')) {
        globals = json;
        for (const l in dict) for (const k in json) dict[l][k] = dict[l][k] || json[k];
      } else {
        langs.add(lang);
        if (!dict[lang]) dict[lang] = {};
        if (globals) for (const k in globals) dict[lang][k] = globals[k];
        for (const k in json) dict[lang][k] = json[k];
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  LANGUAGES[translationsDir] = Array.from(langs);
  LANGUAGES[translationsDir].sort();
  DICTONARY[translationsDir] = dict;
  return LANGUAGES[translationsDir];
}



const _getTranslations = (
  lang: string | null | undefined,
  defaultLang: string | null | undefined,
  translationKeys: string[] | Set<string> | null | undefined,
  translationsDir: string = DEFAULTS.TRANSLATIONS_DIR,
): { [key: string]: string } => {
  defaultLang = defaultLang || lang || DEFAULTS.LANGUAGE;
  lang = lang || defaultLang;

  const idx = lang?.lastIndexOf('-') || -1; // country code stripping
  const altLang = idx >= 0 ? lang?.substring(0, idx) : defaultLang;
  
  const transKeys: Set<string> = !translationKeys
    ? new Set()
    : !(translationKeys instanceof Set)
    ? new Set(translationKeys)
    : translationKeys;
  const dictornary = DICTONARY[translationsDir]
    ? DICTONARY[translationsDir][lang] || DICTONARY[translationsDir][altLang] || DICTONARY[translationsDir][defaultLang] || {}
    : {};
  const dict = transKeys.size !== 0 ? {} : dictornary;
  if (transKeys.size !== 0) transKeys.forEach((k) => (dict[k] = dictornary[k] || k));
  return dict;
};

/**
 * Returns a key/value array containing the translations in the given language.
 * @param lang Language code for which translations should be loaded.
 * @param defaultLang Default language code if given 'lang' is not supported.
 * @param translationKeys If not empty only translations with given keys will be included in output (if empty all translations will be included).
 * @param translationsDir Relative path to directory containing JSON files with translations (optional).
 * @returns Promise that resolves with the translations in the given language.
 */
export const getTranslations = async (
  lang: string | null | undefined,
  defaultLang: string | null | undefined,
  translationKeys: string[] | Set<string> | null | undefined = [],
  translationsDir: string = DEFAULTS.TRANSLATIONS_DIR,
): Promise<{ [key: string]: string }> => {
  if (!translationsDir) translationsDir = DEFAULTS.TRANSLATIONS_DIR;
  if (!DICTONARY[translationsDir]) await reloadTranslations(translationsDir);
  return _getTranslations(lang, defaultLang, translationKeys, translationsDir);
};

/**
 * Returns a translation for a given key in the given language.
 * @param lang Language code of language the translation should be in.
 * @param defaultLang Default language code if given 'lang' is not supported.
 * @param translationKey Key that should be looked up in the translations.
 * @param translationDir Relative path to directory containing JSON files with translations (optional).
 * @returns Promise that resolves with the translation or with the given key if no translation found.
 */
export const getTranslation = async (
  lang: string | null | undefined,
  defaultLang: string | null | undefined,
  translationKey: string,
  translationDir: string = DEFAULTS.TRANSLATIONS_DIR,
): Promise<string> => {
  return (await getTranslations(lang, defaultLang, [translationKey], translationDir))[translationKey];
};

/**
 * Returns loaded language codes found in translations directory.
 * @param translationsDir Relative path to directory containing JSON files with translations.
 * @returns Promise that resolves to a list of language codes.
 */
export const getLanguages = async (translationsDir: string = DEFAULTS.TRANSLATIONS_DIR): Promise<string[]> => {
  if (!translationsDir) translationsDir = DEFAULTS.TRANSLATIONS_DIR;
  if (!DICTONARY[translationsDir]) await reloadTranslations(translationsDir);
  return [...LANGUAGES[translationsDir]];
};

/**
 * Returns a map of all found languages and their native name.
 * Looksup following keys in the translations 'LANGUAGE_NAME_<lang>'.
 * @param translationsDir Relative path to directory containing JSON files with translations
 * @returns Promise that resolves to a map of language codes and their native names.
 */
export const getLanguageNames = async (
  translationsDir: string = DEFAULTS.TRANSLATIONS_DIR,
): Promise<{ [key: string]: string }> => {
  if (!translationsDir) translationsDir = DEFAULTS.TRANSLATIONS_DIR;
  if (!DICTONARY[translationsDir]) await reloadTranslations(translationsDir);

  const dict = DICTONARY[translationsDir];
  const names: { [key: string]: string } = {};
  const keyLocale = 'LANGUAGE_NAME';

  for (const lang of LANGUAGES[translationsDir]) {
    const keyGlobal = 'LANGUAGE_NAME_' + lang.toUpperCase();
    names[lang] = dict[lang][keyLocale] || dict[lang][keyGlobal] || lang.toUpperCase();
  }
  return names;
};

/**
 * Loads the contents of a file loaded inside the translations directory.
 * @param fileName Name of the file the contents should be loaded (relative path inside the translations directory).
 * @param translationsDir Relative path to directory containing JSON files with translations.
 * @returns Promise that resolves to the contents of the file.
 */
export const getTranslationFileContent = async (
  fileName: string,
  translationsDir: string = DEFAULTS.TRANSLATIONS_DIR,
): Promise<string> => {
  if (!translationsDir) translationsDir = DEFAULTS.TRANSLATIONS_DIR;
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(ROOT, translationsDir, fileName).toString();
    fs.readFile(filePath, {}, (err: any, data: any) => {
      if (data) resolve(data.toString());
      else reject(err);
    });
  });
};

/**
 * Loads the contents of a file loaded inside the translations directory.
 * @param fileName Name of the file the contents should be loaded (relative path inside the translations directory).
 * @param translationsDir Relative path to directory containing JSON files with translations.
 * @returns Contents of the file.
 */
export const getTranslationFileContentSync = (
  fileName: string,
  translationsDir: string = DEFAULTS.TRANSLATIONS_DIR,
): string => {
  if (!translationsDir) translationsDir = DEFAULTS.TRANSLATIONS_DIR;
  const filePath = path.resolve(ROOT, translationsDir, fileName).toString();
  return fs.readFileSync(filePath).toString();
};


/**
 * Splits a given locale string into language and country code.
 * @param locale Locale string that should be split.
 * @returns Language iso code and optionally country iso code if provided.
 */
export const splitLocale = (locale: string): { languageIso: string, countryIso?: string } => {
  const idx = locale.lastIndexOf('-');
  return {
    languageIso: idx >= 0 ? locale.substring(0, idx) : locale,
    countryIso: idx >= 0 ? locale.substring(idx + 1) : undefined,
  };
};


type LanguageRouterOptions = {
  /** Fallback language code that will be used if no other method can detect the language (if not defined 'DEFAULTS.LANGUAGE' will be used). */
  defaultLanguage?: string,

  /** List of language codes that will be accepted (if not defined 'DEFAULTS.LANGUAGES' will be used). */
  languages?: string[],


  /** 
   * Path to next.config.js file from which languages will be loaded from path i18n.locales 
   * (empty string to disable, if not defined 'DEFAULTS.USE_NEXT_CONFIG_LANGUAGES' will be used).
   */
  useNextConfigLanguages?: string,

  /** 
   * If supported languages should be automatically loaded from found files in translations directory 
   * (if not defined 'DEFAULTS.LANGUAGES_FROM_TRANSLATIONS_DIR' will be used). 
   */
  languagesFromTranslationsDir?: boolean,

  /** 
   * Relative path from project root or absolute path to a directory containing translation files.
   * Translation files are json files with the name of a language code e.g. 'en.json'
   * (if not defined 'DEFAULTS.TRANSLATIONS_DIR' will be used, if null option is disabled). 
   */
  translationsDir?: string,

  /** 
   * Order of language detection methods. Entries can be removed if those methods should not be used.
   * (if not defined 'DEFAULTS.LANGUAGE_DETECTION_METHODS' will be used). 
   */
  languageDetectionMethods?: LanguageDetectionMethod[],


  /** If root document should be redirected to language prefixed root (if not defined 'DEFAULTS.REDIRECT_ROOT' will be used). */
  redirectRoot?: boolean,

  /** 
   * HTTP response code that will be sent if root document gets redirected to language prefixed root 
   * (if not defined 'DEFAULTS.REDIRECT_ROOT_RESPONSE_CODE' will be used).
   */
  redirectRootResponseCode?: number,


  /** Name of cookie to read/store user's language or null to disable cookie reading/storing (if not defined 'DEFAULTS.COOKIE_NAME' will be used). */
  cookieName?: string,

  /** Expire seconds for cookie that gets set (if not defined 'DEFAULTS.COOKIE_EXPIRE' will be used). */
  cookieExpire?: number,

  /** Path for which cookie will be set (can be null to not set property, if not defined 'DEFAULTS.COOKIE_PATH' will be used). */
  cookiePath?: string,

  /** Domain the cookie will be set for (can be null to not set property, if not defined 'DEFAULTS.COOKIE_DOMAIN' will be used). */
  cookieDomain?: string,

  /** 
   * If cookie should be set containing detected language (otherwise cookie just get read if 'DEFAULTS.COOKIE_NAME' is valid, 
   * if not defined 'DEFAULTS.COOKIE_UPDATE' will be used).
   */
  cookieUpdate?: boolean,


  /** 
   * Name of the attribute added to the req object that will contain to the detected language string
   * (if not defined 'DEFAULTS.REQUEST_ADD_LANGUAGE_ATTRIBUTE' will be used). 
   */
  requestAddLanguageAttribute?: string,

  /** 
   * Name of the attribute added to the req object that will point to a key/value map with all translations in the detected language 
   * (empty string to disable, if not defined 'DEFAULTS.REQUEST_ADD_TRANSLATIONS_ATTRIBUTE' will be used). 
   */
  requestAddTranslationsAttribute?: string,

  /** 
   * Name of the attribute added to the req object containing the path of the URI without the language prefix and without the query string
   * (if not defined 'DEFAULTS.REQUEST_ADD_PATH_ATTRIBUTE' will be used). 
   */
  requestAddPathAttribute?: string,

  /** If the locale prefix should be remove from the req.url attribute (if not defined 'DEFAULTS.REQUEST_URL_REMOVE_LANGUAGE_PREFIX' will be used). */
  requestUrlRemoveLanguagePrefix?: boolean,

};

/**
 * Returns a HTTP request/response middleware for detecting request language and loading translation variables.
 * @param options Object containing options for behavior of the middleware.
 * @returns function(req, res, next) that is designed for being set as middleware to pre-handle incoming requests.
 */
export const LanguageRouter = (
  options?: LanguageRouterOptions
): LanguageDetectionRequestHandler => {
  const defaultLang = options?.defaultLanguage || DEFAULTS.LANGUAGE;

  const languagesFromTranslations = options?.languagesFromTranslationsDir !== undefined ? options.languagesFromTranslationsDir : DEFAULTS.LANGUAGES_FROM_TRANSLATIONS_DIR;
  const translationsDir = options?.translationsDir !== undefined ? options.translationsDir : DEFAULTS.TRANSLATIONS_DIR;
  const languageDetectionMethods = options?.languageDetectionMethods || DEFAULTS.LANGUAGE_DETECTION_METHODS;

  const redirectRoot = options?.redirectRoot !== undefined ? options.redirectRoot : DEFAULTS.REDIRECT_ROOT;
  const redirectRootResponseCode = options?.redirectRootResponseCode ?? DEFAULTS.REDIRECT_ROOT_RESPONSE_CODE;

  const cookieName = options?.cookieName !== undefined ? options.cookieName : DEFAULTS.COOKIE_NAME;
  const cookieExpire = options?.cookieExpire || DEFAULTS.COOKIE_EXPIRE;
  const cookiePath = options?.cookiePath !== undefined ? options.cookiePath : DEFAULTS.COOKIE_PATH;
  const cookieDomain = options?.cookieDomain !== undefined ? options.cookieDomain : DEFAULTS.COOKIE_DOMAIN;
  const cookieUpdate = options?.cookieUpdate !== undefined ? options.cookieUpdate : DEFAULTS.COOKIE_UPDATE;

  const languageAttr = options?.requestAddLanguageAttribute || DEFAULTS.REQUEST_ADD_LANGUAGE_ATTRIBUTE;
  const translationsAttr = options?.requestAddTranslationsAttribute !== undefined ? options.requestAddTranslationsAttribute : DEFAULTS.REQUEST_ADD_TRANSLATIONS_ATTRIBUTE;
  const pathAttr = options?.requestAddPathAttribute !== undefined ? options.requestAddPathAttribute : DEFAULTS.REQUEST_ADD_PATH_ATTRIBUTE;
  const updateUrlParam = options?.requestUrlRemoveLanguagePrefix !== undefined ? options.requestUrlRemoveLanguagePrefix : DEFAULTS.REQUEST_URL_REMOVE_LANGUAGE_PREFIX;

  // useNextConfigLanguages
  let languagesArr: string[] = []; // later converted to Set 'languages'
  if (options?.useNextConfigLanguages)
    languagesArr = languagesArr.concat(
      require(options?.useNextConfigLanguages !== undefined ? options.useNextConfigLanguages : ROOT + '/next.config.js').i18n
        .locales,
    );
  if (options?.languages) languagesArr = languagesArr.concat(options.languages);
  else if (!options?.useNextConfigLanguages) languagesArr = languagesArr.concat(DEFAULTS.LANGUAGES);
  
  let loadedLangs = false;
  const languagesSorted: string[] = [];
  const languagesSet = new Set<string>(languagesArr);


  /**
   * Optionally preload LanguageRouter so first request can be handled faster
   * @returns Promise<void> that resolves when preloading is done.
   */
  const preload = async (): Promise<void> => {
    if (loadedLangs) return;
    loadedLangs = true;
    if (translationsDir) {
      const ls = await reloadTranslations(translationsDir);
      if (languagesFromTranslations) for (const l of ls) languagesSet.add(l);
    }
    languagesSet.forEach((l: string) => languagesSorted.push(l));
    languagesSorted.sort();
  };

  const preloadSync = (): void => {
    if (loadedLangs) return;
    loadedLangs = true;
    if (translationsDir) {
      const ls = reloadTranslationsSync(translationsDir);
      if (languagesFromTranslations) for (const l of ls) languagesSet.add(l);
    }
    languagesSet.forEach((l: string) => languagesSorted.push(l));
    languagesSorted.sort();
  };


  function getHeaderValue(headers: any, key: string): string | null {
    if(!headers || !key) return null;
    const lowerKey = key.toLowerCase();
    if(typeof headers.get === 'function') return headers.get(key) ?? headers.get(lowerKey);
    if(typeof headers === 'object') return headers[key] ?? headers[lowerKey];
    const headersArr = Array.isArray(headers) ? headers : (typeof headers === 'string' ? headers.split('\n') : []);
    headers = {};
    for(let i=0; i < headersArr.length; i++){
      const idx = headersArr[i].indexOf(':');
      if(idx > 0){
        headers[headersArr[i].substring(0, idx).trim()] = headersArr[i].substring(idx + 1).trim();
      } else {
        headers[headersArr[i].trim()] = (i+1 < headersArr.length) ? headersArr[i+1].trim() : '';
        i++;
      }
    }
    return getHeaderValue(headers, key);
  }


  function getCookieValue(cookies: any): string | null {
    if(!cookies) return null;
    if(typeof cookies === 'object') return cookies[cookieName];
    const cookiesArr = Array.isArray(cookies) ? cookies : (typeof cookies === 'string' ? cookies.split(';') : []);
    for(let i=0; i < cookiesArr.length; i++){
      const idx = cookiesArr[i].indexOf('=');
      if(idx > 0){
        if(cookiesArr[i].substring(0, idx).trim() === cookieName) return cookiesArr[i].substring(idx + 1).trim();
      } else {
        if(cookiesArr[i].trim() === cookieName && i+1 < cookiesArr.length) return cookiesArr[i+1].trim();
      }
    }
    return null;
  }


  function detectLanguage(uri: string, headers: any): { uri: string, lang: string, pathUri: string } {
    let lang: string | null = null;
    const lowerUri = uri.toLowerCase();
    let updatedUri = false;

    for(const detectionMethod of languageDetectionMethods){
      switch(detectionMethod){
        case 'cookie':
          if(!cookieName) continue;
          lang = getCookieValue(getHeaderValue(headers, 'Cookie'));
          if(lang && !languagesSet.has(lang)) lang = null;
          break;

        case 'http-accept':
          const rawLangs = getHeaderValue(headers, 'Accept-Language');
          if(!rawLangs) continue;
          const langs = rawLangs.split(/,|;/g).map((v: string) => v.trim()).filter((v: string) => v.length > 0 && !v.startsWith('q='));
          for (let i = 0; i < langs.length; i++){
            if (languagesSet.has(langs[i])) {
              lang = langs[i];
              break;
            }
          }
          break;

        case 'uri':
          updatedUri = true;
          const startIdx = uri.startsWith('/') ? 1 : 0;
          const endIdx = uri.indexOf('/', startIdx);
          lang = (endIdx > startIdx ? uri.substring(startIdx, endIdx) : uri.substring(startIdx)).toLowerCase();
          if(lang && !languagesSet.has(lang)){
            lang = null;
          } else {
            uri = endIdx > startIdx ? uri.substring(endIdx) : '';
          }
          break;
      }
      if(lang) break;
    }

    lang = (lang || defaultLang).toLowerCase();
    uri = updatedUri ? uri : (lowerUri.startsWith('/' + lang) ? uri.substring(lang.length + 1) : (lowerUri.startsWith(lang) ? uri.substring(lang.length) : uri));
    const queryIdx = uri.indexOf('?');

    return { uri, lang, pathUri: queryIdx>=0 ? uri.substring(0, queryIdx) : uri };
  };



  /**
   * Can be called inside a Next.js middleware to handle language detection and translation loading. 
   * @param req NextRequest object that should be handled.
   * @returns Object containing redirect and redirectResponseCode if a redirect should be done.
   */
  const nextJsMiddlewareHandler = (req: NextRequest): LanguageNextResponse => {
    if(!loadedLangs) preloadSync();
    const { uri, lang, pathUri } = detectLanguage(req.url, req.headers);
    const isRoot = req.url.length <= 1;

    const response: LanguageNextResponse = {
      language: lang,
      languages: [...languagesSorted],
      path: pathUri,
    };

    // redirect root if not language prefixed
    if (redirectRoot && isRoot) {
      response.redirect = '/' + lang + '/';
      response.redirectResponseCode = redirectRootResponseCode;
    }

    // update cookie
    if (cookieName && cookieUpdate) {
      response.cookie = {
        name: cookieName,
        value: lang,
        expire: cookieExpire,
        domain: cookieDomain ? cookieDomain : undefined,
        path: cookiePath ? cookiePath : undefined,
      };
    }

    // add language attribute to request object
    if(languageAttr){
      (req as any)[languageAttr] = lang;
      (req as any)[languageAttr + 's'] = [...languagesSorted];
    }
    
    // add translations attribute to request
    if(translationsAttr){
      response.translations = _getTranslations(lang, defaultLang, [], translationsDir);
      (req as any)[translationsAttr] = response.translations;
    }

    // add path attribute to request object
    if(pathAttr) (req as any)[pathAttr] = pathUri;

    return response;
  };


  const expressHandler = async (req: any, res: any, next?: any) => {
    if(!loadedLangs) await preload();
    const { uri, lang, pathUri } = await detectLanguage(req.url, req.headers);
    const isRoot = req.url.length <= 1;

    // update cookie
    if (cookieName && cookieUpdate) {
      let cookies = res.get('set-cookie') || [];
      cookies = res instanceof Array ? cookies : cookies.toString().length === 0 ? [] : [cookies];

      let cook = cookieName + '=' + lang + (cookieExpire ? '; Max-Age=' + cookieExpire : '');
      cook += (cookiePath ? '; Path=' + cookiePath : '') + (cookieDomain ? '; Domain=' + cookieDomain : '');
      cookies.push(cook);

      res.set('set-cookie', cookies);
    }

    // redirect root if not language prefixed
    if (redirectRoot && isRoot) {
      res.redirect(redirectRootResponseCode, DEFAULTS.REDIRECT_ROOT_RESPONSE_CODE, '/' + lang + '/', );
      return;
    }

    // add language attribute to request object
    if(languageAttr){
      req[languageAttr] = lang;
      req[languageAttr + 's'] = [...languagesSorted];
    }
    
    // add translations attribute to request object
    if(translationsAttr) req[translationsAttr] = _getTranslations(lang, defaultLang, [], translationsDir);

    // add path attribute to request object
    if(pathAttr) req[pathAttr] = pathUri;

    // remove language prefix from url
    if(updateUrlParam) req.url = uri;

    if (next) next();
  };



  /**
   * Optionally preload LanguageRouter so first request can be handled faster.
   * @returns Promise<void> that resolves when preloading is done.
   */
  expressHandler.preload = preload;

  /**
   * Optionally preload LanguageRouter so first request can be handled faster.
   */
  expressHandler.preloadSync = preloadSync;

  /**
   * Can be called inside a Next.js middleware to handle language detection and translation loading. 
   * @param req NextRequest object that should be handled.
   * @returns Object containing redirect and redirectResponseCode if a redirect should be done.
   */
  expressHandler.nextJsMiddlewareHandler = nextJsMiddlewareHandler;

  return expressHandler;
};

export default {
  DEFAULTS,
  reloadTranslations,
  getTranslation,
  getTranslations,
  getLanguageNames,
  getLanguages,
  getTranslationFileContent,
  getTranslationFileContentSync,
  LanguageRouter,
};
