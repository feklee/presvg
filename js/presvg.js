// The pres/v/g presentation tool.
//
// Notes:
//
// * Unless noted otherwise angles are measured in degrees and counter
//   clockwise (ccw) as seen when viewing the SVG.
//
// Copyright 2012 Felix E. Klee <felix.klee@inka.de>
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

/*jslint browser: true, maxerr: 50, indent: 4, maxlen: 79 */

/*global $, requestAnimationFrame, Markdown, alert */

var presvg = {};

// Called when an error message is produced. Override this function if you want
// to visualize error messages.
presvg.onError = function () { 'use strict'; };

// Returns an object that provides pres/v/g specific functionality for
// interacting with YouTube.
presvg.youTube = function (settings) {
    'use strict';

    var node, // YouTube video player or text description of video (instead of
              // video player, e.g. for print view)
        urlNode,
        titleNode; // for description

    function resize(frameGeometryOnScreen) {
        var width = Math.round(frameGeometryOnScreen.width),
            height = Math.round(frameGeometryOnScreen.height);

        node.css({
            'margin-top': '-' + Math.round(height / 2) + 'px',
            'margin-left': '-' + Math.round(width / 2) + 'px',
            width: width,
            height: height
        });
    }

    function hideNode() {
        node.remove(); // also stops playback for player
    }

    function showNode() {
        if (settings.containerNode.children(node).length === 0) {
            settings.containerNode.append(node);
        } // else: node already contained => don't reinsert to not stop video
          // playback
    }

    function createPlayer(videoId) {
        node = $('<iframe></iframe>').attr({
            width: 0,
            height: 0,
            src: ''
        }).css({
            position: 'absolute',
            top: '50%',
            left: '50%',
            border: 0
        });
    }

    function playerOptions() {
        return ('?rel=0' + // no related videos at the end
                ((settings.hasOwnProperty('autoPlay') && settings.autoPlay) ?
                     '&autoplay=1' : ''));
    }

    function showPlayer(videoId) {
        var url = 'http://www.youtube.com/embed/' + videoId + playerOptions();

        if (node.attr('src') !== url) {
            node.attr('src', url);
        }
        showNode();
    }

    // Asynchronously loads data from the YouTube API for the specified video.
    function loadVideoData(videoId, onVideoDataLoaded) {
        $.getJSON('http://gdata.youtube.com/feeds/api/videos/' + videoId +
                  '?v=2&alt=jsonc&callback=?', onVideoDataLoaded);
    }

    function createParagraphNode(css) {
        return $('<p></p>').css($.extend({}, {
            margin: 0,
            padding: 0,
            'font-family': 'Helvetica, Arial, Verdana, sans-serif',
            'font-style': 'normal',
            'font-variant': 'normal',
            'font-size': '12px',
            'font-stretch': 'normal',
            'line-height': '1.2em',
            color: 'white'
        }, css));
    }

    // Creates node which wraps text of the description, vertically centered as
    // suggested by W3C: http://www.w3.org/Style/Examples/007/center.en.html
    function createTextWrapperNode() {
        var textWrapperNode, textNode;

        // wrapper necessary because parent element has position `absolute`,
        // and therefore cannot display as `table-cell`:
        // http://www.w3.org/TR/CSS2/visuren.html#dis-pos-flo
        textWrapperNode = $('<div></div>').css({
            display: 'table-cell',
            width: 'inherit',
            height: 'inherit',
            'vertical-align': 'middle'
        });

        textNode = $('<div></div>').css({
            'background-color': 'rgba(0, 0, 0, 0.5)',
            'border-radius': '5px',
            padding: '5px',
            width: '80%',
            'margin-left': 'auto',
            'margin-right': 'auto'
        });

        textNode.append(titleNode = createParagraphNode({
            'font-weight': 'bold',
            'margin-bottom': '5px'
        }));
        textNode.append(urlNode = createParagraphNode({
            'font-weight': 'normal'
        }));
        textWrapperNode.append(textNode);

        return textWrapperNode;
    }

    // Creates a node with a (text) description of the video.
    function createDescription(videoId) {
        node = $('<div></div>').css({
            position: 'absolute',
            top: '50%',
            left: '50%'
        });

        node.append(createTextWrapperNode());
    }

    function showDescription(videoId) {
        urlNode.text('http://youtu.be/' + videoId);
        loadVideoData(videoId, function (videoData) {
            titleNode.text(videoData.data.title);
        });
        showNode();
    }

    function noPlayer() {
        return typeof settings.noPlayer !== 'undefined' && settings.noPlayer;
    }

    function show(videoId) {
        if (noPlayer()) {
            showDescription(videoId);
        } else {
            showPlayer(videoId);
        }
    }

    function videoIdExists(frameId) {
        return (settings.hasOwnProperty('videoIds') &&
                settings.videoIds.hasOwnProperty(frameId));
    }

    if (noPlayer()) {
        createDescription();
    } else {
        createPlayer();
    }

    return {
        resize: resize,

        hide: hideNode,

        // Shows video player or description, if a video is associated with the
        // frame. Otherwise, hides the video player or description.
        update: function (frameId, frameGeometryOnScreen) {
            if (videoIdExists(frameId)) {
                show(settings.videoIds[frameId], frameGeometryOnScreen);
            } else {
                hideNode();
            }
        },

        // Does nothing if no video is available for the specified frame ID, or
        // if the loading fails.
        loadThumbnailUrl: function (frameId, onThumbnailUrlLoaded) {
            if (videoIdExists(frameId)) {
                loadVideoData(settings.videoIds[frameId], function (data) {
                    var url = (data.data.thumbnail.hqDefault ||
                               data.data.thumbnail.sqDefault ||
                               null);
                    if (url !== null) {
                        onThumbnailUrlLoaded(url);
                    }
                });
            }
        }
    };
};

