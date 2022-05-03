var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { ROOT } from 'lup-root';
import fs from 'fs';
import path from 'path';
/** Default language code that will be used if no other method can detect the language */
var DEFAULT_LANGUAGE = "en";
/** Default list of language codes that will be accepted */
var DEFAULT_LANGUAGES = ["en"];
/** Default if translations from directory should be loaded */
var DEFAULT_LOAD_TRANSLATIONS = true;
/** Default relative path from project root to a directory containing translation files.
 * Translation files are json files with the name of a language code e.g. 'en.json'.
 * Can also be an absolute path */
var DEFAULT_TRANSLATIONS_DIR = "./translations/";
/** Default if language codes should be loaded from files in translations directory */
var DEFAULT_LANGUAGES_FROM_DIR = true;
/** Default setting if URI should be used for language detection */
var DEFAULT_USE_URI = true;
/** Default setting if HTTP header (accept-language) should be used for language detection */
var DEFAULT_USE_HTTP = true;
/** Default name of cookie to read/store user's language or null to disable cookie reading/storing */
var DEFAULT_COOKIE_NAME = "L";
/** Default expire seconds for cookie that gets set */
var DEFAULT_COOKIE_EXPIRE = 5184000;
/** Default path for which cookie will be set (can be null to not set property) */
var DEFAULT_COOKIE_PATH = "/";
/** Default domain the cookie will be set for (can be null to not set property) */
var DEFAULT_COOKIE_DOMAIN = null;
/** Default cookie setting if cookie should be set containing detected language
 * (otherwise cookie just get read if 'DEFAULT_COOKIE_NAME' is valid) */
var DEFAULT_COOKIE_UPDATE = true;
/** Name of the output attribute added to the request object that tells which language is requested */
var DEFAULT_REQUEST_LANGUAGE_ATTR = "lang";
/** Name of the output attribute added to the request object that points to a key/value array with the translations in the requested language */
var DEFAULT_REQUEST_TRANSLATIONS_ATTR = "TEXT";
/** Default behavior if the language prefix should be remove from the req.url attribute */
var DEFAULT_UPDATE_URL_PARAM = true;
/** Name of the attribute added to the request object containing the path of the URL without the language prefix */
var DEFAULT_REQUEST_PROCESSED_PATH_ATTR = "PATH";
var LANGUAGES = {}; // { translationsDir: [] }
var DICTONARY = {}; // { translationsDir: {lang: {key: translation} } }
/**
 * Reloads translations from files inside given directory
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns Promise that resolves with a list of language codes that where found after translations have been reloaded from files
 */
