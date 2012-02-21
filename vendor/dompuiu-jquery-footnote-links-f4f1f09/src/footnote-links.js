/**
 * Copyright (C) 2011 by Serban Stancu
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        'use strict';
        // optionally move this outside the declaration and
        // into a closure if you need more speed.
        function F() {}
        F.prototype = o;
        return new F();
    };
}

(function ($) {
    'use strict';

    /**
     * Main Class
     */
    var FootnoteLinks = {

        /**
         * The selector reference.
         * @var JQueryRef
         */
        $elem: null,

        /**
         * The option config object.
         * @var Object
         */
        options: {
            /**
             * Ignore the links that have this class.
             * @var string
             */
            ignoreCls: '',

            /**
             * The container where the footnote list will be appended.
             * If this property is left empty, the list will be appended at the end
             * of the plugin calling element.
             * Can be a string of the form '.classname' or a jQuery reference.
             * $var string / jQueryRef
             */
            listCnt: '',

            /**
             * The CSS class that will be appended to the footnote list.
             * @var string
             */
            listCls: 'footnote-links',

            /**
             * The CSS class that will be appened to the footnotes references.
             */
            noteCls: 'footnote',

            /**
             * Deploy styles tags that will make the element to appear only in
             * print preview window.
             * @var boolean
             */
            deploy: true
        },

        /**
         * The init function.
         * @return Object
         */
        init: function (options, elem) {
            var that = this, links;

            // Mix in the passed in options with the default options.
            this.options = $.extend({}, this.options, options);
            // Save the target element and the document body as jQuery references.
            this.$elem = $(elem);

            if (this.options.deploy === true) {
                this.appendStyles();
            }

            links = this.getLinks();
            links = this.processLinks(links);
            this.buildList(links);

            // Return this so we can chain/use the bridge with less code.
            return this;
        },

        /**
         * Find all the links from the element that called the plugin.
         * Ignore any of the found elements that contains the ignoreCls parameter
         * in the class attribute.
         * @return jQueryRef The links references.
         */
        getLinks: function () {
            var links = $('a[href]', this.$elem);
            if (this.options.ignoreCls) {
                if (this.options.ignoreCls[0] !== '.') {
                    this.options.ignoreCls = '.' + this.options.ignoreCls;
                }
                links = links.not(this.options.ignoreCls);
            }

            return links;
        },

        /**
         * Add the footnote references after every link found in the element.
         * Also make sure that the links are uniques.
         * @param jQueryRef The links reference.
         * @return Object The map that containg the links URLs.
         */
        processLinks: function (links) {
            var that = this, uniqueLinks = {}, i = 0;
            links.each(function (idx, elem) {
                var $elem = $(this),
                    href = $elem.attr('href'),
                    parts = document.location,
                    prefix = parts.protocol + '//' + parts.hostname;

                // If the protocol does not exits, add it.
                if (!href.match(/^[a-zA-Z]+:\/\//ig)) {
                    // Test for relative or absolute path.
                    if (href[0] !== '/') {
                        prefix += parts.pathname;
                    }
                    href = prefix + href;
                }

                if (!uniqueLinks[href]) {
                    i += 1;
                    uniqueLinks[href] = i;
                }
                $('<sup class="' + that.options.noteCls + '">' +
                        uniqueLinks[href] +
                        '</sup>')
                    .insertAfter(this);
            });

            return uniqueLinks;
        },

        /**
         * Building the footnotes list. Append it at the end of the calling element.
         * @param Object The links URLs.
         * @return void
         */
        buildList: function (links) {
            var listCnt = $('<div class="' + this.options.listCls + '">' +
                    '<h2>Links</h2>' +
                    '</div>'),
                list = $('<ol></ol>').appendTo(listCnt);

            $.each(links, function (key, value) {
                $('<li>' + key + '</li>').appendTo(list);
            });

            if (!this.options.listCnt) {
                this.options.listCnt = this.$elem.last();
            }

            listCnt.appendTo(this.options.listCnt);
        },

        /**
         * Append the styles that will make the elements visible only in the
         * print preview window.
         * @return void
         */
        appendStyles: function () {
            $('head').append(
                '<style type="text/css">' +
                    '@media all {' +
                        '.' + this.options.noteCls + ',' +
                        '.' + this.options.listCls + '{' +
                            'display: none;' +
                        '}' +
                    '}' +
                    '@media print {' +
                        '.' + this.options.noteCls + ',' +
                        '.' + this.options.listCls + '{' +
                            'display: inline;' +
                        '}' +
                    '}' +
                    '</style>'
            );
        }

    };

    // Start the plugin.
    $.fn.footnoteLinks = function (options) {
        // Don't act on absent elements -via Paul Irish's advice.
        if (this.length) {

            // Create a new object via the Prototypal Object.create.
            var obj = Object.create(FootnoteLinks);

            // Run the initialization function of the object.
            // `this` refers to the element.
            obj.init(options, this);

            // Save the instance of the object in the element's data store.
            $.data(this, 'footnote-links', obj);

        }
    };
}(jQuery));