// Returns an object that provides pres/v/g specific functionality for
// interacting with the SVG and any YouTube video associated with frames.
presvg.svg = function (settings) {
    'use strict';

    var wrapperGroup, // wrapper for transforming all graphics at once
        isReady = false, // true once initialized
        youTube, // for interfacing with YouTube videos associated with frames
        jQuerySvg, // for interfacing with the SVG via the jQuery SVG plugin
        subContainerNode; // container node directly below
                          // `settings.containerNode`

    function svgNode() {
        return $(jQuerySvg.root());
    }

    // Returns factor to scale frame to fit into window.
    function scaleFactor(frameId) {
        var presentationWidth, presentationHeight, scaleFactorX, scaleFactorY,
            frameGeometry;

        presentationWidth = subContainerNode.width();
        presentationHeight = subContainerNode.height();

        frameGeometry = settings.frameGeometries[frameId];

        scaleFactorX = presentationWidth / frameGeometry.width;
        scaleFactorY = presentationHeight / frameGeometry.height;
        return Math.min(scaleFactorX, scaleFactorY); // to avoid clipping
    }

    function alignAngle(frameId) {
        return -settings.frameGeometries[frameId].angle;
    }

    // returns false on error
    function frameNode(id) {
        var node = svgNode().find('#' + id);
        return (node.length === 1) ? node : false;
    }

    // Returns the normalized angle of `angle`, which is the equivalend angle
    // in the interval [0, 360).
    function normalizedAngle(angle) {
        return angle % 360 + (angle < 0 ? 360 : 0);
    }

    // Returns difference between the specified angles which has the smallest
    // absolut value. Examples:
    //
    // * 200, 180 -> 20
    //
    // * 180, 200 -> -20
    //
    // * 10, 350 -> 20
    function smallestAngleDiff(angle1, angle2) {
        var angleDiff = normalizedAngle(angle1 - angle2);

        return (angleDiff < 180) ? angleDiff : angleDiff - 360;
    }

    // Moves all SVG nodes into the wrapper group `wrapperGroup`, to easily
    // transform them all at once.
    function moveNodesIntoWrapperGroup() {
        var nodes;

        nodes = svgNode().children();

        wrapperGroup = jQuerySvg.group(jQuerySvg);

        nodes.each(function () {
            wrapperGroup.appendChild(this);
        });
    }

    function hideFrameBorders() {
        $.each(settings.path, function (i, id) {
            var node = frameNode(id);
            if (node !== false) {
                node.hide();
            }
        });
    }

    // Returns the angle between the positive x-axis and the line going through
    // the specified points. The angle is in degrees.
    function angle(point1, point2) {
        return -Math.atan2(point2.y - point1.y,
                           point2.x - point1.x) * 180 / Math.PI;
    }

    function distance(point1, point2) {
        return Math.sqrt(Math.pow(point2.x - point1.x, 2) +
                         Math.pow(point2.y - point1.y, 2));
    }

    // Returns the geometry of the frame associated with the specified node and
    // ID. Returns false on error.
    function frameGeometry(node, id) {
        var el, point1, point2, point3, matrix, geometry = {};

        el = node.get(0);

        if (typeof el.points === 'undefined' || el.points.numberOfItems < 3) {
            return false;
        }

        matrix = el.getCTM(); // additional transformation of points
        point1 = el.points.getItem(0).matrixTransform(matrix);
        point2 = el.points.getItem(1).matrixTransform(matrix);
        point3 = el.points.getItem(2).matrixTransform(matrix);

        return {
            centerX: point1.x / 2 + point3.x / 2,
            centerY: point1.y / 2 + point3.y / 2,
            width: distance(point1, point2),
            height: distance(point3, point2),
            angle: angle(point1, point2)
        };
    }

    // Stores the specified frame's geometry in `settings.frameGeometries`.
    // Returns false on error.
    function setFrameGeometry(node, id) {
        var geometry;

        if (typeof settings.frameGeometries[id] === 'undefined') {
            geometry = frameGeometry(node, id);
            if (geometry !== false) {
                settings.frameGeometries[id] = geometry;
            } else {
                return false;
            }
        } // else: already retrieved

        return true;
    }

    // Retrieves the initial geometry of each frame and stores it in
    // `settings.frameGeometries`.
    //
    // If a frame cannot be found, creates an error message and returns false.
    // Otherwise returns true.
    function setFrameGeometries() {
        var node, errorWasEncountered = false;

        settings.frameGeometries = {};
        $.each(settings.path, function (i, id) {
            node = frameNode(id);
            if (node !== false) {
                if (!setFrameGeometry(node, id)) {
                    presvg.onError('Frame ' + id + ' has bad geometry.');
                    errorWasEncountered = true;
                    return false; // break
                }
            } else {
                presvg.onError('Frame ' + id + ' not found.');
                errorWasEncountered = true;
                return false; // break
            }
        });

        return !errorWasEncountered;
    }

    function frameGeometriesAreSet() {
        return typeof settings.frameGeometries !== 'undefined';
    }

    // Initializes a container inside the container with node
    // `settings.containerNode`. This container then contains the SVG as well
    // as the YouTube video player. The reason for an extra container is that
    // elements need to be positioned absolutely (video player on top of SVG),
    // and it cannot be assumed that `settings.containerNode` always has a
    // non-static position. After all `settings.containerNode` is not generated
    // within presvg; it comes as a setting from outside.
    function initializeSubContainer() {
        subContainerNode = $('<div></div>').css({
            position: 'relative',
            width: '100%',
            height: '100%'
        });
        settings.containerNode.append(subContainerNode);
    }

    // Container for video, layered on top of SVG:
    function createYouTubeContainerNode() {
        var youTubeContainerNode = $('<div></div>').css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
        });
        subContainerNode.append(youTubeContainerNode);

        return youTubeContainerNode;
    }

    function drawYouTubeThumbnail(frameId, url) {
        var frameGeometry = settings.frameGeometries[frameId],
            centerX = frameGeometry.centerX,
            centerY = frameGeometry.centerY,
            w = frameGeometry.width,
            h = frameGeometry.height,
            translateTransform1 = ('translate(' + (-w / 2) + ',' +
                                   (-h / 2) + ')'),
            translateTransform2 = ('translate(' + centerX + ',' +
                                   centerY + ')'),
            rotateTransform = 'rotate(-' + frameGeometry.angle + ')';

        // image needs to be initially positioned at (0, 0) since otherwise
        // `preserveAspectRatio` doesn't work as expected in Chrome 15.0
        jQuerySvg.image(wrapperGroup,
                        0, 0,
                        frameGeometry.width, frameGeometry.height,
                        url, { preserveAspectRatio: 'xMidYMid slice',
                               transform: (translateTransform2 +
                                           rotateTransform +
                                           translateTransform1)
                             });
    }

    // Loads thumbnails for all frames where a YouTube video is available, and
    // draws them into the frames.
    function loadYouTubeThumbnails() {
        // frames without video are automatically ignored:
        $.each(settings.path, function (i, frameId) {
            youTube.loadThumbnailUrl(frameId, function (url) {
                drawYouTubeThumbnail(frameId, url);
            });
        });
    }

    // Initializes the object for playing YouTube videos associated with
    // frames.
    function initializeYouTube() {
        var youTubeSettings = $.extend({}, settings.youTube, {
            containerNode: createYouTubeContainerNode(),
            path: settings.path
        });

        youTube = presvg.youTube(youTubeSettings);

        loadYouTubeThumbnails();
    }

    function onReady() {
        if (settings.hasOwnProperty('onReady')) {
            settings.onReady();
        }
    }

    function url() {
        return settings.url || '';
    }

    function onSvgLoaded(x) {
        jQuerySvg = x;

        if (svgNode().children().length === 0) {
            presvg.onError('Cannot load SVG ' + url() + '.');
            return; // stops
        }

        // makes SVG as large as container:
        jQuerySvg.configure({ width: '100%', height: '100%' }, true);

        if (!frameGeometriesAreSet()) {
            if (!setFrameGeometries()) {
                return; // an error occured => don't continue
            }
        }

        hideFrameBorders();

        moveNodesIntoWrapperGroup();

        initializeYouTube();

        isReady = true;
        onReady();
    }

    function loadSvg() {
        // creates the SVG canvas:
        subContainerNode.
            css('overflow', 'hidden').
            svg({
                loadURL: settings.urlWithTimestamp,
                onLoad: onSvgLoaded
            });
    }

    // Returns the dimensions of the frame in pixels when displayed on the
    // screen.
    function frameGeometryOnScreen(frameId) {
        var frameGeometry = settings.frameGeometries[frameId],
            factor = scaleFactor(frameId);

        return {
            width: frameGeometry.width * factor,
            height: frameGeometry.height * factor
        };
    }

    // Renders the SVG at the current position in the path. The value
    // `fraction` defines the position between the two frames at integer
    // positions `i` and `j`.
    function render(i, j, fraction) {
        var frame1, frame2,
            geometry1, geometry2,
            frameId1, frameId2,
            translateTransformToOrigin, translateTransformToCenter,
            scaleTransform, presentationWidth, presentationHeight,
            tX1, tY1, tX2, tY2, sF1, sF2,
            rA1, rA2, rotateAngle, rotateTransform, id;

        frameId1 = settings.path[i];
        frameId2 = settings.path[j];

        geometry1 = settings.frameGeometries[frameId1];
        geometry2 = settings.frameGeometries[frameId2];

        // translation of frame center to origin:
        tX1 = -geometry1.centerX;
        tY1 = -geometry1.centerY;
        tX2 = -geometry2.centerX;
        tY2 = -geometry2.centerY;
        translateTransformToOrigin =
            'translate(' + ((tX1 + (tX2 - tX1) * fraction) + ',' +
                            (tY1 + (tY2 - tY1) * fraction)) + ')';

        // translation of frame (at start or end) center to presentation center
        presentationWidth = subContainerNode.width();
        presentationHeight = subContainerNode.height();
        translateTransformToCenter = ('translate(' +
                                      (presentationWidth / 2) + ',' +
                                      (presentationHeight / 2) + ')');

        // scale to fit frame (at start or end) into window:
        sF1 = scaleFactor(frameId1);
        sF2 = scaleFactor(frameId2);
        scaleTransform = 'scale(' + (sF1 + (sF2 - sF1) * fraction) + ')';

        // rotation to align frame (at start or end) with window (minus sign 
        rA1 = alignAngle(frameId1);
        rA2 = alignAngle(frameId2);
        rotateAngle = // minus sign to go from counter clockwise to clockwise
            -(rA1 + smallestAngleDiff(rA2, rA1) * fraction);
        rotateTransform = 'rotate(' + rotateAngle + ')';

        jQuerySvg.configure(wrapperGroup, {
            transform: (translateTransformToCenter +
                        scaleTransform +
                        rotateTransform +
                        translateTransformToOrigin)
        });

        if (fraction === 0) {
            youTube.resize(frameGeometryOnScreen(frameId1));
            youTube.update(frameId1);
        } else {
            youTube.hide(frameId1); // no video in between frames
        }
    }

    function initializeUrlWithTimestamp() {
        var regexp = /\?/, sep;

        sep = regexp.test(url()) ? '&' : '?';
        settings.urlWithTimestamp = url() + (sep + '_=' + $.now());
    }

    function initialize() {
        var urlWithTimestamp;

        isReady = false; // true once initialized

        if (typeof settings.urlWithTimestamp === 'undefined') {
            initializeUrlWithTimestamp();
        } // else: probably a copy - don't reinitialize to avoid caching

        initializeSubContainer();
        loadSvg();
    }

    initialize();

    return {
        render: function (i, j, fraction) {
            if (isReady) {
                render(i, j, fraction);
            }
        },

        // Returns a copy with the same SVG, contained by the node
        // `newContainerNode`.
        //
        // Note that copying the SVG will duplicate all IDs inside of it. As
        // all tested browsers don't have an issue with duplicate IDs in the
        // SVG, the ID attributes are left ontouched. After all, changing ID
        // attributes may cause side-effects. For example an animation script
        // embedded in the SVG may rely on certain IDs being present.
        copy: function (newContainerNode) {
            // The settings contain `urlWithTimestamp` already set, so that the
            // SVG file can be retrieved from cache.
            var newSettings = $.extend({}, settings, {
                containerNode: newContainerNode
            });

            return presvg.svg(newSettings);
        }
    };
};

