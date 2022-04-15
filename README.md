# lup-language
Node express middleware for detecting requested language based on:
1. URI prefix e.g. /**en**/home/
2. Cookie value e.g. lang=en
3. HTTP header e.g. Accept-Language=en-US,en;q=0.5
4. Default language code
Request will be modified such that URI does not start with language code and new attribute `lang` gets added to the request object.

## Express Example

```javascript
const express = require('express');
const {LanguageRouter} = require('lup-language');

const app = express();

// Add LanguageRouter as middleware that modifies request object 
// based on given options (see documentation).
// Here parameter 'languages' is a list of language codes that 
// your app will accept.
app.use(LanguageRouter({
    languages: ['en', 'de']
}));

// Create your custom routes and retriev request language code 
// by reading it from req.lang
app.get('/', function(req, res){
    res.send("Your requested language is: "+req.lang.toUpperCase()+"<br>"+
             "You can access translations from the translations dir using: "+req.TEXT['TranslationKey']);
});

app.listen(80, function(){
    console.log("Server running");
});
```


## Next.js Example

```javascript
// Next.js page
export default function Home({LANGUAGE_NAMES, TEXT}){

    let components = [];
    for(let lang in LANGUAGE_NAMES){
        let name = LANGUAGE_NAMES[lang];
        components.push(<a href="/{lang}">{name}</a>);
    }

    return (
        <>
            <h1>{TEXT['TranslationKey']}</h1>
            <h2>{TEXT['HelloWorld']}</h2>
            {components}
        </>
    );
}

export async function getStaticProps(context){
    const TEXT = await getTranslations(context.locale, context.defaultLocale, [
        'TranslationKey', 'HelloWorld' 
    ]);

    return {
        props: {
            LANGUAGE_NAMES: await getLanguageNames(),
            TEXT: TEXT
        }
    };
}
```