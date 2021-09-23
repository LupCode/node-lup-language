let DEFAULT_LANGUAGE = 'en';
let DEFAULT_LANGUAGES = ['en'];
let DEFAULT_COOKIE_NAME = 'L';
let DEFAULT_COOKIE_EXPIRE = 5184000;
let DEFAULT_COOKIE_PATH = "/";
let DEFAULT_COOKIE_DOMAIN = null;
let DEFAULT_COOKIE_UPDATE = true;

/** Name of the output attribute set for the request that tells which language is requested */
let DEFAULT_REQUEST_LANGUAGE_ATTR = 'lang';

function LanguageRouter(options={
    languages: DEFAULT_LANGUAGES,
    default: DEFAULT_LANGUAGE,
    cookieName: DEFAULT_COOKIE_NAME,
    cookieExpire: DEFAULT_COOKIE_EXPIRE,
    cookiePath: DEFAULT_COOKIE_PATH,
    cookieDomain: DEFAULT_COOKIE_DOMAIN,
    cookieUpdate: DEFAULT_COOKIE_UPDATE, 
    langAttr: DEFAULT_REQUEST_LANGUAGE_ATTR
}){
    const defaultLang = options.default || DEFAULT_LANGUAGE;
    let languages = options.languages || DEFAULT_LANGUAGES;
    if(!(languages instanceof Array)) languages = [languages];
    const cookieName = options.cookieName || DEFAULT_COOKIE_NAME;
    const cookieExpire = options.cookieExpire || DEFAULT_COOKIE_EXPIRE;
    const cookiePath = options.cookiePath || DEFAULT_COOKIE_PATH;
    const cookieDomain = options.cookieDomain || DEFAULT_COOKIE_DOMAIN;
    const cookieUpdate = options.cookieUpdate || DEFAULT_COOKIE_UPDATE;
    const langAttr = options.langAttr || DEFAULT_REQUEST_LANGUAGE_ATTR;

    return function(req, res, next){



        const url = req.url, baseUrl = req.baseUrl, path = req.path, originalUrl = req.originalUrl; // TODO REMOVE
        console.dir({ url, baseUrl, path, originalUrl }); // TODO REMOVE



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
                    break;
                }
            }
        }
        
        // Parse HTTP accept language
        if(!lang && req.headers){
            let langs = req.headers['accept-language'];
            if(langs){
                langs = langs.split(/,|;/g).map(function(v){ return v.trim(); }).filter(function(v){ return v.length > 0 && !v.startsWith("q="); });
                for(let i=0; i < langs.length; i++) if(languages.includes(langs[i])){ lang = langs[i]; break; }
            }
        }

        lang = lang || defaultLang;

        // Update cookie
        if(cookieName && cookieUpdate){
            let newCookie = (res.headers ? res.headers['set-cookie'] : "") || "";

            res.headers['set-cookie'] = newCookie;
        }

        req[langAttr] = lang;
        next();
    }
}

module.exports = {
    DEFAULT_LANGUAGE,
    DEFAULT_LANGUAGES,
    DEFAULT_COOKIE_NAME,
    LanguageRouter
};
