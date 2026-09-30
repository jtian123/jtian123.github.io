/* Autonomous delivery drone · three.js r128
   The aircraft is drawn to scale in metres from the build's parts list and its
   current design (September 2026): Holybro X650 V2 with 15-inch props, Pixhawk
   6C Mini, Raspberry Pi 5, a Unitree L2 lidar hanging dome-down under the nose
   (21.5 cm ahead of the frame centre), the Raspberry Pi AI Camera (IMX500) on a
   pitch gimbal at the tip of a nose boom 12 cm further ahead, Benewake TFS20-L
   single beams pointing down and up, a 6S LiPo and a 1 kg package.

   Around it, an illustration of what the flight pilot reads: the camera's
   depth grid (12 x 16 cells, tinted near to far), lidar returns from the L2's
   window (straight down to 6 degrees above horizontal, all around, minus what
   the airframe blocks), and both beams. The course is shrunk to fit the stage.
   None of it is recorded data. */
(function () {
  'use strict';

  // the camera depth grid, near to far: clay, ochre, slate
  var DEPTH_NEAR = [0.851, 0.467, 0.341];
  var DEPTH_MID = [0.878, 0.643, 0.345];
  var DEPTH_FAR = [0.302, 0.478, 0.604];


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

  // Concrete pavers, 0.5 m, like the simulator's test scenes.
  function paverTexture(T, renderer) {
    var n = 256, c = document.createElement('canvas');
    c.width = c.height = n;
    var g = c.getContext('2d');
    g.fillStyle = '#bdb9b0';
    g.fillRect(0, 0, n, n);
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 2600; i++) {
      var v = 170 + Math.floor(rnd() * 36);
      g.fillStyle = 'rgba(' + v + ',' + (v - 2) + ',' + (v - 6) + ',0.55)';
      g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
    }
    g.fillStyle = 'rgba(96,90,80,0.42)';
    g.fillRect(0, 0, n, 2);
    g.fillRect(0, 0, 2, n);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(0, 2, n, 1);
    g.fillRect(2, 0, 1, n);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.encoding = T.sRGBEncoding;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  function dotTexture(T) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }

  /* A soft daylight studio baked to a PMREM, so metal and gloss have something to reflect. */
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
    panel(6, 4, 0, 5.9, 0.5, Math.PI / 2, 0, 3.0, 0xfff6ea);
    panel(3, 4, -5.9, 1.5, 1, 0, Math.PI / 2, 1.5, 0xffffff);
    panel(2, 3, 5.9, 1, -2, 0, -Math.PI / 2, 0.9, 0xfff0e0);
    panel(8, 2, 0, -5.9, 0, -Math.PI / 2, 0, 0.6, 0xe8e0d3);
    var tex = pm.fromScene(s, 0.04).texture;
    pm.dispose();
    return tex;
  }

  function initDroneViewer(container, opts) {
    if (window.droneViewer) return window.droneViewer;
    opts = opts || {};
    var T = window.THREE;
    if (!T || String(T.REVISION) !== '128') return null;
    var canvas = container.querySelector('canvas');
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    } catch (e) {
      container.classList.add('failed');
      return null;
    }
    var BG = 0xefece4;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(BG, 1);

    var scene = new T.Scene();
    scene.background = new T.Color(BG);
    scene.fog = new T.Fog(BG, 7, 16);
    scene.environment = studioEnvironment(T, renderer);

    var camera = new T.PerspectiveCamera(30, 16 / 9, 0.05, 60);

    // ---- materials
    var carbonTex = carbonTexture(T);
    carbonTex.repeat.set(20, 20);
    var tubeTex = carbonTex.clone();
    tubeTex.needsUpdate = true;
    tubeTex.repeat.set(4, 40);
    function std(o) { return new T.MeshStandardMaterial(o); }
    var mat = {
      carbon: std({ map: carbonTex, roughness: 0.36, metalness: 0.3 }),
      tube: std({ map: tubeTex, roughness: 0.36, metalness: 0.3 }),
      alu: std({ color: 0x1e2024, roughness: 0.45, metalness: 0.7 }),
      steel: std({ color: 0xc9c9c9, roughness: 0.28, metalness: 0.95 }),
      motor: std({ color: 0x1b1b1d, roughness: 0.4, metalness: 0.7 }),
      red: std({ color: 0xb8321f, roughness: 0.35, metalness: 0.6 }),
      prop: std({ color: 0x101113, roughness: 0.3, metalness: 0.35 }),
      plastic: std({ color: 0x111214, roughness: 0.55, metalness: 0.05 }),
      glass: std({ color: 0x0b0b0e, roughness: 0.06, metalness: 0.4 }),
      pcb: std({ color: 0x0e5a3c, roughness: 0.5, metalness: 0.15 }),
      petg: std({ color: 0xd9683f, roughness: 0.45, metalness: 0.0 }),
      kraft: std({ color: 0xa87c4c, roughness: 0.95, metalness: 0.0 }),
      tape: std({ color: 0xc9ad7e, roughness: 0.55, metalness: 0.0 }),
      lipo: std({ color: 0x161c26, roughness: 0.6, metalness: 0.1 }),
      label: std({ color: 0xe6b84a, roughness: 0.6, metalness: 0.0 }),
      white: std({ color: 0xe9e7e0, roughness: 0.5, metalness: 0.0 }),
      foam: std({ color: 0x2a2a2a, roughness: 1.0, metalness: 0.0 }),
      l2: std({ color: 0x24262a, roughness: 0.42, metalness: 0.55 }),
      dome: std({ color: 0x0c0d10, roughness: 0.08, metalness: 0.35 }),
      tfs: std({ color: 0x1d2a3a, roughness: 0.5, metalness: 0.3 }),
      led: std({ color: 0xff7a1a, emissive: 0xff6a00, emissiveIntensity: 0.9, roughness: 0.4 }),
      post: std({ color: 0x8d8a84, roughness: 0.75, metalness: 0.15 }),
      bark: std({ color: 0x6b5443, roughness: 0.95, metalness: 0.0 }),
      leaf: std({ color: 0x6f8a55, roughness: 0.9, metalness: 0.0, flatShading: true }),
      wall: std({ color: 0xd8d0c2, roughness: 0.92, metalness: 0.0 })
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
    function roundBox(w, h, d, r, m, parent) {
      var s = new T.Shape(), x = -w / 2, z = -d / 2;
      s.moveTo(x + r, z);
      s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r);
      s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
      s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r);
      s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
      var geo = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 6 });
      geo.rotateX(Math.PI / 2);
      geo.translate(0, h / 2, 0);
      var o = new T.Mesh(geo, m);
      o.castShadow = o.receiveShadow = true;
      parent.add(o);
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
    var discMat = new T.MeshBasicMaterial({ color: 0x1a1b1e, transparent: true, opacity: 0.0, depthWrite: false, side: T.DoubleSide });
    function makeProp() {
      var g = new T.Group();
      cyl(0.011, 0.011, mat.plastic, 0, 0, 0, g, 24);
      cyl(0.0055, 0.008, mat.red, 0, 0.0095, 0, g, 6);
      var spin = new T.Group();
      g.add(spin);
      for (var b = 0; b < 2; b++) {
        var bl = makeBlade();
        bl.rotation.y = b * Math.PI;
        spin.add(bl);
      }
      var disc = new T.Mesh(new T.RingGeometry(0.014, 0.19, 64), discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.001;
      g.add(disc);
      return { group: g, spin: spin };
    }

    // ================================================================ aircraft
    var ac = new T.Group();
    scene.add(ac);

    // centre plates (160 x 160 x 2 mm carbon), 50 mm apart
    box(0.16, 0.002, 0.16, mat.carbon, 0, 0.03, 0, ac);
    box(0.16, 0.002, 0.16, mat.carbon, 0, -0.02, 0, ac);

    // four arms at 45°, folding mounts, MN4014 motors, props
    var rotors = [];
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
      prop.group.position.set(0.325, 0.058, 0);
      prop.spin.rotation.y = i * 0.7 + 0.4;
      g.add(prop.group);
      rotors.push({ spin: prop.spin, dir: i % 2 === 0 ? 1 : -1 });
    }

    // landing gear: two skids, 215 mm tall
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

    // package bay: 20 x 15 x 12 cm under the bottom plate, on two latch rails
    [1, -1].forEach(function (s) { box(0.21, 0.008, 0.012, mat.alu, 0, -0.026, s * 0.06, ac); });
    [1, -1].forEach(function (sx) {
      box(0.018, 0.006, 0.16, mat.petg, sx * 0.07, -0.148, 0, ac);
      [1, -1].forEach(function (s) { box(0.018, 0.12, 0.006, mat.petg, sx * 0.07, -0.088, s * 0.078, ac); });
    });
    box(0.023, 0.012, 0.023, mat.plastic, 0.0, -0.036, 0.084, ac);
    box(0.20, 0.12, 0.15, mat.kraft, 0, -0.085, 0, ac);
    box(0.202, 0.122, 0.05, mat.tape, 0, -0.085, 0, ac);


    // 6S 5200 mAh LiPo on the top plate
    box(0.155, 0.045, 0.055, mat.lipo, -0.03, 0.0545, 0, ac);
    box(0.06, 0.0452, 0.0552, mat.label, -0.045, 0.0545, 0, ac);
    [-0.085, 0.015].forEach(function (x) { box(0.02, 0.049, 0.059, mat.foam, x, 0.0545, 0, ac); });

    // Pixhawk 6C Mini on a foam pad, with its status LED
    box(0.042, 0.003, 0.034, mat.foam, 0.045, 0.0325, -0.05, ac);
    box(0.040, 0.013, 0.032, mat.alu, 0.045, 0.0405, -0.05, ac);
    box(0.030, 0.0006, 0.020, mat.white, 0.045, 0.0473, -0.05, ac);
    box(0.003, 0.0012, 0.003, mat.led, 0.060, 0.0475, -0.038, ac);

    // Micro M10 GPS on a mast, rear-left
    cyl(0.003, 0.09, mat.plastic, -0.06, 0.076, 0.05, ac, 12);
    box(0.03, 0.007, 0.03, mat.plastic, -0.06, 0.1245, 0.05, ac);
    box(0.028, 0.0012, 0.028, mat.white, -0.06, 0.1286, 0.05, ac);

    // Raspberry Pi 5 between the plates, with the active cooler, and the Ethernet switch behind it
    [1, -1].forEach(function (sx) {
      [1, -1].forEach(function (sz) { cyl(0.0025, 0.006, mat.steel, 0.02 + sx * 0.029, -0.016, sz * 0.0245, ac, 10); });
    });
    box(0.085, 0.0016, 0.056, mat.pcb, 0.02, -0.0122, 0, ac);
    box(0.013, 0.0155, 0.013, mat.steel, 0.061, -0.0035, 0.017, ac);
    box(0.016, 0.0135, 0.021, mat.steel, 0.061, -0.0045, -0.018, ac);
    box(0.045, 0.017, 0.038, mat.plastic, 0.01, -0.0025, 0, ac);
    cyl(0.013, 0.002, mat.alu, 0.01, 0.0065, 0, ac, 24);

    // Unitree L2: 75 x 75 x 65 mm, hanging dome-down from a bracket under the nose.
    // Its scan centre is 21.5 cm ahead of the frame centre and 8.2 cm below it.
    var L2O = new T.Vector3(0.215, -0.082, 0);
    box(0.05, 0.03, 0.05, mat.petg, 0.215, -0.037, 0, ac);
    var l2 = new T.Group();
    l2.position.set(0.215, -0.0695, 0);
    ac.add(l2);
    roundBox(0.075, 0.04, 0.075, 0.01, mat.l2, l2).position.y = 0;
    cyl(0.0305, 0.004, mat.alu, 0, -0.022, 0, l2, 48);
    var dome = new T.Mesh(new T.SphereGeometry(0.025, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.dome);
    dome.position.y = -0.024;
    dome.castShadow = true;
    l2.add(dome);

    // nose boom from the bottom plate, above the L2's +6 degree limit, so neither sensor blocks the other
    box(0.237, 0.016, 0.016, mat.carbon, 0.2035, -0.025, 0, ac);

    // IMX500 AI Camera on a micro-servo pitch gimbal at the tip of the boom
    box(0.014, 0.024, 0.014, mat.plastic, 0.326, -0.022, 0.018, ac);
    var gimbal = new T.Group();
    gimbal.position.set(0.335, -0.03, 0);
    ac.add(gimbal);
    box(0.0016, 0.025, 0.024, mat.pcb, 0.004, 0, 0, gimbal);
    box(0.009, 0.009, 0.009, mat.plastic, 0.009, 0, 0, gimbal);
    cyl(0.004, 0.006, mat.glass, 0.0155, 0, 0, gimbal, 20).rotation.z = Math.PI / 2;

    // a camera that looks exactly where the IMX500 does (about 66 x 52 degrees, 4:3)
    var eye = new T.PerspectiveCamera(51.8, 65.8 / 51.8 * 1.0, 0.05, 20);
    eye.aspect = Math.tan(65.8 / 2 * Math.PI / 180) / Math.tan(51.8 / 2 * Math.PI / 180);
    eye.updateProjectionMatrix();
    eye.position.set(0.019, 0, 0);
    eye.rotation.y = -Math.PI / 2;
    gimbal.add(eye);

    // TFS20-L single beams: one on the belly looking down, one on the top plate looking up
    box(0.022, 0.016, 0.022, mat.tfs, 0.055, -0.03, 0.045, ac);
    [-0.005, 0.005].forEach(function (dx) { cyl(0.0035, 0.002, mat.glass, 0.055 + dx, -0.0385, 0.045, ac, 16); });
    box(0.022, 0.016, 0.022, mat.tfs, 0.055, 0.04, 0.045, ac);
    [-0.005, 0.005].forEach(function (dx) { cyl(0.0035, 0.002, mat.glass, 0.055 + dx, 0.0485, 0.045, ac, 16); });

    // Where the airframe blocks the L2 (the package bay, legs and skids), as boxes in
    // the aircraft frame: min and max corners. Rays that hit one return nothing.
    var OCC = [
      [[-0.1, -0.145, -0.075], [0.1, -0.025, 0.075]],
      [[-0.17, -0.228, 0.153], [0.17, -0.214, 0.167]],
      [[-0.17, -0.228, -0.167], [0.17, -0.214, -0.153]]
    ];
    [1, -1].forEach(function (sx) {
      [1, -1].forEach(function (s) {
        for (var k = 0; k < 3; k++) {
          var y0 = -0.0195 - 0.069 * k, y1 = y0 - 0.069, z0 = s * (0.055 + 0.035 * k), z1 = s * (0.055 + 0.035 * (k + 1));
          OCC.push([[sx * 0.06 - 0.009, y1 - 0.004, Math.min(z0, z1) - 0.009], [sx * 0.06 + 0.009, y0 + 0.004, Math.max(z0, z1) + 0.009]]);
        }
      });
    });


    // ================================================================ the course
    var HOVER = 1.25;
    var paver = paverTexture(T, renderer);
    paver.repeat.set(60, 60);
    var ground = new T.Mesh(new T.PlaneGeometry(30, 30), std({ map: paver, roughness: 0.93, metalness: 0.0, envMapIntensity: 0.35 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // a soft pool of shade that frames the scene
    (function () {
      var c = document.createElement('canvas');
      c.width = c.height = 256;
      var g2 = c.getContext('2d');
      var grd = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(70,60,48,0.16)');
      grd.addColorStop(0.55, 'rgba(70,60,48,0.07)');
      grd.addColorStop(1, 'rgba(70,60,48,0)');
      g2.fillStyle = grd;
      g2.fillRect(0, 0, 256, 256);
      var tex = new T.CanvasTexture(c);
      var pool = new T.Mesh(new T.PlaneGeometry(7, 7), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0.8, 0.0008, 0);
      scene.add(pool);
    })();

    // Posts, a tree whose crown bulges above the lidar's view, and a building corner.
    // Real legs run hundreds of metres at 5 to 40 m up; here the course is shrunk to fit.
    var posts = [
      { x: 1.6, z: -0.8, r: 0.09, h: 2.8 },
      { x: 3.6, z: -0.25, r: 0.1, h: 3.0 },
      { x: -1.2, z: -1.45, r: 0.09, h: 2.6 }
    ];
    var cylinders = [], spheres = [], boxes = [];
    posts.forEach(function (o) {
      cyl(o.r, o.h, mat.post, o.x, o.h / 2, o.z, scene, 28);
      cylinders.push({ x: o.x, z: o.z, r: o.r, y0: 0, y1: o.h });
    });
    var tree = { x: 2.5, z: 0.6 };
    cyl(0.08, 1.7, mat.bark, tree.x, 0.85, tree.z, scene, 20);
    cylinders.push({ x: tree.x, z: tree.z, r: 0.08, y0: 0, y1: 1.62 });
    var crown = new T.Mesh(new T.IcosahedronGeometry(0.5, 2), mat.leaf);
    crown.position.set(tree.x, 2.07, tree.z);
    crown.castShadow = crown.receiveShadow = true;
    scene.add(crown);
    spheres.push({ c: crown.position.clone(), r: 0.5 });
    var bld = { x: 5.4, z: -1.9, w: 1.4, h: 2.4, d: 1.2, r: -0.18 };
    var bm = box(bld.w, bld.h, bld.d, mat.wall, bld.x, bld.h / 2, bld.z);
    bm.rotation.y = bld.r;
    bm.updateMatrixWorld();
    bld.mesh = bm;
    bld.inv = new T.Matrix4().copy(bm.matrixWorld).invert();
    boxes.push(bld);


    // ================================================================ sensor layer
    var sensors = new T.Group();
    scene.add(sensors);

    // The camera's depth grid: anything the camera sees is tinted by its distance from
    // the lens, with the 12 x 16 cells the pilot reads drawn over it.
    var projUniforms = {
      uVP: { value: new T.Matrix4() },
      uLens: { value: new T.Vector3() },
      uTime: { value: 0 },
      uNear: { value: new T.Vector3(DEPTH_NEAR[0], DEPTH_NEAR[1], DEPTH_NEAR[2]) },
      uMid: { value: new T.Vector3(DEPTH_MID[0], DEPTH_MID[1], DEPTH_MID[2]) },
      uFar: { value: new T.Vector3(DEPTH_FAR[0], DEPTH_FAR[1], DEPTH_FAR[2]) }
    };
    function projMaterial(opacity) {
      return new T.ShaderMaterial({
        uniforms: {
          uVP: projUniforms.uVP,
          uLens: projUniforms.uLens,
          uTime: projUniforms.uTime,
          uNear: projUniforms.uNear,
          uMid: projUniforms.uMid,
          uFar: projUniforms.uFar,
          uOpacity: { value: opacity }
        },
        vertexShader: [
          'varying vec3 vW;',
          'void main(){',
          '  vec4 w = modelMatrix * vec4(position, 1.0);',
          '  vW = w.xyz;',
          '  gl_Position = projectionMatrix * viewMatrix * w;',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform mat4 uVP; uniform vec3 uLens; uniform vec3 uNear; uniform vec3 uMid; uniform vec3 uFar;',
          'uniform float uOpacity; uniform float uTime;',
          'varying vec3 vW;',
          'void main(){',
          '  vec4 c = uVP * vec4(vW, 1.0);',
          '  if (c.w <= 0.0) discard;',
          '  vec2 n = c.xy / c.w;',
          '  vec2 a = abs(n);',
          '  if (a.x > 1.0 || a.y > 1.0) discard;',
          '  float d = clamp((distance(vW, uLens) - 0.6) / 5.4, 0.0, 1.0);',
          '  vec3 col = d < 0.5 ? mix(uNear, uMid, d * 2.0) : mix(uMid, uFar, d * 2.0 - 1.0);',
          '  float edge = smoothstep(1.0, 0.965, max(a.x, a.y));',
          '  float sweep = fract(0.5 - 0.5 * n.y - uTime * 0.2);',
          '  float band = smoothstep(0.94, 1.0, sweep) * 0.2;',
          '  vec2 cell = abs(fract((n * 0.5 + 0.5) * vec2(16.0, 12.0) + 0.5) - 0.5);',
          '  float grid = 1.0 - smoothstep(0.0, 0.04, min(cell.x, cell.y));',
          '  float reach = 1.0 - smoothstep(4.8, 6.4, distance(vW, uLens));',
          '  float alpha = (uOpacity * edge + (band + grid * 0.2) * edge) * reach;',
          '  gl_FragColor = vec4(mix(col, vec3(1.0), max(band * 0.6, grid * 0.5)), alpha);',
          '}'
        ].join('\n'),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });
    }
    var groundTint = new T.Mesh(new T.PlaneGeometry(14, 14), projMaterial(0.3));
    groundTint.rotation.x = -Math.PI / 2;
    groundTint.position.set(3, 0.0015, 0);
    groundTint.renderOrder = 1;
    sensors.add(groundTint);
    var obstTint = projMaterial(0.55);
    cylinders.forEach(function (o) {
      var m = new T.Mesh(new T.CylinderGeometry(o.r * 1.04, o.r * 1.04, o.y1 - o.y0 + 0.004, 28, 1, true), obstTint);
      m.position.set(o.x, (o.y0 + o.y1) / 2, o.z);
      sensors.add(m);
    });
    spheres.forEach(function (o) {
      var m = new T.Mesh(new T.IcosahedronGeometry(o.r * 1.03, 2), obstTint);
      m.position.copy(o.c);
      sensors.add(m);
    });
    boxes.forEach(function (o) {
      var m = new T.Mesh(new T.BoxGeometry(o.w * 1.01, o.h * 1.01, o.d * 1.01), obstTint);
      m.position.copy(o.mesh.position);
      m.rotation.copy(o.mesh.rotation);
      sensors.add(m);
    });

    // camera frustum: four edges from the lens and the footprint outline
    var frPos = new Float32Array(8 * 2 * 3);
    var frGeo = new T.BufferGeometry();
    frGeo.setAttribute('position', new T.BufferAttribute(frPos, 3));
    var frustum = new T.LineSegments(frGeo, new T.LineBasicMaterial({ color: 0xa4553a, transparent: true, opacity: 0.55 }));
    frustum.frustumCulled = false;
    sensors.add(frustum);
    var fanPos = new Float32Array(4 * 3 * 3);
    var fanGeo = new T.BufferGeometry();
    fanGeo.setAttribute('position', new T.BufferAttribute(fanPos, 3));
    var fan = new T.Mesh(fanGeo, new T.MeshBasicMaterial({ color: 0xc27350, transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false }));
    fan.frustumCulled = false;
    sensors.add(fan);

    // lidar returns: a rolling buffer re-sampled every frame, each point fading with age
    var NPTS = 16000;
    var ptPos = new Float32Array(NPTS * 3);
    var ptCol = new Float32Array(NPTS * 3);
    var ptBirth = new Float32Array(NPTS);
    var ptFade = new Float32Array(NPTS);
    for (var q = 0; q < NPTS; q++) ptBirth[q] = -100;
    var ptGeo = new T.BufferGeometry();
    ptGeo.setAttribute('position', new T.BufferAttribute(ptPos, 3));
    ptGeo.setAttribute('color', new T.BufferAttribute(ptCol, 3));
    ptGeo.setAttribute('birth', new T.BufferAttribute(ptBirth, 1));
    ptGeo.setAttribute('fade', new T.BufferAttribute(ptFade, 1));
    var ptUniforms = {
      uTime: { value: 0 },
      uLife: { value: 2.0 },
      uSize: { value: 0.0105 },
      uScale: { value: 500 },
      uMap: { value: dotTexture(T) }
    };
    var ptMat = new T.ShaderMaterial({
      uniforms: ptUniforms,
      vertexShader: [
        'attribute float birth; attribute float fade; attribute vec3 color;',
        'uniform float uTime; uniform float uLife; uniform float uSize; uniform float uScale;',
        'varying vec3 vC; varying float vA;',
        'void main(){',
        '  vC = color;',
        '  float age = uTime - birth;',
        '  vA = clamp(1.0 - age / uLife, 0.0, 1.0);',
        '  vA = vA * vA * (3.0 - 2.0 * vA) * fade;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = max(1.5, uSize * uScale / -mv.z) * (0.55 + 0.45 * vA);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap; varying vec3 vC; varying float vA;',
        'void main(){',
        '  float m = texture2D(uMap, gl_PointCoord).a;',
        '  float a = m * vA;',
        '  if (a < 0.02) discard;',
        '  gl_FragColor = vec4(vC, a);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false
    });
    var points = new T.Points(ptGeo, ptMat);
    points.renderOrder = 4;
    points.frustumCulled = false;
    sensors.add(points);

    // downward and upward single beams
    var beamMat = new T.MeshBasicMaterial({ color: 0xe8542f, transparent: true, opacity: 0.85 });
    var beamDown = new T.Mesh(new T.CylinderGeometry(0.0018, 0.0018, 1, 8), beamMat);
    sensors.add(beamDown);
    var beamUp = new T.Mesh(new T.CylinderGeometry(0.0014, 0.0014, 1, 8), new T.MeshBasicMaterial({ color: 0xe8542f, transparent: true, opacity: 0.45 }));
    sensors.add(beamUp);
    var spotTex = dotTexture(T);
    var spot = new T.Sprite(new T.SpriteMaterial({ map: spotTex, color: 0xff5a2a, transparent: true, depthWrite: false }));
    spot.scale.set(0.05, 0.05, 1);
    sensors.add(spot);


    // ================================================================ lights
    var key = new T.DirectionalLight(0xfff3e4, 1.8);
    key.position.set(2.6, 6.5, 3.2);
    key.target.position.set(1.6, 0, 0);
    scene.add(key.target);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -4.5;
    key.shadow.camera.right = 4.5;
    key.shadow.camera.top = 4.5;
    key.shadow.camera.bottom = -4.5;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 14;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.01;
    key.shadow.radius = 4;
    scene.add(key);
    scene.add(new T.HemisphereLight(0xfbf5ea, 0xcfc6b6, 0.5));
    var rim = new T.DirectionalLight(0xffffff, 0.45);
    rim.position.set(-2, 1.5, -2);
    scene.add(rim);


    // ================================================================ simulation of the sensors
    var tmpV = new T.Vector3(), tmpD = new T.Vector3(), tmpO = new T.Vector3();
    var lo = new T.Vector3(), ld = new T.Vector3();
    // mulberry32: small, fast and free of the lattice patterns a plain LCG draws on the ground
    var seed = 0x2f6b1d3;
    function rnd() {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // ray vs axis-aligned box given as [min, max] corners (slab test)
    function hitAabb(bx, o, d) {
      var tmin = -Infinity, tmax = Infinity;
      var ox = [o.x, o.y, o.z], dx = [d.x, d.y, d.z];
      for (var k = 0; k < 3; k++) {
        var lo0 = bx[0][k], hi0 = bx[1][k];
        if (Math.abs(dx[k]) < 1e-9) { if (ox[k] < lo0 || ox[k] > hi0) return Infinity; continue; }
        var t1 = (lo0 - ox[k]) / dx[k], t2 = (hi0 - ox[k]) / dx[k];
        if (t1 > t2) { var tt = t1; t1 = t2; t2 = tt; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return Infinity;
      }
      return tmin > 0 ? tmin : Infinity;
    }
    // ray vs rotated box (in the box's own frame)
    function hitBox(o, origin, dir) {
      lo.copy(origin).applyMatrix4(o.inv);
      ld.copy(dir).transformDirection(o.inv);
      return hitAabb([[-o.w / 2, -o.h / 2, -o.d / 2], [o.w / 2, o.h / 2, o.d / 2]], lo, ld);
    }
    // ray vs upright cylinder (side only)
    function hitCyl(c, o, d) {
      var a = d.x * d.x + d.z * d.z;
      if (a < 1e-9) return Infinity;
      var px = o.x - c.x, pz = o.z - c.z;
      var b = 2 * (px * d.x + pz * d.z), cc = px * px + pz * pz - c.r * c.r;
      var disc = b * b - 4 * a * cc;
      if (disc < 0) return Infinity;
      var t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t <= 0) return Infinity;
      var y = o.y + t * d.y;
      return y >= c.y0 && y <= c.y1 ? t : Infinity;
    }
    function hitSphere(s, o, d) {
      var px = o.x - s.c.x, py = o.y - s.c.y, pz = o.z - s.c.z;
      var b = px * d.x + py * d.y + pz * d.z, cc = px * px + py * py + pz * pz - s.r * s.r;
      var disc = b * b - cc;
      if (disc < 0) return Infinity;
      var t = -b - Math.sqrt(disc);
      return t > 0 ? t : Infinity;
    }

    var RANGE = 5.0;
    var l2World = new T.Vector3(), acInv = new T.Quaternion(), dLocal = new T.Vector3();
    var cursor = 0;
    // The L2 hangs dome-down: its window runs from straight down (-90) to 6 degrees above
    // horizontal, all around. Nothing above that is measured, however close.
    function scan(count, now) {
      l2World.copy(L2O);
      ac.localToWorld(l2World);
      acInv.copy(ac.quaternion).invert();
      for (var k = 0; k < count; k++) {
        var tries = 0, t = Infinity, hitObst = false, blocked = false;
        while (tries++ < 6) {
          var az = rnd() * Math.PI * 2;
          var el = (-90 + rnd() * 96) * Math.PI / 180;
          tmpD.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
          // the airframe's own shadow: no return, which the pilot treats as unknown
          dLocal.copy(tmpD).applyQuaternion(acInv);
          blocked = false;
          for (var q = 0; q < OCC.length; q++) {
            if (hitAabb(OCC[q], L2O, dLocal) < 0.6) { blocked = true; break; }
          }
          if (blocked) continue;
          t = Infinity; hitObst = false;
          if (tmpD.y < -1e-4) t = -l2World.y / tmpD.y;
          var tb, b;
          for (b = 0; b < cylinders.length; b++) { tb = hitCyl(cylinders[b], l2World, tmpD); if (tb < t) { t = tb; hitObst = true; } }
          for (b = 0; b < spheres.length; b++) { tb = hitSphere(spheres[b], l2World, tmpD); if (tb < t) { t = tb; hitObst = true; } }
          for (b = 0; b < boxes.length; b++) { tb = hitBox(boxes[b], l2World, tmpD); if (tb < t) { t = tb; hitObst = true; } }
          if (t < RANGE) break;
        }
        if (blocked || t >= RANGE) continue;
        tmpV.copy(l2World).addScaledVector(tmpD, t);
        var j = cursor * 3;
        ptPos[j] = tmpV.x; ptPos[j + 1] = tmpV.y + (hitObst ? 0 : 0.004); ptPos[j + 2] = tmpV.z;
        if (hitObst) {
          ptCol[j] = 0.0; ptCol[j + 1] = 0.47; ptCol[j + 2] = 0.47;
        } else {
          var f = Math.min(1, t / RANGE);
          ptCol[j] = 0.02 + 0.12 * f; ptCol[j + 1] = 0.50 - 0.18 * f; ptCol[j + 2] = 0.50 + 0.22 * f;
        }
        ptBirth[cursor] = now - (now < 0 ? 0 : rnd() * 0.05);
        ptFade[cursor] = hitObst ? 1 : Math.max(0.15, 1 - Math.pow(t / RANGE, 1.6));
        cursor = (cursor + 1) % NPTS;
      }
      ptGeo.attributes.position.needsUpdate = true;
      ptGeo.attributes.color.needsUpdate = true;
      ptGeo.attributes.birth.needsUpdate = true;
      ptGeo.attributes.fade.needsUpdate = true;
    }

    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    var lens = new T.Vector3(), cw = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()];
    var vp = new T.Matrix4();
    function updateCameraFootprint() {
      eye.updateMatrixWorld(true);
      eye.getWorldPosition(lens);
      vp.multiplyMatrices(eye.projectionMatrix, eye.matrixWorldInverse);
      projUniforms.uVP.value.copy(vp);
      projUniforms.uLens.value.copy(lens);
      for (var k = 0; k < 4; k++) {
        tmpV.set(corners[k][0], corners[k][1], 0.5).unproject(eye);
        tmpD.copy(tmpV).sub(lens).normalize();
        var t = tmpD.y < -1e-3 ? Math.min(-lens.y / tmpD.y, 4.2) : 4.2;
        cw[k].copy(lens).addScaledVector(tmpD, t);
      }
      var p = 0;
      for (k = 0; k < 4; k++) {
        frPos[p++] = lens.x; frPos[p++] = lens.y; frPos[p++] = lens.z;
        frPos[p++] = cw[k].x; frPos[p++] = cw[k].y + 0.003; frPos[p++] = cw[k].z;
      }
      for (k = 0; k < 4; k++) {
        var n = cw[(k + 1) % 4];
        frPos[p++] = cw[k].x; frPos[p++] = cw[k].y + 0.003; frPos[p++] = cw[k].z;
        frPos[p++] = n.x; frPos[p++] = n.y + 0.003; frPos[p++] = n.z;
      }
      frGeo.attributes.position.needsUpdate = true;
      p = 0;
      for (k = 0; k < 4; k++) {
        var m = cw[(k + 1) % 4];
        fanPos[p++] = lens.x; fanPos[p++] = lens.y; fanPos[p++] = lens.z;
        fanPos[p++] = cw[k].x; fanPos[p++] = cw[k].y; fanPos[p++] = cw[k].z;
        fanPos[p++] = m.x; fanPos[p++] = m.y; fanPos[p++] = m.z;
      }
      fanGeo.attributes.position.needsUpdate = true;
    }

    var tfsDown = new T.Vector3(0.055, -0.04, 0.045), tfsUp = new T.Vector3(0.055, 0.049, 0.045);
    function updateBeams() {
      tmpO.copy(tfsDown);
      ac.localToWorld(tmpO);
      var len = tmpO.y;
      beamDown.scale.set(1, len, 1);
      beamDown.position.set(tmpO.x, len / 2, tmpO.z);
      spot.position.set(tmpO.x, 0.006, tmpO.z);
      tmpO.copy(tfsUp);
      ac.localToWorld(tmpO);
      beamUp.scale.set(1, 0.7, 1);
      beamUp.position.set(tmpO.x, tmpO.y + 0.35, tmpO.z);
    }


    // ================================================================ state + animation
    var st = {
      sensors: opts.sensors !== false,
      rotors: !reduce && opts.rotors !== false,
      theta: -0.62, phi: 0.22, radius: 6.4,
      target: new T.Vector3(1.8, 1.15, 0),
      auto: !reduce
    };
    var HOME = { theta: st.theta, phi: st.phi, radius: st.radius, target: st.target.clone() };
    if (opts.view) setViewRaw(opts.view);
    var clock = 0, spinRate = st.rotors ? 1 : 0, lastT = 0, fixedTime = null;

    function setViewRaw(v) {
      if (v.theta != null) st.theta = v.theta;
      if (v.phi != null) st.phi = v.phi;
      if (v.radius != null) st.radius = v.radius;
      if (v.target) st.target.set(v.target[0], v.target[1], v.target[2]);
    }

    function place() {
      st.phi = Math.max(0.03, Math.min(1.35, st.phi));
      camera.position.set(
        st.target.x + st.radius * Math.cos(st.phi) * Math.sin(st.theta),
        st.target.y + st.radius * Math.sin(st.phi),
        st.target.z + st.radius * Math.cos(st.phi) * Math.cos(st.theta)
      );
      camera.lookAt(st.target);
    }

    function pose(t) {
      ac.position.set(0, HOVER + 0.014 * Math.sin(t * 1.7), 0);
      ac.rotation.set(0.012 * Math.sin(t * 1.3 + 1.0), 0, 0.01 * Math.sin(t * 1.1));
      // in flight the camera is held 5 degrees below the horizon
      gimbal.rotation.z = -5 * Math.PI / 180;
      ac.updateMatrixWorld(true);
    }

    function step(dt) {
      clock += dt;
      var target = st.rotors ? 1 : 0;
      spinRate += (target - spinRate) * Math.min(1, dt * 2.2);
      rotors.forEach(function (r) { r.spin.rotation.y += r.dir * spinRate * 38 * dt; });
      discMat.opacity = 0.085 * spinRate;
      pose(clock);
      projUniforms.uTime.value = clock;
      ptUniforms.uTime.value = clock;
      if (st.sensors) {
        updateCameraFootprint();
        updateBeams();
        scan(Math.round(NPTS * dt / ptUniforms.uLife.value), clock);
      }
    }

    // pre-fill so the first frame already shows a scan
    function prefill() {
      pose(clock);
      updateCameraFootprint();
      updateBeams();
      var saveLife = ptUniforms.uLife.value;
      for (var k = 0; k < NPTS; k++) {
        scan(1, clock - rnd() * saveLife * 0.95);
      }
    }
    prefill();
    if (!st.rotors) discMat.opacity = 0;


    // ================================================================ input
    var drag = null, hintTimer = 0;
    function zoom(factor) { st.radius = Math.max(1.4, Math.min(11, st.radius * factor)); }
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
      st.auto = false;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      st.theta -= (e.clientX - drag.x) * 0.006;
      if (!drag.touch) st.phi += (e.clientY - drag.y) * 0.005;
      drag.x = e.clientX;
      drag.y = e.clientY;
      invalidate();
    });
    function endDrag() { drag = null; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    // Scroll keeps scrolling the page; ⌘/Ctrl + scroll (and trackpad pinch) zooms.
    canvas.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) {
        container.classList.add('toast');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(function () { container.classList.remove('toast'); }, 1100);
        return;
      }
      e.preventDefault();
      st.auto = false;
      zoom(1 + Math.max(-60, Math.min(60, e.deltaY)) * 0.006);
      invalidate();
    }, { passive: false });
    canvas.addEventListener('keydown', function (e) {
      var s = 0.08, handled = true;
      switch (e.key) {
        case 'ArrowLeft': st.theta += s; st.auto = false; break;
        case 'ArrowRight': st.theta -= s; st.auto = false; break;
        case 'ArrowUp': st.phi += s * 0.6; st.auto = false; break;
        case 'ArrowDown': st.phi -= s * 0.6; st.auto = false; break;
        case '+': case '=': zoom(0.9); st.auto = false; break;
        case '-': case '_': zoom(1.1); st.auto = false; break;
        case '0': api.resetView(); break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); invalidate(); }
    });

    // ================================================================ loop
    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return false;
      var pr = renderer.getPixelRatio();
      if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // keep at least ~48 degrees across, so tall (phone) stages still show the drone and the course
        camera.fov = Math.max(30, 2 * Math.atan(Math.tan(24 * Math.PI / 180) / (w / h)) * 180 / Math.PI);
        camera.updateProjectionMatrix();
        ptUniforms.uScale.value = h * pr / (2 * Math.tan(camera.fov * Math.PI / 360));
      }
      return true;
    }
    var active = false, visible = true, raf = 0, needs = true, ready = false;
    function frame(ts) {
      raf = 0;
      if (!active || !visible) return;
      var t = ts / 1000, dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
      lastT = t;
      if (resize()) {
        var animating = !reduce && fixedTime === null;
        if (animating) {
          if (st.auto) st.theta += dt * 0.045;
          step(dt);
        }
        if (animating || needs) {
          place();
          renderer.render(scene, camera);
          needs = false;
          if (!ready) { ready = true; container.classList.add('ready'); }
        }
      } else {
        needs = true;
      }
      if ((!reduce && fixedTime === null) || needs) kick();
    }
    function kick() { if (!raf && active && visible) raf = requestAnimationFrame(frame); }
    function invalidate() { needs = true; kick(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        lastT = 0;
        invalidate();
      }).observe(container);
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(invalidate).observe(container);
    } else {
      window.addEventListener('resize', invalidate);
    }

    function applySensors() {
      sensors.visible = st.sensors;
    }
    applySensors();

    var api = {
      setActive: function (on) { active = !!on; lastT = 0; invalidate(); },
      setSensors: function (on) {
        st.sensors = !!on;
        applySensors();
        if (st.sensors) { updateCameraFootprint(); updateBeams(); }
        invalidate();
      },
      setRotors: function (on) { st.rotors = !!on && !reduce; if (reduce) discMat.opacity = 0; invalidate(); },
      resetView: function () {
        st.theta = HOME.theta; st.phi = HOME.phi; st.radius = HOME.radius; st.target.copy(HOME.target);
        st.auto = !reduce;
        invalidate();
      },
      setView: function (theta, phi, radius, target) {
        setViewRaw({ theta: theta, phi: phi, radius: radius, target: target });
        st.auto = false;
        invalidate();
      },
      getView: function () { return { theta: st.theta, phi: st.phi, radius: st.radius, target: st.target.toArray(), auto: st.auto }; },
      // deterministic still, for posters: advance the simulation to time t and draw once
      renderAt: function (t, steps) {
        fixedTime = t;
        st.auto = false;
        var n = steps || 90, dt = t / n;
        clock = 0;
        for (var k = 0; k < n; k++) step(dt);
        resize();
        place();
        renderer.render(scene, camera);
        container.classList.add('ready');
      }
    };
    window.droneViewer = api;
    return api;
  }

  window.initDroneViewer = initDroneViewer;
})();