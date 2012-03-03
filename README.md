Introduction
============

*pres/v/g* is a tool for giving presentations and making them accessible on the
web, together with annotations.

Download [on GitHub][1]. For a demo, see below.


What's in it for you
--------------------

*   Create modern, engaging presentations with information laid out graphically
    on a virtual canvas.

*   Annotate presentations so that they can be viewed unattended. Or create 
    notes to assist you when giving a presentation.

*   Print presentations.

*   Host presentations anywhere you like. *Your data belongs to you!*

*   View presentations with any modern HTML5 web browser. No plugins such as
    Flash are required.

*   Author presentations with the tools of your choice. All graphics programs
    that export well-formatted SVG are supported.

*   Use the *pres/v/g* API to create your own user interface for presentations.

*   *Open Source*


Similar tools
-------------

*   [Prezi][2]: Popularized presentation using a virtual canvas. Proprietary
    cloud-based software with integrated editor. Strong vendor lock-in.
    Requires Flash to view presentations on the web.

*   [Sozi][3]: A plugin for [Inkscape][4] to create presentations in SVG. Open
    Source.


Demo
====

Try it [live on GitHub][5]. Details:

*   Start page: `demo.html`

*   The demo needs to be hosted on a web server.

    Suggestion for users of [Dropbox][6]: Just put the current directory into
    your `Public` folder, and then open the public URL of `demo.html` in a
    browser.

*   Keyboard navigation:

      - right arrow, page down: next frame

      - left arrow, page up: previous frame


Authoring presentations
=======================

Suggested steps
---------------

1.  Create SVG: `presentation.svg`

    See below for example steps on how to create the SVG.

2.  Create directory for texts: `presentation_texts`

3.  For each frame ID, create a text file:

    -   Name: frame ID + `.md`

    -   File format: [Markdown][7]

    -   Character encoding: UTF-8

4.  Copy `demo.html` to: `presentation.html`

5.  Edit settings at the top of: `presentation.html`


Suggested steps to create SVG in Inkscape 0.48
----------------------------------------------

1.  Create graphics.

2.  Convert text into outlines via menu: *Path / Object to Path*

3.  Create frames. For each frame:

    1.  From `demo.svg` copy a frame border, which is a rectangle with a hole.

    2.  Transform the frame border into place.

    3.  Set a frame ID via menu: *Object / Object Properties... / Id*

4.  Save as Plain SVG via menu: *File / Save a Copy...*


Suggested steps to create SVG in Illustrator CS5
------------------------------------------------

1.  Set in preferences:

    *Units / Identify Objects by: XML ID*

    Then XML IDs of frames are the same as the labels of the corresponding
    objects in Illustrator.

2.  Create graphics.

3.  Create frames. For each frame:

    1.  From `demo.svg` copy a frame border, which is a rectangle with a hole.

    2.  Transform the frame border into place.

    3.  In the layers panel, give the frame border a name. This name is the ID
        of the corresponding frame in the presentation. Note that spaces are 
        not allowed in the ID.

4.  Export as SVG via menu: *File / Save a Copy...*

    Suggested options:

    -   SVG Profiles: SVG 1.1

    -   Fonts / Type: Convert to outline

    -   Images / Location: Link

    -   CSS Properties: Presentation Attributes

    -   Decimal Places: 7 (for deep zooming with high precision)

    -   Encoding: Unicode (UTF-8)


FAQ – Frequently Asked Questions
================================

*   My SVG doesn't load into *pres/v/g* – what to do?

    Try loading the SVG directly into the browser, and look out for error
    messages. If there are none, then double check your *pres/v/g* settings.

*   Why not use a closed retangle as a frame border?

    The frame border needs to be assymetric in order to preserve rotation, at
    least in Illustrator CS5. Suppose you draw a 10×5 px rectangle and rotate
    it by 90°. Then Illustrator CS5 will create a 5×10 px rectangle, thereby
    removing information about the rotation.

*   What are the requirements when draing a frame border?

    Use a poly line with at least two segments, joined in a right angle. The
    minimum frame border looks as follows, with the first point in the upper
    left corner:

        1-----2
              |
              3

    All other line segments are ignored, meaning that you can as well draw the
    frame border as follows:

        1-----2
        5     |
        |     |
        4-----3

*   What can I do if images that I linked from my SVG are not loaded?

    Make sure that the SVG is in the same directory as the HTML file of the
    presentation. The reason is that image paths are interpreted as relative to
    the HTML file, not as relative to the SVG.

    If that does not solve the problem, then load the SVG directly into the
    browser and check for error messages.

*   Why doesn't my SVG render or print correctly?

    As of February 2012, browser support for SVG is still not perfect. Make
    sure that your browser is at the latest version. Also try with another
    browser.

    Comparing Chrome 17.0, Opera 11.61, and Firefox 10.0: Firefox produces the
    best printout of the demo.


The *pres/v/g* API
==================

With the *pres/v/g* API you can embed presentations into your web-site. The
user interface can be freely designed. Usage:

*   Include:

    -   `js/presvg.js`

    -   [jQuery][8] 1.7 or compatible

    -   [jQuery SVG][9] 1.4.4 or compatible: `jquery.svg.css`, `jquery.svg.js`,
        `jquery.svgdom.js`

    -   [jQuery Footnote Links][10]: `footnote-links.js`

    -   [Pagedown][11]: `Markdown.Converter.js`, `Markdown.Sanitizer.js`

*   Use the functions `presvg.interactive()` and `presvg.print()`.

*   For an example on using the API, see: `js/page.js`


Development
===========

Tests
-----

Regularly check:

*   Demo: Do rotations work? Are scroll bars in long text OK? Does video 
    playback work? Are bitmap graphics displayed? etc.

*   If a text file is missing, a corresponding message should be displayed *in
    the text box*. There should be no fatal error.

*   Error messages should appear when:

    -   SVG cannot be loaded,

    -   settings contain a frame that doesn't exists in SVG,

    -   required settings are missing.


Versioning
----------

The version of releases is structured as:

*major.minor.bugfix*


Coding conventions
------------------

Maximum line length: 79 characters

JavaScript:

*   Files need to validate with [JSLint][12].

*   Identifiers are written in camel case. The first character is in lower
    case, except for constructors where it is in upper case.

Git:

*   Tag every release with the version prefixed by a *v*. Example:

    *v1.2.3*

*   Adhere to the model commit message from the article [A Note About Git
    Commit Messages][13]. That message contains a summary on the first line, 
    with maximally 50 characters. It is followed by an optional empty line plus
    body, with a maximum line length of 72 characters.

*   For branches related to versions, prefix version numbers with a *b*. This
    is to avoid ambiguity with GIT commands such as "checkout" that accept tags
    and branches in the same parameter position. Example:
    
    *b1.2.3*


Legal
=====

Copyright 2012 [Felix E. Klee][14]

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.


[1]: http://github.com/feklee/presvg
[2]: http://prezi.com/
[3]: http://sozi.baierouge.fr/
[4]: http://inkscape.org/
[5]: http://feklee.github.com/presvg/demo.html
[6]: http://www.dropbox.com
[7]: http://daringfireball.net/projects/markdown/syntax
[8]: http://jquery.com/
[9]: http://keith-wood.name/svg.html
[10]: https://github.com/dompuiu/jquery-footnote-links
[11]: http://code.google.com/p/pagedown/
[12]: http://www.jslint.com/
[13]: http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
[14]: mailto:felix.klee@inka.de
