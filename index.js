
/** Default language code that will be used if no other method can detect the language */
let DEFAULT_LANGUAGE = "en";

/** Default list of language codes that will be accepted */
let DEFAULT_LANGUAGES = ["en"];

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

/**
 * 
 * @param {Object} options Object containing options for behavior {
 *  languages: [],          // List of language codes that will be accepted (if not defined 'DEFAULT_LANGUAGES' will be used)
 *  default: "en",          // Fallback language code that will be used if no other method can detect the language 
 *                          // (if not defined 'DEFAULT_LANGUAGE' will be used)
 *  cookieName: "L",        // Name of cookie to read/store user's language or null to disable cookie reading/storing 
 *                          // (if not defined 'DEFAULT_COOKIE_NAME' will be used)
 *  cookieExpire: 5184000,  // Expire seconds for cookie that gets set (if not defined 'DEFAULT_COOKIE_EXPIRE' will be used)
 *  cookiePath: "/",        // Path for which cookie will be set (can be null to not set property, if not defined 'DEFAULT_COOKIE_PATH' will be used)
 *  cookieDomain: null,     // Domain the cookie will be set for (can be null to not set property, if not defined 'DEFAULT_COOKIE_DOMAIN' will be used)
 *  cookieUpdate: true,     // Cookie setting if cookie should be set containing detected language 
 *                          // (otherwise cookie just get read if 'DEFAULT_COOKIE_NAME' is valid, if not defined 'DEFAULT_COOKIE_UPDATE' will be used)
 *  langAttr: "lang",       // Name of the output attribute added to the request object that tells which language is requested 
 *                          // (if not defined 'DEFAULT_REQUEST_LANGUAGE_ATTR' will be used)
 * }
 * @returns function(req, res, next) that is designed for being set as middleware to pre-handle incoming requests
 */
function LanguageRouter(options={
    /** List of language codes that will be accepted (if not defined 'DEFAULT_LANGUAGES' will be used) */
    languages: DEFAULT_LANGUAGES,

    /** Fallback language code that will be used if no other method can detect the language 
     * (if not defined 'DEFAULT_LANGUAGE' will be used) */
    default: DEFAULT_LANGUAGE,

    /** Name of cookie to read/store user's language or null to disable cookie reading/storing 
     * (if not defined 'DEFAULT_COOKIE_NAME' will be used) */
    cookieName: DEFAULT_COOKIE_NAME,

    /** Expire seconds for cookie that gets set (if not defined 'DEFAULT_COOKIE_EXPIRE' will be used) */
    cookieExpire: DEFAULT_COOKIE_EXPIRE,

    /** Path for which cookie will be set (can be null to not set property, if not defined 'DEFAULT_COOKIE_PATH' will be used) */
    cookiePath: DEFAULT_COOKIE_PATH,

    /** Domain the cookie will be set for (can be null to not set property, if not defined 'DEFAULT_COOKIE_DOMAIN' will be used) */
    cookieDomain: DEFAULT_COOKIE_DOMAIN,

    /** Cookie setting if cookie should be set containing detected language 
     * (otherwise cookie just get read if 'DEFAULT_COOKIE_NAME' is valid, if not defined 'DEFAULT_COOKIE_UPDATE' will be used) */
    cookieUpdate: DEFAULT_COOKIE_UPDATE, 

    /** Name of the output attribute added to the request object that tells which language is requested 
     * (if not defined 'DEFAULT_REQUEST_LANGUAGE_ATTR' will be used) */
    langAttr: DEFAULT_REQUEST_LANGUAGE_ATTR
}){
    const defaultLang = options.default || DEFAULT_LANGUAGE;
    let languages = options.languages || DEFAULT_LANGUAGES;
    if(!(languages instanceof Array)) languages = [languages];
    const cookieName = (options.cookieName != undefined ? options.cookieName : DEFAULT_COOKIE_NAME);
    const cookieExpire = options.cookieExpire || DEFAULT_COOKIE_EXPIRE;
    const cookiePath = (options.cookiePath != undefined ? options.cookiePath : DEFAULT_COOKIE_PATH);
    const cookieDomain = (options.cookieDomain != undefined ? options.cookieDomain : DEFAULT_COOKIE_DOMAIN);
    const cookieUpdate = (options.cookieUpdate != undefined ? options.cookieUpdate : DEFAULT_COOKIE_UPDATE);
    const langAttr = options.langAttr || DEFAULT_REQUEST_LANGUAGE_ATTR;

    return function(req, res, next){

        // Parse URI
        let lang = req.url;
        if(lang){
            let hasSlash = lang.startsWith("/")
            lang = hasSlash ? lang.substring(1) : lang;
            let idx = lang.indexOf("/");
            lang = idx >= 0 ? lang.substring(0, idx) : lang;
            if(languages.includes(lang)){

                // updating request's url and path
                req.url = ((hasSlash && idx < 0) ? "/" : "") + req.url.substring((hasSlash ? 1 : 0) + lang.length);
                if(req.path){
                    hasSlash = req.path.startsWith("/");
                    req.path = ((hasSlash && idx < 0) ? "/" : "") + req.path.substring((hasSlash ? 1 : 0) + lang.length);
                }

            } else lang = false;
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
                    if(languages.includes(lang)) break; else lang = false;
                }
            }
        }
        
        // Parse HTTP accept language
        if(!lang && req.headers){
            let langs = req.headers['accept-language'];
            if(langs){
                langs = langs.split(/,|;/g).map(function(v){ return v.trim(); }).filter(function(v){ return v.length > 0 && !v.startsWith("q="); });
                for(let i=0; i < langs.length; i++)
                    if(languages.includes(langs[i])){
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
        next();
    }
}

module.exports = {
    DEFAULT_COOKIE_DOMAIN,
    DEFAULT_COOKIE_EXPIRE,
    DEFAULT_COOKIE_NAME,
    DEFAULT_COOKIE_PATH,
    DEFAULT_COOKIE_UPDATE,
    DEFAULT_LANGUAGE,
    DEFAULT_LANGUAGES,
    DEFAULT_REQUEST_LANGUAGE_ATTR,
    LanguageRouter
};