var reloadTranslations = function (translationsDir) {
    if (translationsDir === void 0) { translationsDir = DEFAULT_TRANSLATIONS_DIR; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!translationsDir)
                translationsDir = DEFAULT_TRANSLATIONS_DIR;
            LANGUAGES[translationsDir] = [];
            DICTONARY[translationsDir] = [];
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var TRANSLATIONS_DIR = path.resolve(ROOT, translationsDir).toString();
                    function scanFiles() {
                        fs.readdir(TRANSLATIONS_DIR, {}, function (err, files) {
                            if (err)
                                console.error(err);
                            if (files.length == 0) {
                                reject("No files found in '" + translationsDir + "' (" + TRANSLATIONS_DIR + ")");
                            }
                            var dict = {};
                            var langs = new Set();
                            var globals = null;
                            var remaining = files.length;
                            var _loop_1 = function (i) {
                                var file = files[i].toString();
                                if (!file.endsWith(".json")) {
                                    if (--remaining == 0) {
                                        LANGUAGES[translationsDir] = Array.from(langs);
                                        DICTONARY[translationsDir] = dict;
                                        resolve(LANGUAGES[translationsDir]);
                                    }
                                    return "continue";
                                }
                                var filePath = path.resolve(TRANSLATIONS_DIR, file).toString();
                                fs.readFile(filePath, {}, function (err, data) {
                                    if (err)
                                        console.error(err);
                                    try {
                                        var json = JSON.parse(data.toString());
                                        var lang = file.substring(0, file.length - ".json".length);
                                        if (lang.startsWith("global")) {
                                            globals = json;
                                            for (var l in dict)
                                                for (var k in json)
                                                    dict[l][k] = dict[l][k] || json[k];
                                        }
                                        else {
                                            langs.add(lang);
                                            if (!dict[lang])
                                                dict[lang] = {};
                                            if (globals)
                                                for (var k in globals)
                                                    dict[lang][k] = globals[k];
                                            for (var k in json)
                                                dict[lang][k] = json[k];
                                        }
                                    }
                                    catch (ex) {
                                        if (!err)
                                            console.error(ex);
                                    }
                                    if (--remaining == 0) {
                                        LANGUAGES[translationsDir] = Array.from(langs);
                                        LANGUAGES[translationsDir].sort();
                                        DICTONARY[translationsDir] = dict;
                                        resolve(LANGUAGES[translationsDir]);
                                    }
                                });
                            };
                            for (var i = 0; i < files.length; i++) {
                                _loop_1(i);
                            }
                        });
                    }
                    fs.access(TRANSLATIONS_DIR, function (err) {
                        if (!err)
                            scanFiles();
                        else
                            fs.mkdir(TRANSLATIONS_DIR, { recursive: true }, function (err) {
                                if (err)
                                    console.error(err);
                                else
                                    scanFiles();
                            });
                    });
                })];
        });
    });
};
var _getTranslations = function (lang, defaultLang, translationKeys, translationsDir) {
    if (translationsDir === void 0) { translationsDir = DEFAULT_TRANSLATIONS_DIR; }
    translationKeys = (!translationKeys || translationKeys.length == 0) ? false : translationKeys;
    var dictornary = DICTONARY[translationsDir] ? (DICTONARY[translationsDir][lang] || DICTONARY[translationsDir][defaultLang] || {}) : {};
    var dict = translationKeys ? {} : dictornary;
    if (translationKeys)
        for (var _i = 0, translationKeys_1 = translationKeys; _i < translationKeys_1.length; _i++) {
            var k = translationKeys_1[_i];
            dict[k] = dictornary[k] || k;
        }
    return dict;
};
/**
 * Returns a key/value array containing the translations in the given language
 * @param {String} lang Language code for which translations should be loaded
 * @param {String} defaultLang Default language code if given 'lang' is not supported
 * @param {Array} translationKeys If not empty only translations with given keys will be included in output (if empty all translations will be included)
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns {<key>: "<translation>"}
 */
var getTranslations = function (lang, defaultLang, translationKeys, translationsDir) {
    if (translationKeys === void 0) { translationKeys = []; }
    if (translationsDir === void 0) { translationsDir = DEFAULT_TRANSLATIONS_DIR; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!translationsDir)
                        translationsDir = DEFAULT_TRANSLATIONS_DIR;
                    if (!!DICTONARY[translationsDir]) return [3 /*break*/, 2];
                    return [4 /*yield*/, reloadTranslations(translationsDir)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, _getTranslations(lang, defaultLang, translationKeys, translationsDir)];
            }
        });
    });
};
/**
 * Returns a map of all found languages and their native name.
 * Looksup following keys in the translations 'LANGUAGE_NAME_<lang>'
 * @returns {<lang>: "<native name>"}
 */
var getLanguageNames = function (translationsDir) {
    if (translationsDir === void 0) { translationsDir = DEFAULT_TRANSLATIONS_DIR; }
    return __awaiter(this, void 0, void 0, function () {
        var names, _i, _a, lang, key;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!translationsDir)
                        translationsDir = DEFAULT_TRANSLATIONS_DIR;
                    if (!!DICTONARY[translationsDir]) return [3 /*break*/, 2];
                    return [4 /*yield*/, reloadTranslations(translationsDir)];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    names = {};
                    for (_i = 0, _a = LANGUAGES[translationsDir]; _i < _a.length; _i++) {
                        lang = _a[_i];
                        key = "LANGUAGE_NAME_" + lang.toUpperCase();
                        if (DICTONARY[translationsDir][lang])
                            names[lang] = DICTONARY[translationsDir][lang][key] || key;
                    }
                    return [2 /*return*/, names];
            }
        });
    });
};
/**
 * Loads the contents of a file loaded inside the translations directory
 * @param {String} fileName Name of the file the contents should be loaded (relative path inside the translations directory)
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns {String} Contents of the file
 */
