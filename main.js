/* James Tian · personal site
   Two small jobs: open a project from the URL hash, and load the 3D drone
   viewer only when someone opens that section. */
(function () {
  'use strict';

  var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var THREE_SRI = 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu';

  function loadScript(src, integrity, ok, fail) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (integrity) {
      s.integrity = integrity;
      s.crossOrigin = 'anonymous';
    }
    s.onload = ok;
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function haveThree128() {
    return !!(window.THREE && String(window.THREE.REVISION) === '128');
  }

  var drone = document.getElementById('drone');
  var viewer = document.getElementById('drone-viewer');
  var loading = false;

  // Loads three.js (pinned r128) and drone.js the first time the section opens.
  // A failed load clears `loading`, so reopening the section tries again.
  function startViewer() {
    if (loading || window.droneViewer || !viewer) return;
    loading = true;
    var fail = function () {
      loading = false;
      viewer.classList.add('failed');
    };
    var init = function () {
      try {
        if (!window.initDroneViewer) return fail();
        var v = window.initDroneViewer(viewer);
        if (!v) return fail();
        viewer.classList.remove('failed');
        loading = false;
        v.setActive(drone.open);
      } catch (e) {
        fail();
      }
    };
    var boot = function () {
      if (window.initDroneViewer) init();
      else loadScript('drone.js', null, init, fail);
    };
    if (haveThree128()) boot();
    else loadScript(THREE_SRC, THREE_SRI, boot, fail);
  }

  if (drone && viewer) {
    drone.addEventListener('toggle', function () {
      if (drone.open) startViewer();
      if (window.droneViewer) window.droneViewer.setActive(drone.open);
    });
    if (drone.open) startViewer();
  }

  // A link like /#apateu opens that project.
  function openFromHash() {
    var id = location.hash.replace('#', '');
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS' && !el.open) el.open = true;
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
