# jQuery Footnote Links
This plugin builds a list with all the links of a page. The list is visible only in browser's print preview window. It's inspired from the [Footnote links script](http://v2.easy-designs.net/code/footnoteLinks).

## How To Use
In order to use this plugin you must insert into the page the followings:

- The jQuery script file;
- The plugin file;

You can initialize the plugin by calling footnoteLinks function on any jQuery collection.  

**Example:**  
``$('body').footnoteLinks();``.

**Demo:**  
You can see a demo [here](http://dompuiu.github.com/jquery-footnote-links/demo/index.html).

## Config Options
The following config options can be sent when calling the plugin:

- ignoreCls: a class name that will make the link on which is found to be skipped from the list (default: '');
- listCnt: the container where the footnote list will be appended (default: '');
- listCls: the CSS class that will be appended to the footnote list (default: 'footnote-links');
- noteCls: the CSS class that will be appened to the footnotes references (default: 'footnote');
- deploy: automaticall add styles tag that will make the list visible only in print preview (default: true);

## Supported Browsers
- Internet Explorer 7, 8 and 9
- Google Chrome
- Firefox
- Opera
- Safari

## License
Licensed under the [MIT license](http://www.opensource.org/licenses/mit-license.php).
