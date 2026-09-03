/* X650 V2 delivery drone · three.js r128
   Every part is placed at its real position and size in metres, taken from
   the build's parts list: Holybro X650 V2 (650 mm, 15-inch props), Pixhawk 6C
   Mini, Raspberry Pi 5 + AI Camera on a tilt gimbal, RPLIDAR C1, TFS20-L,
   6S LiPo, and a 1 kg package in a printed bay on the payload rails. */
(function () {
  'use strict';

  function carbonTexture(T) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d'), s = 16;
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var d = (x + y) % 2 === 0;
        g.fillStyle = d ? '#25272c' : '#121316';
        g.fillRect(x * s, y * s, s, s);
        g.strokeStyle = d ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)';
        g.lineWidth = 1;
        for (var k = 2; k < s; k += 4) {
          g.beginPath();
          if (d) { g.moveTo(x * s, y * s + k + 0.5); g.lineTo(x * s + s, y * s + k + 0.5); }
          else { g.moveTo(x * s + k + 0.5, y * s); g.lineTo(x * s + k + 0.5, y * s + s); }
          g.stroke();
        }
      }
    }
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function radialTexture(T) {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, 'rgba(60,48,36,0.55)');
    grd.addColorStop(0.45, 'rgba(60,48,36,0.22)');
    grd.addColorStop(1, 'rgba(60,48,36,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    return t;
  }

  /* A small studio: grey room with three softboxes and a floor bounce,
     baked to a PMREM so metals and gloss have something to reflect. */
  function studioEnvironment(T, renderer) {
    var pm = new T.PMREMGenerator(renderer);
    var s = new T.Scene();
    s.add(new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x3a3835, side: T.BackSide })));
    function panel(w, h, x, y, z, rx, ry, intensity, color) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity) }));
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, 0);
      s.add(m);
    }
    panel(5, 3, 0, 5.9, 0.5, Math.PI / 2, 0, 3.0, 0xfff6ea);
    panel(3, 4, -5.9, 1.5, 1, 0, Math.PI / 2, 1.5, 0xffffff);
    panel(2, 3, 5.9, 1, -2, 0, -Math.PI / 2, 0.9, 0xfff0e0);
    panel(6, 1.2, 0, -5.9, 0, -Math.PI / 2, 0, 0.45, 0xe8e0d3);
    var tex = pm.fromScene(s, 0.04).texture;
    pm.dispose();
    return tex;
  }

  function initDroneViewer(container) {
    if (window.droneViewer) return window.droneViewer;
    var T = window.THREE;
    if (!T || String(T.REVISION) !== '128') return null;
    var canvas = container.querySelector('canvas');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      container.classList.add('failed');
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    var scene = new T.Scene();
    scene.environment = studioEnvironment(T, renderer);

    var camera = new T.PerspectiveCamera(30, 1.5, 0.05, 30);

    // ---- materials
    var carbonTex = carbonTexture(T);
    carbonTex.repeat.set(20, 20);
    var tubeTex = carbonTex.clone();
    tubeTex.needsUpdate = true;
    tubeTex.repeat.set(4, 40);
    var mat = {
      carbon: new T.MeshStandardMaterial({ map: carbonTex, roughness: 0.36, metalness: 0.3 }),
      tube: new T.MeshStandardMaterial({ map: tubeTex, roughness: 0.36, metalness: 0.3 }),
      alu: new T.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.45, metalness: 0.7 }),
      steel: new T.MeshStandardMaterial({ color: 0xc9c9c9, roughness: 0.28, metalness: 0.95 }),
      motor: new T.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.4, metalness: 0.7 }),
      red: new T.MeshStandardMaterial({ color: 0xb8321f, roughness: 0.35, metalness: 0.6 }),
      prop: new T.MeshStandardMaterial({ color: 0x101113, roughness: 0.3, metalness: 0.35 }),
      plastic: new T.MeshStandardMaterial({ color: 0x111214, roughness: 0.55, metalness: 0.05 }),
      glass: new T.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.08, metalness: 0.25 }),
      pcb: new T.MeshStandardMaterial({ color: 0x0e5a3c, roughness: 0.5, metalness: 0.15 }),
      petg: new T.MeshStandardMaterial({ color: 0xd9683f, roughness: 0.45, metalness: 0.0 }),
      kraft: new T.MeshStandardMaterial({ color: 0xa87c4c, roughness: 0.95, metalness: 0.0 }),
      tape: new T.MeshStandardMaterial({ color: 0xc9ad7e, roughness: 0.55, metalness: 0.0 }),
      lipo: new T.MeshStandardMaterial({ color: 0x161c26, roughness: 0.6, metalness: 0.1 }),
      label: new T.MeshStandardMaterial({ color: 0xe6b84a, roughness: 0.6, metalness: 0.0 }),
      white: new T.MeshStandardMaterial({ color: 0xe9e7e0, roughness: 0.5, metalness: 0.0 }),
      foam: new T.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1.0, metalness: 0.0 }),
      led: new T.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff6a00, emissiveIntensity: 0.9, roughness: 0.4 })
    };

    Object.keys(mat).forEach(function (k) { mat[k].envMapIntensity = 0.7; });

    // ---- helpers
    function box(w, h, d, m, x, y, z, parent) {
      var o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      o.position.set(x || 0, y || 0, z || 0);
      o.castShadow = o.receiveShadow = true;
      (parent || scene).add(o);
      return o;
    }
    function cyl(r, h, m, x, y, z, parent, seg) {
      var o = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 32), m);
      o.position.set(x || 0, y || 0, z || 0);
      o.castShadow = o.receiveShadow = true;
      (parent || scene).add(o);
      return o;
    }

    // Gemfan 1555: 15-inch (0.381 m) two-blade carbon prop, twisted root to tip.
    function makeBlade() {
      var s = new T.Shape();
      s.moveTo(0.010, 0.0055);
      s.bezierCurveTo(0.05, 0.019, 0.11, 0.017, 0.16, 0.011);
      s.quadraticCurveTo(0.185, 0.007, 0.1905, 0.0);
      s.quadraticCurveTo(0.185, -0.007, 0.16, -0.010);
      s.bezierCurveTo(0.11, -0.014, 0.05, -0.013, 0.010, -0.0055);
      s.closePath();
      var geo = new T.ExtrudeGeometry(s, { depth: 0.0016, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0007, bevelSegments: 2, curveSegments: 24 });
      geo.translate(0, 0, -0.0008);
      var p = geo.attributes.position, v = new T.Vector3();
      for (var k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k);
        var t = Math.max(0, Math.min(1, (v.x - 0.01) / 0.18));
        var ang = 0.40 - 0.24 * t;
        var y = v.y * Math.cos(ang) - v.z * Math.sin(ang);
        var z = v.y * Math.sin(ang) + v.z * Math.cos(ang);
        p.setXYZ(k, v.x, y, z);
      }
      geo.computeVertexNormals();
      var m = new T.Mesh(geo, mat.prop);
      m.rotation.x = -Math.PI / 2;
      m.castShadow = m.receiveShadow = true;
      return m;
    }
    function makeProp() {
      var g = new T.Group();
      cyl(0.011, 0.011, mat.plastic, 0, 0, 0, g, 24);
      cyl(0.0055, 0.008, mat.red, 0, 0.0095, 0, g, 6);
      for (var b = 0; b < 2; b++) {
        var bl = makeBlade();
        bl.rotation.y = b * Math.PI;
        g.add(bl);
      }
      return g;
    }

    var ac = new T.Group();
    scene.add(ac);

    // ---- centre plates (160 x 160 x 2 mm carbon), 50 mm apart
    box(0.16, 0.002, 0.16, mat.carbon, 0, 0.03, 0, ac);
    box(0.16, 0.002, 0.16, mat.carbon, 0, -0.02, 0, ac);

    // ---- four arms at 45°, folding mounts, MN4014 motors, props
    for (var i = 0; i < 4; i++) {
      var a = Math.PI / 4 + i * Math.PI / 2;
      var g = new T.Group();
      g.rotation.y = a;
      ac.add(g);
      box(0.034, 0.05, 0.03, mat.alu, 0.098, 0.005, 0, g);
      cyl(0.004, 0.036, mat.steel, 0.098, 0.005, 0, g, 16).rotation.x = Math.PI / 2;
      var arm = cyl(0.010, 0.245, mat.tube, 0.235, 0.005, 0, g, 28);
      arm.rotation.z = Math.PI / 2;
      box(0.036, 0.005, 0.036, mat.alu, 0.325, 0.0165, 0, g);
      cyl(0.013, 0.03, mat.alu, 0.318, 0.005, 0, g, 20).rotation.z = Math.PI / 2;
      cyl(0.0225, 0.006, mat.steel, 0.325, 0.022, 0, g);
      cyl(0.0222, 0.02, mat.motor, 0.325, 0.035, 0, g);
      cyl(0.0224, 0.0025, mat.red, 0.325, 0.0465, 0, g);
      cyl(0.0225, 0.004, mat.steel, 0.325, 0.0498, 0, g);
      cyl(0.0035, 0.012, mat.steel, 0.325, 0.056, 0, g, 12);
      var prop = makeProp();
      prop.position.set(0.325, 0.058, 0);
      prop.rotation.y = i * 0.7 + 0.4;
      g.add(prop);
    }

    // ---- landing gear: two skids, 215 mm tall
    var gear = new T.Group();
    ac.add(gear);
    [1, -1].forEach(function (s) {
      [1, -1].forEach(function (sx) {
        var leg = cyl(0.008, 0.232, mat.tube, sx * 0.06, -0.123, s * 0.1075, gear, 24);
        leg.rotation.x = -s * 0.47;
        box(0.024, 0.014, 0.03, mat.alu, sx * 0.06, -0.028, s * 0.05, gear);
        cyl(0.0105, 0.03, mat.alu, sx * 0.06, -0.2155, s * 0.16, gear, 20).rotation.z = Math.PI / 2;
      });
      cyl(0.005, 0.36, mat.tube, 0, -0.221, s * 0.16, gear, 20).rotation.z = Math.PI / 2;
      [1, -1].forEach(function (e) {
        cyl(0.0065, 0.014, mat.plastic, e * 0.183, -0.221, s * 0.16, gear, 16).rotation.z = Math.PI / 2;
      });
    });

    // ---- payload rails (2 x Ø10 mm, 320 mm) and the package bay
    var pay = new T.Group();
    ac.add(pay);
    [1, -1].forEach(function (s) {
      cyl(0.005, 0.32, mat.tube, 0, -0.05, s * 0.055, pay, 20).rotation.z = Math.PI / 2;
      [1, -1].forEach(function (sx) { box(0.018, 0.03, 0.016, mat.plastic, sx * 0.07, -0.036, s * 0.055, pay); });
    });
    [1, -1].forEach(function (sx) {
      box(0.018, 0.006, 0.16, mat.petg, sx * 0.07, -0.178, 0, pay);
      [1, -1].forEach(function (s) {
        box(0.018, 0.13, 0.006, mat.petg, sx * 0.07, -0.115, s * 0.077, pay);
        box(0.018, 0.008, 0.022, mat.petg, sx * 0.07, -0.054, s * 0.055, pay);
      });
    });
    box(0.023, 0.012, 0.023, mat.plastic, 0.0, -0.06, 0.084, pay);
    box(0.20, 0.12, 0.15, mat.kraft, 0, -0.115, 0, pay);
    box(0.202, 0.122, 0.05, mat.tape, 0, -0.115, 0, pay);

    // ---- 6S 5200 mAh LiPo on the top plate
    box(0.155, 0.045, 0.055, mat.lipo, -0.03, 0.0545, 0, ac);
    box(0.06, 0.0452, 0.0552, mat.label, -0.045, 0.0545, 0, ac);
    [-0.085, 0.015].forEach(function (x) { box(0.02, 0.049, 0.059, mat.foam, x, 0.0545, 0, ac); });
    box(0.016, 0.016, 0.02, mat.label, 0.052, 0.045, 0.012, ac);

    // ---- Pixhawk 6C Mini on a foam pad
    box(0.042, 0.003, 0.034, mat.foam, 0.055, 0.0325, 0, ac);
    box(0.040, 0.013, 0.032, mat.alu, 0.055, 0.0405, 0, ac);
    box(0.030, 0.0006, 0.020, mat.white, 0.055, 0.0473, 0, ac);
    box(0.003, 0.0012, 0.003, mat.led, 0.070, 0.0475, 0.012, ac);

    // ---- Micro M10 GPS on a mast, rear-left
    cyl(0.003, 0.09, mat.plastic, -0.06, 0.076, 0.05, ac, 12);
    box(0.03, 0.007, 0.03, mat.plastic, -0.06, 0.1245, 0.05, ac);
    box(0.028, 0.0012, 0.028, mat.white, -0.06, 0.1286, 0.05, ac);

    // ---- RPLIDAR C1 on the centre mast
    cyl(0.005, 0.13, mat.alu, 0, 0.096, 0, ac, 16);
    cyl(0.03, 0.03, mat.plastic, 0, 0.176, 0, ac, 40);
    cyl(0.03, 0.012, mat.glass, 0, 0.197, 0, ac, 40);
    cyl(0.03, 0.005, mat.plastic, 0, 0.2055, 0, ac, 40);

    // ---- Raspberry Pi 5 between the plates, with the active cooler
    [1, -1].forEach(function (sx) {
      [1, -1].forEach(function (sz) { cyl(0.0025, 0.006, mat.steel, 0.02 + sx * 0.029, -0.016, sz * 0.0245, ac, 10); });
    });
    box(0.085, 0.0016, 0.056, mat.pcb, 0.02, -0.0122, 0, ac);
    box(0.013, 0.0155, 0.013, mat.steel, 0.061, -0.0035, 0.017, ac);
    box(0.013, 0.0155, 0.013, mat.steel, 0.061, -0.0035, 0.002, ac);
    box(0.016, 0.0135, 0.021, mat.steel, 0.061, -0.0045, -0.018, ac);
    box(0.045, 0.017, 0.038, mat.plastic, 0.01, -0.0025, 0, ac);
    cyl(0.013, 0.002, mat.alu, 0.01, 0.0065, 0, ac, 24);

    // ---- TFS20-L downward lidar under the bottom plate
    box(0.022, 0.016, 0.022, mat.plastic, 0.055, -0.03, 0.045, ac);
    [-0.005, 0.005].forEach(function (dx) { cyl(0.0035, 0.002, mat.glass, 0.055 + dx, -0.0385, 0.045, ac, 16); });

    // ---- AI Camera (IMX500) on a printed bracket and a micro servo at the nose, pitched −35°
    box(0.010, 0.045, 0.03, mat.petg, 0.085, -0.043, 0, ac);
    box(0.012, 0.022, 0.012, mat.plastic, 0.085, -0.055, 0.021, ac);
    var gimbal = new T.Group();
    gimbal.position.set(0.092, -0.055, 0);
    gimbal.rotation.z = -35 * Math.PI / 180;
    ac.add(gimbal);
    box(0.0016, 0.025, 0.024, mat.pcb, 0.004, 0, 0, gimbal);
    box(0.009, 0.009, 0.009, mat.plastic, 0.009, 0, 0, gimbal);
    cyl(0.004, 0.006, mat.glass, 0.0155, 0, 0, gimbal, 20).rotation.z = Math.PI / 2;

    // ---- ground: shadow catcher plus a soft contact gradient
    var groundY = -0.226;
    var shadowPlane = new T.Mesh(new T.PlaneGeometry(4, 4), new T.ShadowMaterial({ opacity: 0.32 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = groundY;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    var disc = new T.Mesh(new T.CircleGeometry(0.6, 64), new T.MeshBasicMaterial({ map: radialTexture(T), transparent: true, depthWrite: false, opacity: 0.55 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = groundY - 0.0005;
    scene.add(disc);

    // ---- lights
    var key = new T.DirectionalLight(0xfff3e4, 1.75);
    key.position.set(1.1, 2.0, 1.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -0.7;
    key.shadow.camera.right = 0.7;
    key.shadow.camera.top = 0.7;
    key.shadow.camera.bottom = -0.7;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 6;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.002;
    key.shadow.radius = 3;
    scene.add(key);
    scene.add(new T.HemisphereLight(0xfbf5ea, 0xd6cbb9, 0.45));
    var rim = new T.DirectionalLight(0xffffff, 0.5);
    rim.position.set(-1.6, 0.9, -1.6);
    scene.add(rim);

    // ---- orbit camera
    var st = { theta: 1.15, phi: 0.36, radius: 1.28, auto: !reduce, target: new T.Vector3(0, -0.03, 0) };
    function place() {
      st.phi = Math.max(-0.05, Math.min(1.2, st.phi));
      camera.position.set(
        st.target.x + st.radius * Math.cos(st.phi) * Math.sin(st.theta),
        st.target.y + st.radius * Math.sin(st.phi),
        st.target.z + st.radius * Math.cos(st.phi) * Math.cos(st.theta)
      );
      camera.lookAt(st.target);
    }
    var drag = null;
    function zoom(factor) { st.radius = Math.max(0.6, Math.min(3.0, st.radius * factor)); }
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY };
      st.auto = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      st.theta -= (e.clientX - drag.x) * 0.006;
      st.phi += (e.clientY - drag.y) * 0.006;
      drag = { x: e.clientX, y: e.clientY };
      invalidate();
    });
    function endDrag() { drag = null; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      st.auto = false;
      zoom(1 + e.deltaY * 0.0012);
      invalidate();
    }, { passive: false });
    // Keyboard: arrows rotate, + and - zoom, 0 resets, space toggles the slow turn.
    canvas.addEventListener('keydown', function (e) {
      var step = 0.08, handled = true;
      switch (e.key) {
        case 'ArrowLeft': st.theta += step; st.auto = false; break;
        case 'ArrowRight': st.theta -= step; st.auto = false; break;
        case 'ArrowUp': st.phi += step * 0.6; st.auto = false; break;
        case 'ArrowDown': st.phi -= step * 0.6; st.auto = false; break;
        case '+': case '=': zoom(0.9); st.auto = false; break;
        case '-': case '_': zoom(1.1); st.auto = false; break;
        case '0': st.theta = 1.15; st.phi = 0.36; st.radius = 1.28; break;
        case ' ': st.auto = !st.auto && !reduce; break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); invalidate(); }
    });

    // ---- sizing and the render loop (runs only while open and on screen)
    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return false;
      var pr = renderer.getPixelRatio();
      if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      return true;
    }
    // The loop runs only while the section is open, on screen, and either
    // auto-rotating or invalidated by input or a resize. A still view costs nothing.
    var active = false, visible = true, raf = 0, needs = true, ready = false;
    function frame() {
      raf = 0;
      if (!active || !visible) return;
      if (resize()) {
        if (st.auto) { st.theta += 0.0016; needs = true; }
        if (needs) {
          place();
          renderer.render(scene, camera);
          needs = false;
          if (!ready) { ready = true; container.classList.add('ready'); }
        }
      } else {
        needs = true;
      }
      if (st.auto || needs) kick();
    }
    function kick() { if (!raf && active && visible) raf = requestAnimationFrame(frame); }
    function invalidate() { needs = true; kick(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        invalidate();
      }).observe(container);
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(invalidate).observe(container);
    } else {
      window.addEventListener('resize', invalidate);
    }

    var api = {
      setActive: function (on) { active = !!on; invalidate(); },
      setView: function (theta, phi, radius) { st.theta = theta; st.phi = phi; st.radius = radius; st.auto = false; invalidate(); },
      getView: function () { return { theta: st.theta, phi: st.phi, radius: st.radius, auto: st.auto }; },
      renderOnce: function () { active = true; visible = true; resize(); place(); renderer.render(scene, camera); container.classList.add('ready'); }
    };
    window.droneViewer = api;
    return api;
  }

  window.initDroneViewer = initDroneViewer;
})();