var getTranslationFileContent = function (fileName, translationsDir) {
    if (translationsDir === void 0) { translationsDir = DEFAULT_TRANSLATIONS_DIR; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!translationsDir)
                translationsDir = DEFAULT_TRANSLATIONS_DIR;
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var filePath = path.resolve(ROOT, translationsDir, fileName).toString();
                    fs.readFile(filePath, {}, function (err, data) {
                        if (data)
                            resolve(data);
                        else
                            reject(err);
                    });
                })];
        });
    });
};
/**
 * Loads the contents of a file loaded inside the translations directory
 * @param {String} fileName Name of the file the contents should be loaded (relative path inside the translations directory)
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns {String} Contents of the file
 */
var getTranslationFileContentSync = function (fileName, translationsDir) {
    if (translationsDir === void 0) { translationsDir = DEFAULT_TRANSLATIONS_DIR; }
    if (!translationsDir)
        translationsDir = DEFAULT_TRANSLATIONS_DIR;
    var filePath = path.resolve(ROOT, translationsDir, fileName).toString();
    return fs.readFileSync(filePath);
};
/**
 * Returns a HTTP request/response middleware for detecting request language and loading translation variables
 * @param {Object} options Object containing options for behavior
 * - default: "en"  Fallback language code that will be used if no other method can detect the language
 *                  (if not defined 'DEFAULT_LANGUAGE' will be used) <br>
 * - languages: []  List of language codes that will be accepted (if not defined 'DEFAULT_LANGUAGES' will be used) <br>
 * - useUri: true  Boolean if URI should be used for language detection (if not defined 'DEFAULT_USE_URI' will be used) <br>
 * - useHttp: true  Boolean if HTTP header should be used for language detection (if not defined 'DEFAULT_USE_HTTP' will be used) <br>
 * - cookieName: "L"  Name of cookie to read/store user's language or null to disable cookie reading/storing
 *                    (if not defined 'DEFAULT_COOKIE_NAME' will be used) <br>
 * - cookieExpire: 5184000  Expire seconds for cookie that gets set (if not defined 'DEFAULT_COOKIE_EXPIRE' will be used) <br>
 * - cookiePath: "/"  Path for which cookie will be set (can be null to not set property, if not defined 'DEFAULT_COOKIE_PATH' will be used) <br>
 * - cookieDomain: null  Domain the cookie will be set for (can be null to not set property, if not defined 'DEFAULT_COOKIE_DOMAIN' will be used) <br>
 * - cookieUpdate: true  Cookie setting if cookie should be set containing detected language
 *                       (otherwise cookie just get read if 'DEFAULT_COOKIE_NAME' is valid, if not defined 'DEFAULT_COOKIE_UPDATE' will be used) <br>
 * - loadTranslations: true Allows to disable translations loading (if not defined 'DEFAULT_LOAD_TRANSLATIONS' will be used)
 * - translationsDir: "./translations/"  Relative path from project root or absolute path to a directory containing translation files. Translation files
 *                                       are json files with the name of a language code e.g. 'en.json'
 *                                       (if not defined 'DEFAULT_TRANSLATIONS_DIR' will be used, if null option is disabled) <br>
 * - languagesFromTranslations: true    Supported languages get extended by the found language codes in the translations directory
 *                                      (loadTranslations must be true, if not defined 'DEFAULT_LANGUAGES_FROM_DIR' will be used) <br>
 * - useNextConfigLanguages: false  Path to next.config.js file from which languages will be loaded from path i18n.locales
 * - langAttr: "lang"  Name of the attribute added to the request object that tells which language is requested
 *                     (if not defined 'DEFAULT_REQUEST_LANGUAGE_ATTR' will be used) <br>
 * - translationsAttr: "TEXT"  Name of the attribute added to the request object that points to a key/value array containing the translations in the requested language
 *                     (if not defined 'DEFAULT_REQUEST_TRANSLATIONS_ATTR' will be used) <br>
 * - updateUrlParam: true   If the req.url attribute should be updated (language prefix will be removed if present)
 *                          (if not defined 'DEFAULT_UPDATE_URL_PARAM' will be used) <br>
 * - processedPathAttr: "PATH"  Name of the attributed added to the request object containing the path of the url without the language prefix
 *                              (if not defined 'DEFAULT_REQUEST_PROCESSED_PATH_ATTR' will be used) <br>
 * @returns function(req, res, next) that is designed for being set as middleware to pre-handle incoming requests
 */