// This function loads the text files. Required properties of `settings`:
//
// `onTextsLoaded`: called with texts as parameter
//
// `path`: array with frame ids, for which to load texts
//
// `textsUrl`: URL of the directory containing the text files
presvg.loadTexts = function (settings) {
    'use strict';

    var markdownConverter,
        texts; // texts for frames by frame ID

    function onTextLoaded(text, id, ids, nTextsDownloaded) {
        texts[id] = markdownConverter.makeHtml(text);
        nTextsDownloaded += 1;
        if (nTextsDownloaded >= ids.length) {
            settings.onTextsLoaded(texts);
        }

        return nTextsDownloaded;
    }

    // How `Prototype.js` does it, according to a reply in (as of 2012-01-28
    // CET):
    //
    // http://stackoverflow.com/questions/6020714/escape-html-using-jquery
    function escapeHtml(t) {
        return (t.
                replace(/&/g, '&amp;').
                replace(/</g, '&lt;').
                replace(/>/g, '&gt;'));
    }

    function notLoadedMessage(url) {
        return ('<p class="notLoadedMessage">Could not load: <code>' +
                escapeHtml(url) + '</code></p>');
    }

    // Frame text could not be loaded. Instead a corresponding message as text.
    function onTextNotLoaded(url, id, ids, nTextsDownloaded) {
        texts[id] = notLoadedMessage(url);
        nTextsDownloaded += 1; // advance despite text not found
        if (nTextsDownloaded >= ids.length) {
            settings.onTextsLoaded(texts);
        }

        return nTextsDownloaded;
    }

    // Forces that the response is interpreted as being UTF-8 encoded. This is
    // necessary f the server sets a non-UTF-8 encoding in the header. See
    // also:
    //
    // <http://stackoverflow.com/questions/330331/jquery-get-charset-of-reply-w
    // hen-no-header-is-set>
    function onBeforeSend(xhr) {
        xhr.overrideMimeType('text/html; charset=UTF-8');
    }

    // Returns the frame IDs in the path, without duplicates.
    function frameIds() {
        var ids = [];

        $.each(settings.path, function (i, id) {
            if ($.inArray(id, ids) === -1) {
                ids.push(id);
            }
        });

        return ids;
    }

    function textFileName(id) {
        return id + '.md';
    }

    // Loads the texts for all frames.
    function go() {
        var nTextsDownloaded = 0, ids;

        markdownConverter = Markdown.getSanitizingConverter();

        texts = {};

        ids = frameIds();

        $.each(ids, function (i, id) {
            var url;

            url = settings.textsUrl + '/' + textFileName(id);

            $.ajax({
                url: url,
                beforeSend: onBeforeSend,
                success: function (text) {
                    nTextsDownloaded = onTextLoaded(text, id, ids,
                                                    nTextsDownloaded);
                },
                error: function () {
                    nTextsDownloaded = onTextNotLoaded(url, id, ids,
                                                       nTextsDownloaded);
                },
                dataType: 'text',
                cache: false
            });
        });
    }

    go();
};

