import * as THREE from 'three';

var canvas = document.getElementById('leaf-canvas');

if (canvas) {
  try {
    boot(canvas);
  } catch (err) {
    console.warn('Leaf background unavailable:', err);
    canvas.remove();
  }
}

function boot(canvas) {
  var fov = 55;
  var halfFov = THREE.MathUtils.degToRad(fov / 2);
  var tanHalf = Math.tan(halfFov);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf4f1e8, 0.058);

  var camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 80);
  camera.position.set(0, 0, 10);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power'
  });
  renderer.setClearColor(0x000000, 0);

  var material = new THREE.MeshBasicMaterial({
    map: makeLeafTexture(renderer),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.78,
    toneMapped: false
  });

  var count = window.innerWidth < 720 ? 56 : 120;
  var geometry = new THREE.PlaneGeometry(1, 1.45);
  var mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);

  var rand = mulberry32(0x5eed);
  var palette = [0x6f7f63, 0x9a7529, 0x8f5a3a, 0x5d6b55, 0x8a6a45];
  var dummy = new THREE.Object3D();
  var tint = new THREE.Color();
  var leaves = [];
  var words = [];
  var wordsReady = false;
  var topTlds = ['.com', '.ai', '.si', '.io', '.co', '.xyz', '.net'];
  var tlds = [
    '.com', '.com', '.com',
    '.ai', '.ai', '.ai',
    '.si', '.si',
    '.io', '.io',
    '.co', '.co',
    '.xyz', '.xyz',
    '.net', '.net',
    '.org', '.app', '.dev', '.tech', '.store', '.online',
    '.studio', '.vc', '.gov', '.cloud', '.global'
  ];
  var wordTints = [0x7c5c1a, 0x5d6b55, 0x8a6a45, 0x63695e];
  var wordTextures = {};
  var i;

  function seed(leaf) {
    leaf.z = 4 - rand() * 16;
    leaf.halfH = tanHalf * (camera.position.z - leaf.z);
    leaf.limitY = leaf.halfH * 1.15;
    leaf.bx = (rand() * 2 - 1) * leaf.halfH * camera.aspect * 1.15;
    leaf.y = (rand() * 2 - 1) * leaf.limitY;
    leaf.s = 0.26 + rand() * 0.55;
    leaf.vy = 0.24 + rand() * 0.42;
    leaf.sway = 0.25 + rand() * 0.75;
    leaf.freq = 0.35 + rand() * 0.75;
    leaf.phase = rand() * Math.PI * 2;
    leaf.rx = (rand() - 0.5) * 1.1;
    leaf.ry = (rand() - 0.5) * 1.2;
    leaf.rz = (rand() - 0.5) * 0.7;
    leaf.ax = rand() * Math.PI * 2;
    leaf.ay = rand() * Math.PI * 2;
    leaf.az = rand() * Math.PI * 2;
  }

  function reset(leaf) {
    seed(leaf);
    leaf.y = leaf.limitY;
  }

  function seedWord(word) {
    word.z = 3 - rand() * 15;
    word.halfH = tanHalf * (camera.position.z - word.z);
    word.limitY = word.halfH * 1.2;
    word.bx = (rand() * 2 - 1) * word.halfH * camera.aspect * 1.15;
    word.y = (rand() * 2 - 1) * word.limitY;
    word.vy = 0.1 + rand() * 0.2;
    word.sway = 0.4 + rand() * 1.2;
    word.freq = 0.15 + rand() * 0.35;
    word.phase = rand() * Math.PI * 2;
    word.tilt = (rand() - 0.5) * 0.3;
    word.tiltFreq = 0.2 + rand() * 0.3;
  }

  function addWords() {
    if (wordsReady) return;
    wordsReady = true;

    var font = 'italic 300 96px "Fraunces", Georgia, serif';

    for (var n = 0; n < tlds.length; n++) {
      var tld = tlds[n];
      var isTop = topTlds.indexOf(tld) !== -1;

      if (!wordTextures[tld]) {
        wordTextures[tld] = makeWordTexture(tld, font, renderer);
      }

      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: wordTextures[tld],
        transparent: true,
        depthWrite: false,
        opacity: isTop ? 0.62 : 0.4,
        color: wordTints[n % wordTints.length],
        toneMapped: false
      }));

      var height = isTop ? 0.55 + rand() * 0.45 : 0.4 + rand() * 0.35;
      var aspect = wordTextures[tld].image.width / wordTextures[tld].image.height;
      sprite.scale.set(height * aspect, height, 1);

      var word = { sprite: sprite };
      seedWord(word);
      sprite.position.set(word.bx, word.y, word.z);
      sprite.material.rotation = word.tilt;
      scene.add(sprite);
      words.push(word);
    }

    if (paused) renderer.render(scene, camera);
  }

  if (document.fonts && typeof document.fonts.load === 'function') {
    document.fonts.load('italic 300 96px "Fraunces"').then(addWords, addWords);
  } else {
    addWords();
  }

  for (i = 0; i < count; i++) {
    var leaf = {};
    seed(leaf);
    leaves.push(leaf);
    tint.setHex(palette[(rand() * palette.length) | 0]);
    mesh.setColorAt(i, tint);
  }
  mesh.instanceColor.needsUpdate = true;

  function writeMatrices(t) {
    for (var n = 0; n < count; n++) {
      var l = leaves[n];
      dummy.position.set(l.bx + Math.sin(t * l.freq + l.phase) * l.sway, l.y, l.z);
      dummy.rotation.set(l.ax + t * l.rx, l.ay + t * l.ry, l.az + t * l.rz);
      dummy.scale.setScalar(l.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function update(dt, t) {
    for (var n = 0; n < count; n++) {
      var l = leaves[n];
      l.y -= l.vy * dt;
      if (l.y < -l.limitY) reset(l);
    }
    writeMatrices(t);

    for (var m = 0; m < words.length; m++) {
      var w = words[m];
      w.y -= w.vy * dt;
      if (w.y < -w.limitY) {
        seedWord(w);
        w.y = w.limitY;
      }
      w.sprite.position.set(w.bx + Math.sin(t * w.freq + w.phase) * w.sway, w.y, w.z);
      w.sprite.material.rotation = w.tilt + Math.sin(t * w.tiltFreq + w.phase) * 0.08;
    }
  }

  function onResize() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 720 ? 1.6 : 2));
    renderer.setSize(w, h, false);

    for (var n = 0; n < leaves.length; n++) {
      var l = leaves[n];
      var maxX = l.halfH * camera.aspect * 1.15;
      if (Math.abs(l.bx) > maxX) l.bx = (rand() * 2 - 1) * maxX;
    }

    for (var m = 0; m < words.length; m++) {
      var w = words[m];
      var wordMaxX = w.halfH * camera.aspect * 1.15;
      if (Math.abs(w.bx) > wordMaxX) w.bx = (rand() * 2 - 1) * wordMaxX;
    }

    if (paused) renderer.render(scene, camera);
  }

  var rafId = null;
  var paused = false;
  var last = 0;
  var elapsed = 0;

  function frame(now) {
    if (rafId === null) return;
    rafId = requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    update(dt, elapsed);
    renderer.render(scene, camera);
  }

  function start() {
    if (rafId !== null || paused) return;
    last = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  window.addEventListener('resize', onResize, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!paused) start();
  });

  onResize();
  writeMatrices(0);
  renderer.render(scene, camera);
  start();

  var toggle = document.querySelector('.motion-toggle');
  if (toggle) {
    toggle.hidden = false;

    var syncToggle = function () {
      toggle.textContent = paused ? 'Motion: off' : 'Motion: on';
      toggle.setAttribute('aria-pressed', String(!paused));
    };

    toggle.addEventListener('click', function () {
      paused = !paused;
      if (paused) {
        stop();
        renderer.render(scene, camera);
      } else {
        start();
      }
      syncToggle();
    });

    syncToggle();
  }
}

