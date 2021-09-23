# node-lup-language
Node express middleware for detecting requested language based on:
* URI prefix e.g. /**en**/home/
* Cookie value e.g. lang=en
* HTTP header e.g. Accept-Language=en-US,en;q=0.5

Request gets transformed such that URI does not start with language code and new attribute 'lang' gets added to the request object.
