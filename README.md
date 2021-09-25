# lup-language
Node express middleware for detecting requested language based on:
1. URI prefix e.g. /**en**/home/
2. Cookie value e.g. lang=en
3. HTTP header e.g. Accept-Language=en-US,en;q=0.5
4. Default language code
Request will be modified such that URI does not start with language code and new attribute `lang` gets added to the request object.

## Example

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
    res.send("Your requested language is: "+req.lang.toUpperCase());
});

app.listen(80, function(){
    console.log("Server running");
});
```
