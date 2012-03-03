// Functionality for the page that embeds the presentation.
//
// Notes:
//
// * HTML5 history is not used for registering the current path position in the
//   URL. Instead hash tags are used. Reasons:
//
//   - When the base URL changes, then drawing radial gradients in SVG does not
//     work anymore, at seen in Firefox 10.0. This may actually *not* be a bug
//     in Firefox. More:
//
//       https://bugzilla.mozilla.org/show_bug.cgi?id=441780
//
//   - Backwards compatibility to HTML4 browsers.
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

/*global presvg, $, alert, window, Modernizr, History, requestAnimationFrame,
  cancelAnimationFrame, settings, open, location */

// Returns an object which provides functionality for the page displaying
// presvg.
var page = (function () {
    'use strict';

    var interactive, // interactive presentation (i.e. not for printing)
        otherInteractiveWindow = null, // separate window displaying the same
                                       // presentation (e.g. full-screen) and
                                       // that should be synchronized
        view, // current view
        views = ['default', 'svg', 'print'], // possible values for `view`
        isReady = false; // true once initialization finished

    // Returns the value of the hash parameter indicating the view, or
    // 'default' on error.
    function viewFromHash() {
        var value = $.bbq.getState('view', false);
        return $.inArray(value, views) >= 0 ? value : 'default';
    }

    // Returns the value of the hash parameter of the current path position, or
    // 0 on error.
    function pathPosFromHash() {
        var value = $.bbq.getState('pathPos', false);
        return $.isNumeric(value) ? parseInt(value, 10) : 0;
    }

    function pathPosToHash(pathPos) {
        $.bbq.pushState({ pathPos: pathPos });
    }

    function onHashchanged() {
        interactive.setDestinationPathPos(pathPosFromHash());
    }

    function otherInteractiveWindowExists() {
        return (otherInteractiveWindow !== null &&
                !otherInteractiveWindow.closed);
    }

    function otherInteractiveWindowPageIsReady() {
        return (otherInteractiveWindow.hasOwnProperty('page') &&
                otherInteractiveWindow.page.isReady());
    }

    // Executes `f()` once the other window is ready.
    function onceOtherInteractiveWindowPageIsReady(f) {
        if (otherInteractiveWindowPageIsReady()) {
            f();
        } else {
            // polls until the window is ready
            setTimeout(function () {
                onceOtherInteractiveWindowPageIsReady(f);
            }, 100);
        }
    }

    // Works only once initialized. If another interactive window exists, keeps
    // that in sync.
    function transitionToPathPos(pathPos) {
        if (isReady && pathPos !== pathPosFromHash()) {
            pathPosToHash(pathPos); // changes hash, triggering the transition

            // If there is another window, keep that in sync:
            if (otherInteractiveWindowExists()) {
                onceOtherInteractiveWindowPageIsReady(function () {
                    otherInteractiveWindow.page.transitionToPathPos(pathPos);
                });
            }
        }
    }

    function transitionToPreviousFrame() {
        var pathPos = interactive.previousFramePathPos();
        transitionToPathPos(pathPos);
    }

    function transitionToNextFrame() {
        var pathPos = interactive.nextFramePathPos();
        transitionToPathPos(pathPos);
    }

    function urlWithoutHash(url) {
        return url.split("#")[0];
    }

    // Opens a separate window, containg just the SVG of the presentation.
    function openSvgViewWindow() {
        var url = (urlWithoutHash(location.href) +
                   '#view=svg&pathPos=' + interactive.pathPos());

        otherInteractiveWindow = open(url, 'svg');

        onceOtherInteractiveWindowPageIsReady(function () {
            // connects back this window, so that navigation in the other
            // window is synchronized back
            otherInteractiveWindow.page.setOtherInteractiveWindow(window);
        });
    }

    // Opens a separate window with a print view of the presentation.
    function openPrintViewWindow() {
        var url = urlWithoutHash(location.href) + '#view=print';

        open(url, 'print');
    }

    function maxPathPos() {
        return settings.path.length - 1;
    }

    function updateSlider(pathPos) {
        $('#slider').slider('value', pathPos);
    }

    // Called when the *user* finished moving the slider. Causes the slider to
    // jump to the selected position, with a transition following to the next
    // frame (integer position).
    function onSliderStopped(event, ui) {
        var selectedPathPos = ui.value;

        interactive.setPathPos(selectedPathPos);

        // If there is another window (= window with SVG view), keep that in
        // sync:
        if (otherInteractiveWindowExists()) {
            onceOtherInteractiveWindowPageIsReady(function () {
                otherInteractiveWindow.page.setPathPos(selectedPathPos);
            });
        }

        transitionToPathPos(Math.round(ui.value));
    }

    function initializeSlider() {
        $('#slider').slider({
            value: 0,
            min: 0,
            max: maxPathPos(),
            step: 0.01,
            range: "min",
            stop: onSliderStopped
        });
        updateSlider(interactive.pathPos());
    }

    function updateButtons(pathPos) {
        $('#previousButton').button('option', 'disabled', pathPos <= 0);
        $('#nextButton').button('option', 'disabled',
                                pathPos >= maxPathPos());
    }

    function initializeButtons() {
        $('#previousButton').button({
            icons: { primary: 'ui-icon-arrowthick-1-w' },
            text: false
        });
        $('#nextButton').button({
            icons: { primary: 'ui-icon-arrowthick-1-e' },
            text: false
        });
        $('#printViewButton').button({
            icons: { primary: 'ui-icon-print' },
            text: false
        });
        $('#svgViewButton').button({
            icons: { primary: 'ui-icon-arrow-4-diag' },
            text: false
        });
        $('#previousButton').click(transitionToPreviousFrame);
        $('#nextButton').click(transitionToNextFrame);
        $('#printViewButton').click(openPrintViewWindow);
        $('#svgViewButton').click(openSvgViewWindow);
    }

    function updateNavigationBar(pathPos) {
        updateSlider(pathPos);
        updateButtons(pathPos);
    }

    function initializeNavigationBar() {
        initializeSlider();
        initializeButtons();
    }

    function initializeKeyboardNavigation(event) {
        $(document).bind('keydown', 'right pagedown', transitionToNextFrame);
        $(document).bind('keydown', 'left pageup', transitionToPreviousFrame);
    }

    function showPresentation() {
        $('#presentation').css('visibility', 'visible').hide().fadeIn('slow');
        $('#loadIndicator').fadeOut('slow');
    }

    function onInteractiveReady() {
        if (view === 'svg') {
            $(window).resize(interactive.redraw);
        } else {
            initializeNavigationBar();
        }

        initializeKeyboardNavigation();
        $(window).bind('hashchange', onHashchanged);

        showPresentation();
        isReady = true;
    }

    function onPrintReady() {
        showPresentation();
        isReady = true;
    }

    function onError(message) {
        $('#errorBar').fadeIn('slow');
        $('#errorMessage').html(message);
    }

    function browserIsSupported() {
        return (typeof $ !== 'undefined' && // jQuery failed to initialize (may
                                            // happen on very old browsers)
                Modernizr.svg === true &&
                Modernizr.svgclippaths === true);
    }

    function youTubeSettings() {
        var s = settings.hasOwnProperty('youTube') ? settings.youTube : {};

        switch (view) {
        case 'svg':
            s.autoPlay = true;
            break;
        case 'print':
            s.noPlayer = true;
            break;
        // default: don't autoplay in default mode (may run concurrently with
        // svg mode)
        }

        return s;
    }

    function initializeInteractiveView() {
        var interactiveSettings = $.extend({
            onReady: onInteractiveReady,
            svgUrl: settings.dataUrl + '/presentation.svg',
            textsUrl: settings.dataUrl + '/texts',
            svgContainerSelector: '#svgContainer',
            textContainerSelector: '#textContainer',
            animationSpeed: 0.8, // path positions / sec
            initialPathPos: pathPosFromHash(),
            onPathPosChanged: updateNavigationBar,
            youTubeSettings: youTubeSettings()
        }, settings);

        interactive = presvg.interactive(interactiveSettings);
    }

    function initializePrintView() {
        var printSettings;

        printSettings = $.extend({
            onReady: onPrintReady,
            svgUrl: settings.dataUrl + '/presentation.svg',
            textsUrl: settings.dataUrl + '/texts',
            documentContainerSelector: '#documentContainer',
            youTubeSettings: youTubeSettings()
        }, settings);

        presvg.print(printSettings);
    }

    function initializeView() {
        var viewClass;

        view = viewFromHash();

        $('html').addClass(view + 'View');

        presvg.onError = onError;

        if (view === 'print') {
            initializePrintView();
        } else {
            initializeInteractiveView();
        }
    }

    function loadPolyfills() {
        Modernizr.load({
            test: (typeof requestAnimationFrame !== 'undefined' &&
                   typeof cancelAnimationFrame !== 'undefined'),
            nope: 'vendor/rAF.js',
            complete: initializeView
        });
    }

    return {
        initialize: function () {
            if (browserIsSupported()) {
                loadPolyfills();
            } else {
                alert('Your web browser is not supported.');
            }
        },

        transitionToPathPos: transitionToPathPos,

        // Works only once initialized, and only for interactive presentation
        // (naturally). Does not keep possible other window in sync.
        setPathPos: function (pathPos) {
            interactive.setPathPos(pathPos);
        },

        setOtherInteractiveWindow: function (x) {
            otherInteractiveWindow = x;
        },

        isReady: function () {
            return isReady;
        }
    };
}());

$(page.initialize);