// Creates a pres/v/g presentation layed out for printing.
presvg.print = function (settings) {
    'use strict';

    var texts, // texts for frames by frame ID
        documentContainerNode, // node for containing text
        svgs, // SVG objects
        nReadySvgObjects = 0; // number of SVG objects that are ready
                              // (initialized)

    // called when pres/v/g interactive is ready
    function onReady() {
        if (settings.hasOwnProperty('onReady')) {
            settings.onReady();
        } // else: nothing - it's optional
    }

    // sequence of frames (index: path position, value: frame ID)
    function path() {
        if (settings.hasOwnProperty('path') &&
                settings.path.hasOwnProperty('length') &&
                settings.path.length > 0) {
            return settings.path;
        } else {
            presvg.onError('Missing or empty path.');
        }
    }

    // Makes URLs of links available in footnotes.
    function createFootnoteLinks() {
        documentContainerNode.footnoteLinks({
            listCls: 'footnoteLinks',
            deploy: false
        });
        documentContainerNode.find('.footnoteLinks h2').
            replaceWith(function () {
                return '<h1>' + $(this).text() + '</h1>';
            });
    }

    // called once all SVG objects are ready
    function onSvgsReady() {
        createFootnoteLinks();

        // moves to the frames in the SVG:
        $.each(svgs, function (i, svg) {
            svg.render(i, i, 0);
        });

        if (typeof onReady === 'function') {
            onReady();
        }
    }

    function onSvgReady() {
        nReadySvgObjects += 1;
        if (nReadySvgObjects === path().length) {
            onSvgsReady();
        }
    }

    function svgSettings(svgContainerNode) {
        return {
            url: settings.svgUrl,
            containerNode: svgContainerNode,
            path: path(),
            onReady: onSvgReady,
            youTube: (settings.hasOwnProperty('youTube') ?
                      settings.youTube : [])
        };
    }

    function appendSvg(svgContainerNode) {
        if (typeof svgs === 'undefined') {
            // first time => initialize array
            svgs = [presvg.svg(svgSettings(svgContainerNode))];
        } else {
            svgs.push(svgs[0].copy(svgContainerNode));
        }
    }

    function createDivNode(className) {
        // Creating the div with `{ 'class': ...s }` as parameter results
        // in an error from jQuery SVG (very strange since unrelated here). =>
        // Separate function call to `attr`.
        return $('<div></div>').attr('class', className);
    }

    // Appends frame with text and SVG to the document.
    function appendFrame(i, id) {
        var frameNode, svgContainerNode, svgContainerId;

        frameNode = createDivNode('frame');
        documentContainerNode.append(frameNode);
        frameNode.append(texts[id]);

        svgContainerNode = createDivNode('svg');
        frameNode.append(svgContainerNode);
        appendSvg(svgContainerNode);
    }

    function onTextsLoaded(x) {
        texts = x;

        $.each(path(), appendFrame);
    }

    // returns false if the container cannot be found
    function setDocumentContainer() {
        documentContainerNode = $(settings.documentContainerSelector);
        if (documentContainerNode.length !== 1) {
            presvg.onError('Cannot find specified text container.');
            return false;
        }
    }

    function initialize() {
        if (setDocumentContainer() !== false) {
            presvg.loadTexts({
                onTextsLoaded: onTextsLoaded,
                path: path(),
                textsUrl: settings.textsUrl || ''
            });
        } // else: error happened => don't continue
    }

    initialize();
};

