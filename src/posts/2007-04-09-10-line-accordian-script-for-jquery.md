---
id: 832a86d4-789b-4b4a-82d0-ff9cc649dd9a
view: post
title: 10 line accordian script for jQuery (or less)
redirects:
    - /blog/2007/04/09/10-line-accordian-script-for-jquery/
date: 2007-04-09 12:00:00
tags:
    - dev
    - javascript
    - jquery
---
Anyone who's used jQuery, knows that you can write less and do more with JavaScript.

Recently I wanted to use an accordian script to present a large amount of content on one page.

After looking at the options available, I decided that I could write something better. And smaller.<!--more-->

So here's my jQuery accordian script:

    $.accordian = function(container) {
        $(container).find('.title')
            .hover(function() { $(this).css('cursor', 'pointer'); },
                    function() { $(this).css('cursor', 'default') })
            .click(function() {
                $(container).find('.content:visible').slideUp('fast');
                $('.content:hidden', this.parentNode).slideDown('fast');
                return false;
            });
    };

Short, huh? ;) Now let's explain how it works. Because jQuery coding is so short, it pretty much reads like English.

When the mouse hovers a title, the cursor is changed to a pointer or hand, and when it moves away from the title, the cursor is changed back to the default shape.

When the title is clicked, any visible content in the whole accordian slides up fast, and any content which is hidden under the current block slides down fast.

    <html>
        <head>
            <script type="text/javascript" src="jquery.js"></script>
            <script type="text/javascript" src="accordian.js"></script>
            <script type="text/javascript">
                $(document).ready(function() {
                    // Initialize the accordian by telling it
                    // which blocks hold the content
                    $.accordian('#accordian > div');
                });
            </script>
            <style>
            .content {
                display: none;
            }
            </style>
        </head>
        <body>
            <div id="accordian">
                <div>
                    <div class="title">Section 1</div>
                    <div class="content">Content for section 1</div>
                </div>
                <div>
                    <div class="title">Section 2</div>
                    <div class="content">Content for section 2</div>
                </div>
                <div>
                    <div class="title">Section 3</div>
                    <div class="content">Content for section 3</div>
                </div>
            </div>
        </body>
    </html>

Let's explain this.

    <script type="text/javascript" src="jquery.js"></script>

This loads the jQuery library script which you should have already. If not, download it from the jQuery site.

    <script type="text/javascript" src="accordian.js"></script>

This pulls in the script above, which should be saved to accordian.js or whatever you prefer. Just remember to use the same filename on this line.

In the next script block, we're using jQuery's easy onLoad replacement, which guarantees that all elements in the document will be ready, when run. If you've used jQuery, you should be familiar with this construct. If not, then you should read the jQuery documentation.

    // Initialize the accordian by telling it
    // which blocks hold the content
    $.accordian('#accordian');

The jQuery library uses (amongst other methods) CSS selectors to target elements for manipulation. Line 9 sets up the accordian by telling it which block should be turned into an accordian.

As you can see from the source file above, the accordian block must be formatted according to the following structure for it to work correctly:

    <div id="someid">
        <div>
            <div class="title">Some Title</div>
            <div class="content">
                This is some content
            </div>
        </div>
        <div>
            <div class="title">Another title</div>
            <div class="content">
                This is further content
            </div>
        </div>
    </div>

Use can use any id for the accordian block, just ensure that you use the same id when initializing the accordian.

Without further ado, here's a demo of the accordian script in action.

<p class="codepen" data-height="265" data-theme-id="dark" data-default-tab="js,result" data-user="datashaman" data-slug-hash="bGNPPBM" style="height: 265px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;" data-pen-title="10 line accordian script for jQuery (or less)">
  <span>See the Pen <a href="https://codepen.io/datashaman/pen/bGNPPBM">
  10 line accordian script for jQuery (or less)</a> by Marlin Forbes (<a href="https://codepen.io/datashaman">@datashaman</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://static.codepen.io/assets/embed/ei.js"></script>
