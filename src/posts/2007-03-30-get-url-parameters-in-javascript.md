---
title: Get URL Parameters in Javascript
date: 2007-03-30 12:00:00
redirects:
    - /blog/2007/03/30/get-url-parameters-in-javascript/
view: post.njk
comments:
    - name: John Hill
      link: http://www.theglasspeople.net/
      date: 2007-06-26 15:37
      text: |
        Great little script. I am using it and it works very very well!
        It would be uber cool if you could add a link to a plain text version of these functions so that users didn’t have to convert over illegal characters.

        Fantastic job! You saved me some time.
    - name: DataShaman
      link: https://datashaman.com
      date: 2006-06-26 21:07
      text: |
        Thanks! Glad you liked it. :)
        It’s not very obvious that it’s a link, but if you click on the PLAIN TEXT heading above each code block, it converts the block to text, for easy copy and pasting. 
---
I needed a _Javascript_ function which would give me access to the URL querystring, much like PHP's `$_GET` associative array. Unfortunately most of the solutions I found were either wrong, incomplete or badly written. IMHO. :)

So, being a programmer, I decided to knock up my own version of the script.<!--more-->

Many of the scripts I saw parsed through the querystring everytime a single query parameter was required, which is inefficient, especially if you're going to be using the same function repeatedly in the same context.

My script adds a property `parameters` to the `window.location` _DOM_ object which is where this information should be stored, in my opinion.

It should only be run once to setup the associative array of query parameters, preferably when the document is completely loaded, but I don't think that's necessary since the location object should be ready right from the start.

I'm surprised that the _DOM_ standard hasn't given us an easy way of accessing this information. Especially since the increasing use of _Ajax_ means that more and more decisions are made in the browser rather than in server code.

    /**
     * Copyright (c) 2007 Marlin Forbes (http://www.datashaman.com)
     * Dual licensed under the MIT
     * (http://www.opensource.org/licenses/mit-license.php)
     * and GPL
     * (http://www.opensource.org/licenses/gpl-license.php) licenses.
     */
     
    /**
     * Creates an object property window.location.parameters which
     * is an associative array of the URL querystring parameters used
     * when requesting the current document.
     * If the parameter is present but has no value, such as the parameter
     * flag in http://example.com/index.php?flag&id=blah, null is stored.
     */
    function setupParameters() {
        var parameters = new Object();
     
        if(window.location.search) {
            var paramArray = window.location.search.substr(1).split(‘&’);
            var length = paramArray.length;
     
            for (var index = 0;index <length; index++ ) {
                var param = paramArray[index].split(‘=’);
                var name = param[0];
                var value =
                    typeof param[1] == “string”
                    ? decodeURIComponent(param[1].replace(/+/g, ‘ ‘))
                    : null;
                parameters[name] = value;
            }
        }
        window.location.parameters = parameters;
    }

For a lazy loading getParameter function, you could do this:

    function getParameter(name) {
        if(typeof window.location.parameters == “undefined”)
            setupParameters();
        return window.location.parameters[name];
    }

The way it works is as follows:

* All query parameters are decoded, so any entity references, `%20` and `+` symbols are converted to their human versions
* If a query parameter does not have a value such as the parameter flag in:

      http://example.com/page.php?flag

  then the `window.location.parameter['flag']` will return `null`

*  If a query parameter is not defined, then it will follow the usual _JavaScript_ convention and return `undefined`

I think this covers most situations. I'm not 100% certain that the regular expression replacement of all + signs with spaces is correct, there seems to be some ambiguity about what to do with + signs. None of the supplied native decode functions decode them to spaces. Let me know if you have any answers on that one.