// Returns an object which represents a pres/v/g presentation that can be
// interactively controlled.
presvg.interactive = function (settings) {
    'use strict';

    var textContainerNode, // node for containing text

        pathPos, // current position in the path, may be fractional number
        pathPosTime = null, // time (ms) when `pathPos` was last at its current
                            // value
        destinationPathPos, // destination path position, to animate to

        textNode,
        nextTextNode,

        svg, // object to control SVG

        texts, // texts for frames by frame ID

        isReady = false; // true once initialization finished

    // called when pres/v/g interactive is ready
    function onReady() {
        if (settings.hasOwnProperty('onReady')) {
            settings.onReady();
        } // else: nothing - it's optional
    }

    // sequence of frames (index: path position, value: frame ID)
    function path() {
        if (settings.hasOwnProperty('path') &&
                settings.path.hasOwnProperty('length') &&
                settings.path.length > 0) {
            return settings.path;
        } else {
            presvg.onError('Missing or empty path.');
        }
    }

    function resetTextContainer() {
        textContainerNode.scrollTop(0);
    }

    // Shows text describing the frames at integer positions `i` and `j`. The
    // value `fraction` defines the superposition between the texts.
    function renderTexts(i, j, fraction) {
        var id = path()[i],
            jd = path()[j],
            opacity = 1 - fraction,
            nextOpacity = fraction,

            // opacity => empty text, to avoid unnecessary scroll bars if 
            // hidden text is long
            text = (texts[id] && opacity > 0) ? texts[id] : '',
            nextText = ((id !== jd && texts[jd] && nextOpacity > 0) ?
                        texts[jd] : '');

        textNode.html(text).css('opacity', opacity);
        nextTextNode.html(nextText).css('opacity', nextOpacity);

        if (opacity === 1 || nextOpacity === 1) {
            resetTextContainer();
        } // else: looks better not to do reset now
    }

    // Updates the display to reflect the current position in the path.
    //
    // The current path position may have a fractional part, in which case a
    // transitional step between two frames is shown:
    //
    //   integer part + fractional part
    //
    // => frame `integer part`, with transition `fractional part` * 100% to
    //   next frame.
    //
    // Also updates the descriptive text.
    function render() {
        var frame, nextFrame, i, j, fraction;

        i = Math.floor(pathPos);
        if (i < path().length) {
            j = i + 1 < path().length ? i + 1 : i;
            fraction = pathPos - i; // non-zero (e.g. 0.3) if in between frames

            svg.render(i, j, fraction);
            renderTexts(i, j, fraction);
        } // else: outside of range
    }

    // called when the position in the path changes
    function onPathPosChanged() {
        if (settings.hasOwnProperty('onPathPosChanged')) {
            settings.onPathPosChanged(pathPos);
        }
    }

    // always use this function to set the current position in the path
    function setPathPos(x) {
        var maxPathPos = path().length - 1;

        if (x !== pathPos) { // to avoid unnecessary updates
            if (x > maxPathPos) {
                pathPos = path.length - 1;
            } else if (x < 0) {
                pathPos = 0;
            } else {
                pathPos = x;
            }
            onPathPosChanged();
        }
    }

    // Returns animation speed in: path positions / sec
    function animationSpeed() {
        var minAnimationSpeed = 0.001; // fallback and minimum
        return settings.animationSpeed || Math.max(settings.animationSpeed,
                                                   minAnimationSpeed);
    }

    // One step in the animation. Only changes the path position and updates
    // the display when the destination path position is not equal to the
    // current path position.
    function animationStep() {
        var currentTime = $.now(), deltaT, deltaPathPos, newPathPos;

        if (destinationPathPos !== pathPos && pathPosTime !== null) {
            // draw new animation step

            deltaT = currentTime - pathPosTime;
            deltaPathPos = deltaT * animationSpeed() / 1000;
            newPathPos = (destinationPathPos > pathPos ?
                          Math.min(destinationPathPos,
                                   pathPos + deltaPathPos) :
                          Math.max(destinationPathPos,
                                   pathPos - deltaPathPos));

            setPathPos(newPathPos);
            render();
        } // else: no animation step necessary, or "pathPosTime" not yet set

        pathPosTime = currentTime; // always keep up to date
        requestAnimationFrame(animationStep);
    }

    function startAnimation() {
        requestAnimationFrame(animationStep);
    }

    // Initializes the text container so that it can display the text of two
    // frames, superimposed. Returns false on error.
    function initializeTextContainer() {
        var containerContainerNode;

        textContainerNode = $(settings.textContainerSelector);
        if (textContainerNode.length === 0) {
            presvg.onError('Cannot find specified text container.');
            return false;
        }

        containerContainerNode = $('<div></div>').css({
            position: 'relative'
        });
        textNode = $('<div></div>').css({
            position: 'absolute',
            top: 0
        });
        nextTextNode = $('<div></div>').css({
            position: 'absolute',
            top: 0
        });

        containerContainerNode.
            append(textNode).
            append(nextTextNode);

        textContainerNode.append(containerContainerNode);
    }

    function onTextsLoaded(x) {
        texts = x;

        render();
        startAnimation();

        // finishes up initialization
        isReady = true;
        onReady();
    }

    function onSvgReady() {
        presvg.loadTexts({
            onTextsLoaded: onTextsLoaded,
            path: path(),
            textsUrl: settings.textsUrl || ''
        });
    }

    function svgSettings() {
        return {
            url: settings.svgUrl,
            containerNode: $(settings.svgContainerSelector),
            path: path(),
            onReady: function () {
                onSvgReady();
            },
            youTube: (settings.hasOwnProperty('youTube') ?
                      settings.youTube : [])
        };
    }

    function initialize() {
        if (initializeTextContainer() === false) {
            return; // error happened => don't continue
        }

        setPathPos(settings.initialPathPos);
        destinationPathPos = pathPos;

        svg = presvg.svg(svgSettings());
    }

    initialize();

    return {
        // Returns the position of the previous frame in the path, or false if
        // not ready.
        previousFramePathPos: function () {
            var i;

            if (isReady) {
                i = Math.ceil(pathPos);
                return (i >= 1) ? i - 1 : i;
            } else {
                return false;
            }
        },

        // Returns the position of the next frame in the path, or false if not
        // ready.
        nextFramePathPos: function () {
            var i;

            if (isReady) {
                i = Math.floor(pathPos);
                return (i < path().length - 1) ? i + 1 : i;
            } else {
                return false;
            }
        },

        setPathPos: setPathPos,

        // causes a transitions (by animation) to the specified position in the
        // path
        setDestinationPathPos: function (x) {
            if (isReady) {
                destinationPathPos = x;
            }
        },

        // should be called e.g. when the container is resized
        redraw: function () {
            if (isReady) {
                render();
            }
        },

        // Returns the path position, or false if not ready.
        pathPos: function () {
            if (isReady) {
                return pathPos;
            } else {
                return false;
            }
        }
    };
};
