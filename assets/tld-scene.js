import * as THREE from 'three';

var canvas = document.getElementById('tld-canvas');

if (canvas) {
  try {
    boot(canvas);
  } catch (err) {
    console.warn('TLD background unavailable:', err);
    canvas.remove();
  }
}

function boot(canvas) {
  var fov = 55;
  var halfFov = THREE.MathUtils.degToRad(fov / 2);
  var tanHalf = Math.tan(halfFov);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c0e0c, 0.05);

  var camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 80);
  camera.position.set(0, 0, 10);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power'
  });
  renderer.setClearColor(0x000000, 0);

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
  var wordTints = [0xd8d2c0, 0xc9a24a, 0x9fae8e, 0xb9b2a1, 0xd0a44a];
  var wordTextures = {};
  var words = [];
  var wordsReady = false;

  var rand = mulberry32(0x5eed);
  var rafId = null;
  var paused = false;
  var last = 0;
  var elapsed = 0;

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

    var font = 'italic 400 96px "Lato", "Helvetica Neue", sans-serif';

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
        opacity: isTop ? 0.55 : 0.32,
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
    document.fonts.load('italic 400 96px "Lato"').then(addWords, addWords);
  } else {
    addWords();
  }

  function update(dt, t) {
    for (var n = 0; n < words.length; n++) {
      var w = words[n];
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

    for (var n = 0; n < words.length; n++) {
      var word = words[n];
      var maxX = word.halfH * camera.aspect * 1.15;
      if (Math.abs(word.bx) > maxX) word.bx = (rand() * 2 - 1) * maxX;
    }

    if (paused) renderer.render(scene, camera);
  }

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

function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
