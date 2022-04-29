const {ROOT} = require('lup-root');
const fs = require('fs');
const path = require('path');

/** Default language code that will be used if no other method can detect the language */
let DEFAULT_LANGUAGE = "en";

/** Default list of language codes that will be accepted */
let DEFAULT_LANGUAGES = ["en"];

/** Default if translations from directory should be loaded */
let DEFAULT_LOAD_TRANSLATIONS = true;

/** Default relative path from project root to a directory containing translation files. 
 * Translation files are json files with the name of a language code e.g. 'en.json'. 
 * Can also be an absolute path */
let DEFAULT_TRANSLATIONS_DIR = "./translations/";

/** Default if language codes should be loaded from files in translations directory */
let DEFAULT_LANGUAGES_FROM_DIR = true;

/** Default setting if URI should be used for language detection */
let DEFAULT_USE_URI = true;

/** Default setting if HTTP header (accept-language) should be used for language detection */
let DEFAULT_USE_HTTP = true;

/** Default name of cookie to read/store user's language or null to disable cookie reading/storing */
let DEFAULT_COOKIE_NAME = "L";

/** Default expire seconds for cookie that gets set */
let DEFAULT_COOKIE_EXPIRE = 5184000;

/** Default path for which cookie will be set (can be null to not set property) */
let DEFAULT_COOKIE_PATH = "/";

/** Default domain the cookie will be set for (can be null to not set property) */
let DEFAULT_COOKIE_DOMAIN = null;

/** Default cookie setting if cookie should be set containing detected language 
 * (otherwise cookie just get read if 'DEFAULT_COOKIE_NAME' is valid) */
let DEFAULT_COOKIE_UPDATE = true;

/** Name of the output attribute added to the request object that tells which language is requested */
let DEFAULT_REQUEST_LANGUAGE_ATTR = "lang";

/** Name of the output attribute added to the request object that points to a key/value array with the translations in the requested language */
let DEFAULT_REQUEST_TRANSLATIONS_ATTR = "TEXT";

/** Default behavior if the language prefix should be remove from the req.url attribute */
let DEFAULT_UPDATE_URL_PARAM = true;

/** Name of the attribute added to the request object containing the path of the URL without the language prefix */
let DEFAULT_REQUEST_PROCESSED_PATH_ATTR = "PATH";



let LANGUAGES = {}; // { translationsDir: [] }
let DICTONARY = {}; // { translationsDir: {lang: {key: translation} } }


/**
 * Reloads translations from files inside given directory
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns Promise that resolves with a list of language codes that where found after translations have been reloaded from files
 */
const reloadTranslations = async function(translationsDir=DEFAULT_TRANSLATIONS_DIR){
    if(!translationsDir) translationsDir=DEFAULT_TRANSLATIONS_DIR;
    LANGUAGES[translationsDir] = [];
    DICTONARY[translationsDir] = [];
    return new Promise(function(resolve, reject){
        const TRANSLATIONS_DIR = path.resolve(ROOT, translationsDir).toString();

        function scanFiles(){
            fs.readdir(TRANSLATIONS_DIR, {}, function(err, files){
                if(err) console.error(err);
                if(files.length == 0){
                    reject("No files found in '"+translationsDir+"' ("+TRANSLATIONS_DIR+")");
                }
                let dict = {};
                let langs = new Set();
                let globals = null;
                let remaining = files.length;
                for(let i=0; i < files.length; i++){
                    let file = files[i];
                    if(!file.endsWith(".json")){
                        if(--remaining == 0){
                            LANGUAGES[translationsDir] = Array.from(langs);
                            DICTONARY[translationsDir] = dict;
                            resolve(LANGUAGES[translationsDir]);
                        }
                        continue;
                    }
                    let filePath = path.resolve(TRANSLATIONS_DIR, file).toString();
                    fs.readFile(filePath, {}, function(err, data){
                        if(err) console.error(err);
                        try {
                            let json = JSON.parse(data);
                            let lang = file.substring(0, file.length-".json".length);
                            if(lang.startsWith("global")){
                                globals = json;
                                for(let l in dict)
                                    for(let k in json)
                                        dict[l][k] = dict[l][k] || json[k];
                            } else {
                                langs.add(lang);
                                if(!dict[lang]) dict[lang] = {};
                                if(globals) for(let k in globals) dict[lang][k] = globals[k];
                                for(let k in json) dict[lang][k] = json[k];
                            }
                        } catch (ex){ if(!err) console.error(ex); }
                        if(--remaining == 0){
                            LANGUAGES[translationsDir] = Array.from(langs);
                            DICTONARY[translationsDir] = dict;
                            resolve(LANGUAGES[translationsDir]);
                        }
                    });
                }
            });
        }

        fs.access(TRANSLATIONS_DIR, function(err){
            if(!err) scanFiles();
            else fs.mkdir(TRANSLATIONS_DIR, {recursive: true}, function(err){
                if(err) console.error(err); else scanFiles();
            });
        });

    });
}


