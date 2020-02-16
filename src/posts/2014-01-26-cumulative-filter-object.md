---
id: c943f5d7-702f-4405-9c22-8ef12817f98b
title: Cumulative Filter Object
date: 2014-01-26 12:00:00
view: post
tags:
    - dev
    - coffeescript
    - javascript
---
I've created a cumulative object in coffeescript, useful for creating filters.

It's closest to a Reader / Environment monad.

Every time you call it with arguments, it merges them into a running context, which it uses to create the next filter which is returned. You can create graphs of filters, deriving from a common point.<!--more-->

If the argument is callable, call it to get the new properties to merge. This allows you to dynamically create the properties on the fly.

When you want to get the current context, call the filter without arguments, which is a signal for the filter to return the internal context object.

This means you can easily merge two filters together, since filters are callable and produce their context if called without arguments.

Here's the definition:

<script src="https://gist.github.com/8515466.js?file=definition.coffee"></script>

And here’s how to use it:

<script src="https://gist.github.com/8515466.js?file=usage.coffee"></script>

You can create objects in a remarkably literate style, using the function above.