function LanguageRouter(options) {
    if (options === void 0) { options = {
        default: DEFAULT_LANGUAGE,
        languages: DEFAULT_LANGUAGES,
        loadTranslations: DEFAULT_LOAD_TRANSLATIONS,
        languagesFromTranslations: DEFAULT_LANGUAGES_FROM_DIR,
        useNextConfigLanguages: false,
        translationsDir: DEFAULT_TRANSLATIONS_DIR,
        useUri: DEFAULT_USE_URI,
        useHttp: DEFAULT_USE_HTTP,
        cookieName: DEFAULT_COOKIE_NAME,
        cookieExpire: DEFAULT_COOKIE_EXPIRE,
        cookiePath: DEFAULT_COOKIE_PATH,
        cookieDomain: DEFAULT_COOKIE_DOMAIN,
        cookieUpdate: DEFAULT_COOKIE_UPDATE,
        langAttr: DEFAULT_REQUEST_LANGUAGE_ATTR,
        translationsAttr: DEFAULT_REQUEST_TRANSLATIONS_ATTR,
        updateUrlParam: DEFAULT_UPDATE_URL_PARAM,
        processedPathAttr: DEFAULT_REQUEST_PROCESSED_PATH_ATTR
    }; }
    var defaultLang = options.default || DEFAULT_LANGUAGE;
    var langs = []; // later converted to Set 'languages'
    if (options.useNextConfigLanguages)
        langs = langs.concat(require(options.useNextConfigLanguages != true ? options.useNextConfigLanguages : ROOT + "/next.config.js").i18n.locales);
    if (options.languages)
        langs = langs.concat(options.languages);
    else if (!options.useNextConfigLanguages)
        langs = langs.concat(DEFAULT_LANGUAGES);
    var useUri = (options.useUri != undefined ? options.useUri : DEFAULT_USE_URI);
    var useHttp = (options.useHttp != undefined ? options.useHttp : DEFAULT_USE_HTTP);
    var cookieName = (options.cookieName != undefined ? options.cookieName : DEFAULT_COOKIE_NAME);
    var cookieExpire = options.cookieExpire || DEFAULT_COOKIE_EXPIRE;
    var cookiePath = (options.cookiePath != undefined ? options.cookiePath : DEFAULT_COOKIE_PATH);
    var cookieDomain = (options.cookieDomain != undefined ? options.cookieDomain : DEFAULT_COOKIE_DOMAIN);
    var cookieUpdate = (options.cookieUpdate != undefined ? options.cookieUpdate : DEFAULT_COOKIE_UPDATE);
    var langAttr = options.langAttr || DEFAULT_REQUEST_LANGUAGE_ATTR;
    var translationsDir = (options.translationsDir != undefined ? options.translationsDir : DEFAULT_TRANSLATIONS_DIR);
    var translationsAttr = (options.translationsAttr != undefined ? options.translationsAttr : DEFAULT_REQUEST_TRANSLATIONS_ATTR);
    var loadTranslations = (options.loadTranslations != undefined ? options.loadTranslations : DEFAULT_LOAD_TRANSLATIONS);
    var languagesFromTranslations = (options.languagesFromTranslations != undefined ? options.languagesFromTranslations : DEFAULT_LANGUAGES_FROM_DIR);
    var updateUrlParam = (options.updateUrlParam != undefined ? options.updateUrlParam : DEFAULT_UPDATE_URL_PARAM);
    var processedPathAttr = (options.processedPathAttr != undefined ? options.processedPathAttr : DEFAULT_REQUEST_PROCESSED_PATH_ATTR);
    var languages = new Set(langs);
    if (loadTranslations) {
        reloadTranslations(translationsDir).then(function (langs) {
            if (!languagesFromTranslations)
                return;
            for (var _i = 0, langs_1 = langs; _i < langs_1.length; _i++) {
                var l = langs_1[_i];
                languages.add(l);
            }
        });
    }
    return function (req, res, next) {
        // Parse URI
        var lang = (useUri ? req.url : false);
        if (lang) {
            var hasSlash = lang.startsWith("/");
            lang = hasSlash ? lang.substring(1) : lang;
            var idx = lang.indexOf("/");
            lang = idx >= 0 ? lang.substring(0, idx) : lang;
            if (languages.has(lang)) {
                // updating request's url and path
                var urlPath = ((hasSlash && idx < 0) ? "/" : "") + req.url.substring((hasSlash ? 1 : 0) + lang.length);
                if (updateUrlParam)
                    req.url = urlPath;
                if (req.path) {
                    hasSlash = req.path.startsWith("/");
                    idx = req.path.indexOf("/", hasSlash ? 1 : 0);
                    req[processedPathAttr] = req.path.substring(hasSlash ? 1 : 0, idx < 0 ? req.path.length : idx) == lang ?
                        ((hasSlash && idx < 0) ? "/" : "") + req.path.substring((hasSlash ? 1 : 0) + lang.length) :
                        req.path;
                }
                else {
                    idx = urlPath.indexOf("?");
                    req[processedPathAttr] = urlPath.substring(0, idx < 0 ? urlPath.length : idx);
                }
            }
            else {
                lang = false;
                req[processedPathAttr] = req.path;
            }
        }
        // Parse cookie
        if (!lang && cookieName && req.headers && req.headers.cookie) {
            var langs_2 = req.headers.cookie.split(";");
            for (var i = 0; i < langs_2.length; i++) {
                var entry = langs_2[i];
                var idx = entry.indexOf("=");
                if (idx <= 0)
                    continue;
                if ((idx > 0 ? entry.substring(0, idx) : entry).trim() == cookieName) {
                    lang = (idx > 0 ? entry.substring(idx + 1).trim() : "");
                    if (languages.has(lang))
                        break;
                    else
                        lang = false;
                }
            }
        }
        // Parse HTTP accept language
        if (!lang && useHttp && req.headers) {
            var langs_3 = req.headers['accept-language'];
            if (langs_3) {
                langs_3 = langs_3.split(/,|;/g).map(function (v) { return v.trim(); }).filter(function (v) { return v.length > 0 && !v.startsWith("q="); });
                for (var i = 0; i < langs_3.length; i++)
                    if (languages.has(langs_3[i])) {
                        lang = langs_3[i];
                        break;
                    }
            }
        }
        lang = lang || defaultLang;
        // Update cookie
        if (cookieName && cookieUpdate) {
            var cookies = res.get('set-cookie') || [];
            cookies = res instanceof Array ? cookies : (cookies.toString().length == 0 ? [] : [cookies]);
            var cook = cookieName + "=" + lang + (cookieExpire ? "; Max-Age=" + cookieExpire : "");
            cook += (cookiePath ? "; Path=" + cookiePath : "") + (cookieDomain ? "; Domain=" + cookieDomain : "");
            cookies.push(cook);
            res.set('set-cookie', cookies);
        }
        req[langAttr] = lang;
        if (loadTranslations)
            req[translationsAttr] = _getTranslations(lang, defaultLang, [], translationsDir);
        next();
    };
}
export default {
    DEFAULT_USE_URI: DEFAULT_USE_URI,
    DEFAULT_USE_HTTP: DEFAULT_USE_HTTP,
    DEFAULT_COOKIE_DOMAIN: DEFAULT_COOKIE_DOMAIN,
    DEFAULT_COOKIE_EXPIRE: DEFAULT_COOKIE_EXPIRE,
    DEFAULT_COOKIE_NAME: DEFAULT_COOKIE_NAME,
    DEFAULT_COOKIE_PATH: DEFAULT_COOKIE_PATH,
    DEFAULT_COOKIE_UPDATE: DEFAULT_COOKIE_UPDATE,
    DEFAULT_LANGUAGE: DEFAULT_LANGUAGE,
    DEFAULT_LANGUAGES: DEFAULT_LANGUAGES,
    DEFAULT_REQUEST_LANGUAGE_ATTR: DEFAULT_REQUEST_LANGUAGE_ATTR,
    DEFAULT_TRANSLATIONS_DIR: DEFAULT_TRANSLATIONS_DIR,
    DEFAULT_LOAD_TRANSLATIONS: DEFAULT_LOAD_TRANSLATIONS,
    DEFAULT_LANGUAGES_FROM_DIR: DEFAULT_LANGUAGES_FROM_DIR,
    DEFAULT_REQUEST_TRANSLATIONS_ATTR: DEFAULT_REQUEST_TRANSLATIONS_ATTR,
    DEFAULT_UPDATE_URL_PARAM: DEFAULT_UPDATE_URL_PARAM,
    DEFAULT_REQUEST_PROCESSED_PATH_ATTR: DEFAULT_REQUEST_PROCESSED_PATH_ATTR,
    reloadTranslations: reloadTranslations,
    getTranslations: getTranslations,
    getLanguageNames: getLanguageNames,
    getTranslationFileContent: getTranslationFileContent,
    getTranslationFileContentSync: getTranslationFileContentSync,
    LanguageRouter: LanguageRouter
};
