![GitHub package.json version](https://img.shields.io/github/package-json/v/LupCode/node-lup-language)
![npm bundle size](https://img.shields.io/bundlephobia/min/lup-language)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/LupCode/node-lup-language/On%20Push)
![NPM](https://img.shields.io/npm/l/lup-language)

# lup-language
Node express middleware for detecting requested language based on:
1. URI prefix e.g. /**en**/home/
2. Cookie value e.g. lang=en
3. HTTP header e.g. Accept-Language=en-US,en;q=0.5
4. Default language code
Request will be modified such that URI does not start with language code and new attribute `lang` gets added to the request object.

## Express Example
`server.js`
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


## Next.js with Express Example
`server.ts`
```typescript
import express from 'express';
import next from 'next';

const dev = Config.isDevMode();
const HTTP_BIND = process.env.HTTP_BIND || "0.0.0.0";
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "80") || 80;

const nextApp = next({dev: dev});
const nextHandler = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
    const app = express();

    // language middleware
    app.use(await LanguageRouter({
        useNextLanguages: false, /* true if Next ≤12 and i18n */
        languagesFromTranslations: true,
        redirectRoot: true, 
    }));

    // TODO add here your custom routes ...

    // all frontend routes
    app.all('*', (req: Request | any, res: Response) => {
        
        // add language prefix back to url (got removed by LanguageRouter)
        const idx1 = req.originalUrl.lastIndexOf("."), idx2 = req.originalUrl.lastIndexOf("/");
        req.url = (idx1 > idx2 || req.originalUrl.startsWith("/"+req.lang) || req.originalUrl.startsWith("/_next")) ? 
                    req.originalUrl : "/"+req.lang+req.originalUrl;

        return nextHandler(req, res);
    });

    // start server
    app.listen(HTTP_PORT, HTTP_BIND, function(){
        console.log("Server running at "+HTTP_BIND+":"+HTTP_PORT+" in "+(dev ? "development" : "production")+" mode");
    });
});
```

## Next.js ≤12 Page Example
`index.tsx`
```typescript
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

## Next.js ≥13 Page Example
`app/[locale]/translations.ts`
```typescript
'use server';
import "server-only";
import { getTranslations } from "lup-language";

export default async function loadTranslations(locale: string, translationKeys: string[]): Promise<{[key: string]: string}> {
    return await getTranslations(locale, 'en', translationKeys); // second argument is default locale
};
```

`app/[locale]/layout.tsx`
```typescript

```

`app/[locale]/page.tsx`
```typescript
import React from "react";
import styles from './page.module.css';
import loadTranslations from "../translations";
import { StaticParamsContext } from "../../../services/Types.service";

export default async function Home({ params }: StaticParamsContext) {
  const locale = params.locale;
  const TEXT = await loadTranslations(locale, ['HelloWorld']);

  return <>
    <b>Content</b>
  </>
}

export async function generateStaticParams(context: StaticParamsContext) {
  return [];
}
```