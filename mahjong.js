/*global window, document, event, navigator */
/*jslint vars: true, white: true, plusplus: true */

(function() {

  "use strict";

  // mahjong card template

  var utils = {

    css: (function() {

      function hasClass(o, cStr) {

        return (o.className !== undefined ? new RegExp('(^|\\s)' + cStr + '(\\s|$)').test(o.className) : false);

      }

      function addClass(o, cStr) {

        if (!o || !cStr || hasClass(o, cStr)) {
          return false; // safety net
        }
        o.className = (o.className ? o.className + ' ' : '') + cStr;

      }

      function removeClass(o, cStr) {

        if (!o || !cStr || !hasClass(o, cStr)) {
          return false;
        }
        o.className = o.className.replace(new RegExp('( ' + cStr + ')|(' + cStr + ')', 'g'), '');

      }

      function swapClass(o, cStr1, cStr2) {

        var tmpClass = {
          className: o.className
        };

        removeClass(tmpClass, cStr1);
        addClass(tmpClass, cStr2);

        o.className = tmpClass.className;

      }

      function toggleClass(o, cStr) {

        (hasClass(o, cStr) ? removeClass : addClass)(o, cStr);

      }

      return {
        has: hasClass,
        add: addClass,
        remove: removeClass,
        swap: swapClass,
        toggle: toggleClass
      };

    }()),

    events: (function() {

      var add, remove, preventDefault;

      add = (window.addEventListener !== undefined ? function(o, evtName, evtHandler) {
        return o.addEventListener(evtName, evtHandler, false);
      } : function(o, evtName, evtHandler) {
        o.attachEvent('on' + evtName, evtHandler);
      });

      remove = (window.removeEventListener !== undefined ? function(o, evtName, evtHandler) {
        return o.removeEventListener(evtName, evtHandler, false);
      } : function(o, evtName, evtHandler) {
        return o.detachEvent('on' + evtName, evtHandler);
      });

      preventDefault = function(e) {
        if (e.preventDefault) {
          e.preventDefault();
        } else {
          e.returnValue = false;
          e.cancelBubble = true;
        }
      };

      return {
        add: add,
        preventDefault: preventDefault,
        remove: remove
      };

    }())

  };

  // end utils

  var actions, css, content, events, largest, patterns, tmp, canZoom, isMobile, oldIE;

  function findNextNode(node) {

    if (node && node.nextSibling) {
      do {
        node = node.nextSibling;
      } while (node && node.nextSibling && node.nodeType === 3);
    }

    return (node && node.nodeType !== 3 ? node : null);

  }

  function findAssociatedUL(h2) {

    // given an <h2>, find the relevant <ul>

    var ul;

    if (h2.getAttribute('data-for')) {

      // hackish, special case
      ul = document.getElementById(h2.getAttribute('data-for'));

    } else {

      // adjacent <ul>
      ul = findNextNode(h2);

    }

    return ul;

  }

  function refreshGroups() {

    var headers, ul, items, active, i, j, k, l;

    if (document.querySelector) {

      headers = document.getElementsByTagName('h2');

      for (i=0, j=headers.length; i<j; i++) {

        // find the <ul> associated with the <h2>

        ul = findAssociatedUL(headers[i]);

        if (ul) {

          active = 0;
          items = ul.getElementsByTagName('li');

          for (k=0, l=items.length; k<l; k++) {
            if (utils.css.has(items[k], css.active)) {
              active++;
            }
          }

          utils.css[(active ? 'remove' : 'add')](headers[i], css.inactive);

        }

      }

    }

  }

  function reset() {

    var items, i, j;

    if (document.querySelectorAll) {

      items = document.querySelectorAll('li.' + css.active);

      for (i=0, j=items.length; i<j; i++) {
        utils.css.remove(items[i], css.active);
      }

      utils.css.remove(content, css.active);

      refreshGroups();

    }

  }

  function refreshContent() {

    var active, items, i, j;

    active = 0;

    items = document.getElementsByTagName('li');

    for (i=0, j=items.length; i<j; i++) {
      if (utils.css.has(items[i], css.active)) {
        active++;
      }
    }

    utils.css[(active ? 'add' : 'remove')](content, css.active);

  }

  function toggleItem(node) {

    utils.css.toggle(node, css.active);

  }

  // in 2014, still accounting for ye olde crap browsers; why not.
  oldIE = navigator.userAgent.match(/msie [5678]/i);

  css = {
    active: 'active',
    inactive: 'inactive',
    selected: 'selected'
  };

  actions = {

    'h2': function(e) {

      var h2, ul, items, i, j, active;

      h2 = e.target || event.srcElement;

      active = 0;

      ul = findAssociatedUL(h2);

      items = ul.getElementsByTagName('li');

      // count actives
      for (i=0, j=items.length; i<j; i++) {
        if (utils.css.has(items[i], css.active)) {
          active++;
        }
      }

      // toggle all or none
      for (i=0, j=items.length; i<j; i++) {
        utils.css[active < j ? 'add' : 'remove'](items[i], css.active);
      }

      refreshGroups();
      refreshContent();

    },

    'li': function(e) {

      toggleItem(e.target || event.srcElement);

    }

  };

  events = {

    resize: function() {

      var scaleOffset, contentWidth, scale;

      contentWidth = (window.innerWidth || document.body.clientWidth) / (!oldIE ? 2 : 1);

      // tweak to prevent overlap of left + right sides. adjust to taste.
      scaleOffset = 1;

      scale = (contentWidth / largest.width) * scaleOffset;

      // scale largest element (roughly)
      if (canZoom) {
        document.body.style.zoom = scale;
      } else {
        document.body.style.fontSize = (16 * scale) + 'px';
      }

    },

    mousedown: function(e) {

      var target, nodeName;

      target = e.target || event.srcElement;

      nodeName = target.nodeName.toLowerCase();

      if (actions[nodeName]) {

        actions[nodeName](e);
        refreshContent();
        refreshGroups();

        if (isMobile) {
          try {
            target.blur();
          } catch(err) {
            // oh well
            return;
          }
        }

      }

    },

    keydown: function(e) {

      if (e.keyCode === 27) {
        reset();
      }

    },

    selectstart: function() {

      return false;

    }

  };

  utils.events.add(window, 'load', function() {

    var i, j, value;

    isMobile = navigator.userAgent.match(/mobile/i);
    canZoom = (navigator.userAgent.match(/chrome|safari/i) && !isMobile && window.location.href.match(/zoom/i));
    content = document.getElementById('content');
    patterns = document.getElementsByClassName ? document.getElementsByClassName('pattern') : document.getElementsByTagName('span');
    value = document.querySelectorAll('span.value');

    for (i=0, j=patterns.length; i<j; i++) {
      tmp = patterns[i].offsetWidth;
      if (!largest || tmp > largest.width) {
        largest = {
          offset: i,
          // slight offset on right value width, a little extra spacing.
          // not sure this will work all the time, probably a bit fiddly.
          width: tmp + (value && value[i] ? value[i].offsetWidth * 2.5 : 0)
        };
      }
    }

    // utils.events.add(window, 'gesturechange', events.resize);
    utils.events.add(window, 'resize', events.resize);
    utils.events.add(window, 'orientationchange', events.resize);
    utils.events.add(document, 'mousedown', events.mousedown);
    utils.events.add(document, 'keydown', events.keydown);
    utils.events.add(document, 'selectstart', events.selectstart);

    // now resize
    events.resize();

  });
  
}());