function makeWordTexture(text, font, renderer) {
  var fontSize = 96;
  var pad = 24;
  var measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  var width = Math.ceil(measure.measureText(text).width) + pad * 2;
  var height = Math.ceil(fontSize * 1.5);
  var c = document.createElement('canvas');
  c.width = width * 2;
  c.height = height * 2;

  var g = c.getContext('2d');
  g.scale(2, 2);
  g.font = font;
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, width / 2, height / 2);

  var texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeLeafTexture(renderer) {
  var size = 128;
  var c = document.createElement('canvas');
  c.width = c.height = size;
  var g = c.getContext('2d');
  g.translate(size / 2, size / 2);

  var path = new Path2D();
  path.moveTo(0, -56);
  path.bezierCurveTo(24, -38, 34, -8, 21, 24);
  path.bezierCurveTo(14, 43, 5, 53, 0, 58);
  path.bezierCurveTo(-5, 53, -14, 43, -21, 24);
  path.bezierCurveTo(-34, -8, -24, -38, 0, -56);
  path.closePath();

  var fill = g.createLinearGradient(0, -56, 0, 58);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.45, '#f3efe3');
  fill.addColorStop(1, '#cfc6ac');
  g.fillStyle = fill;
  g.fill(path);

  g.strokeStyle = 'rgba(48, 44, 32, 0.3)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, -50);
  g.lineTo(0, 53);
  g.stroke();

  g.lineWidth = 1;
  g.beginPath();
  for (var n = 0; n < 5; n++) {
    var y = -30 + n * 16;
    g.moveTo(0, y);
    g.lineTo(10, y + 9);
    g.moveTo(0, y);
    g.lineTo(-10, y + 9);
  }
  g.stroke();

  var texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
