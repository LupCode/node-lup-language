# node-lup-language
Node express middleware for detecting requested language based on:
1. URI prefix e.g. /**en**/home/
2. Cookie value e.g. lang=en
3. HTTP header e.g. Accept-Language=en-US,en;q=0.5
4. Default language code

Request gets modified such that URI does not start with language code and new attribute `lang` gets added to the request object.