const _getTranslations = function(lang, defaultLang, translationKeys, translationsDir=DEFAULT_TRANSLATIONS_DIR){
    translationKeys = (!translationKeys || translationKeys.length == 0) ? false : translationKeys;
    const dictornary = DICTONARY[translationsDir] ? (DICTONARY[translationsDir][lang] || DICTONARY[translationsDir][defaultLang] || {}) : {};
    const dict = translationKeys ? {} : dictornary;
    if(translationKeys) for(let k of translationKeys) dict[k] = dictornary[k] || k;
    return dict;
}


/**
 * Returns a key/value array containing the translations in the given language
 * @param {String} lang Language code for which translations should be loaded
 * @param {String} defaultLang Default language code if given 'lang' is not supported
 * @param {Array} translationKeys If not empty only translations with given keys will be included in output (if empty all translations will be included)
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns {<key>: "<translation>"}
 */
const getTranslations = async function(lang, defaultLang, translationKeys=[], translationsDir=DEFAULT_TRANSLATIONS_DIR){
    if(!translationsDir) translationsDir=DEFAULT_TRANSLATIONS_DIR;
    if(!DICTONARY[translationsDir]) await reloadTranslations(translationsDir);
    return _getTranslations(lang, defaultLang, translationKeys, translationsDir);
}


/**
 * Returns a map of all found languages and their native name.
 * Looksup following keys in the translations 'LANGUAGE_NAME_<lang>'
 * @returns {<lang>: "<native name>"}
 */
const getLanguageNames = async function(translationsDir=DEFAULT_TRANSLATIONS_DIR){
    if(!translationsDir) translationsDir=DEFAULT_TRANSLATIONS_DIR;
    if(!DICTONARY[translationsDir]) await reloadTranslations(translationsDir);

    let names = {}
    for(let lang of LANGUAGES[translationsDir]){
        const key = "LANGUAGE_NAME_"+lang.toUpperCase();
        if(DICTONARY[translationsDir][lang]) names[lang] = DICTONARY[translationsDir][lang][key] || key;
    }
    return names;
}


/**
 * Loads the contents of a file loaded inside the translations directory
 * @param {String} fileName Name of the file the contents should be loaded (relative path inside the translations directory)
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns {String} Contents of the file
 */
const getTranslationFileContent = async function(fileName, translationsDir=DEFAULT_TRANSLATIONS_DIR){
    if(!translationsDir) translationsDir=DEFAULT_TRANSLATIONS_DIR;
    return new Promise(function(resolve, reject){
        const filePath = path.resolve(ROOT, translationsDir, fileName).toString();
        fs.readFile(filePath, {}, function(err, data){
            if(data) resolve(data); else reject(err);
        });
    });
}


/**
 * Loads the contents of a file loaded inside the translations directory
 * @param {String} fileName Name of the file the contents should be loaded (relative path inside the translations directory)
 * @param {String} translationsDir Relative path to directory containing JSON files with translations
 * @returns {String} Contents of the file
 */
const getTranslationFileContentSync = function(fileName, translationsDir=DEFAULT_TRANSLATIONS_DIR){
    if(!translationsDir) translationsDir=DEFAULT_TRANSLATIONS_DIR;
    const filePath = path.resolve(ROOT, translationsDir, fileName).toString();
    return fs.readFileSync(filePath);
}


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
 function LanguageRouter(options={
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
    updatePathParam: DEFAULT_UPDATE_PATH_PARAM,
}){
    const defaultLang = options.default || DEFAULT_LANGUAGE;

    let langs = []; // later converted to Set 'languages'
    if(options.useNextConfigLanguages) 
        langs = langs.concat(require(options.useNextConfigLanguages != true ? options.useNextConfigLanguages : ROOT+"/next.config.js").i18n.locales);
    if(options.languages) langs = langs.concat(options.languages);
    else if(!options.useNextConfigLanguages) langs = langs.concat(DEFAULT_LANGUAGES);

    const useUri = (options.useUri != undefined ? options.useUri : DEFAULT_USE_URI);
    const useHttp = (options.useHttp != undefined ? options.useHttp : DEFAULT_USE_HTTP);
    const cookieName = (options.cookieName != undefined ? options.cookieName : DEFAULT_COOKIE_NAME);
    const cookieExpire = options.cookieExpire || DEFAULT_COOKIE_EXPIRE;
    const cookiePath = (options.cookiePath != undefined ? options.cookiePath : DEFAULT_COOKIE_PATH);
    const cookieDomain = (options.cookieDomain != undefined ? options.cookieDomain : DEFAULT_COOKIE_DOMAIN);
    const cookieUpdate = (options.cookieUpdate != undefined ? options.cookieUpdate : DEFAULT_COOKIE_UPDATE);
    const langAttr = options.langAttr || DEFAULT_REQUEST_LANGUAGE_ATTR;
    const translationsDir = (options.translationsDir != undefined ? options.translationsDir : DEFAULT_TRANSLATIONS_DIR);
    const translationsAttr = (options.translationsAttr != undefined ? options.translationsAttr : DEFAULT_REQUEST_TRANSLATIONS_ATTR);
    const loadTranslations = (options.loadTranslations != undefined ? options.loadTranslations : DEFAULT_LOAD_TRANSLATIONS);
    const languagesFromTranslations = (options.languagesFromTranslations != undefined ? options.languagesFromTranslations : DEFAULT_LANGUAGES_FROM_DIR);
    const updateUrlParam = (options.updateUrlParam != undefined ? options.updateUrlParam : DEFAULT_UPDATE_URL_PARAM);
    const processedPathAttr = (options.processedPathAttr != undefined ? options.processedPathAttr : DEFAULT_REQUEST_PROCESSED_PATH_ATTR);

    const languages = new Set(langs);

    if(loadTranslations){
        reloadTranslations(translationsDir).then(function(langs){
            if(!languagesFromTranslations) return;
            for(let l of langs) languages.add(l);
        });
    }

    return function(req, res, next){

        // Parse URI
        let lang = (useUri ? req.url : false);
        if(lang){
            let hasSlash = lang.startsWith("/")
            lang = hasSlash ? lang.substring(1) : lang;
            let idx = lang.indexOf("/");
            lang = idx >= 0 ? lang.substring(0, idx) : lang;
            if(languages.has(lang)){

                // updating request's url and path
                let urlPath = ((hasSlash && idx < 0) ? "/" : "") + req.url.substring((hasSlash ? 1 : 0) + lang.length);

                if(updateUrlParam)
                    req.url = urlPath;

                if(req.path){
                    hasSlash = req.path.startsWith("/");
                    idx = req.path.indexOf("/", hasSlash ? 1 : 0);

                    req[processedPathAttr] = req.path.substring(hasSlash?1:0, idx<0?req.path.length:idx) == lang ? 
                                                ((hasSlash && idx < 0) ? "/" : "") + req.path.substring((hasSlash ? 1 : 0) + lang.length) : 
                                                req.path;
                } else {
                    idx = urlPath.indexOf("?");
                    req[processedPathAttr] = urlPath.substring(0, idx<0 ? urlPath.length : idx);
                }

            } else {
                lang = false;
                req[processedPathAttr] = req.path;
            }
        }

        // Parse cookie
        if(!lang && cookieName && req.headers && req.headers.cookie){
            let langs = req.headers.cookie.split(";");
            for(let i=0; i < langs.length; i++){
                let entry = langs[i];
                let idx = entry.indexOf("=");
                if(idx <= 0) continue;
                if((idx > 0 ? entry.substring(0, idx) : entry).trim() == cookieName){
                    lang = (idx > 0 ? entry.substring(idx+1).trim() : "");
                    if(languages.has(lang)) break; else lang = false;
                }
            }
        }
        
        // Parse HTTP accept language
        if(!lang && useHttp && req.headers){
            let langs = req.headers['accept-language'];
            if(langs){
                langs = langs.split(/,|;/g).map(function(v){ return v.trim(); }).filter(function(v){ return v.length > 0 && !v.startsWith("q="); });
                for(let i=0; i < langs.length; i++)
                    if(languages.has(langs[i])){
                        lang = langs[i];
                        break;
                    }
            }
        }

        lang = lang || defaultLang;

        // Update cookie
        if(cookieName && cookieUpdate){
            let cookies = res.get('set-cookie') || [];
            cookies = res instanceof Array ? cookies : (cookies.toString().length == 0 ? [] : [cookies]);

            let cook = cookieName+"="+lang + (cookieExpire ? "; Max-Age="+cookieExpire : "");
            cook += (cookiePath ? "; Path="+cookiePath : "") + (cookieDomain ? "; Domain="+cookieDomain : "");
            cookies.push(cook);

            res.set('set-cookie', cookies);
        }

        req[langAttr] = lang;

        if(loadTranslations) req[translationsAttr] = _getTranslations(lang, defaultLang, [], translationsDir);

        next();
    }
}


module.exports = {
    DEFAULT_USE_URI,
    DEFAULT_USE_HTTP,
    DEFAULT_COOKIE_DOMAIN,
    DEFAULT_COOKIE_EXPIRE,
    DEFAULT_COOKIE_NAME,
    DEFAULT_COOKIE_PATH,
    DEFAULT_COOKIE_UPDATE,
    DEFAULT_LANGUAGE,
    DEFAULT_LANGUAGES,
    DEFAULT_REQUEST_LANGUAGE_ATTR,
    DEFAULT_TRANSLATIONS_DIR,
    DEFAULT_LOAD_TRANSLATIONS,
    DEFAULT_LANGUAGES_FROM_DIR,
    DEFAULT_REQUEST_TRANSLATIONS_ATTR,
    DEFAULT_UPDATE_URL_PARAM,
    DEFAULT_REQUEST_PROCESSED_PATH_ATTR,
    reloadTranslations,
    getTranslations,
    getLanguageNames,
    getTranslationFileContent,
    getTranslationFileContentSync,
    LanguageRouter
};
