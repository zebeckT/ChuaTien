/**
 * CHÙA TIÊN (CHUA TIEN) - PHÒNG LỄ PHẬT TRỰC TUYẾN
 * Interactive 3D Devotees (Three.js) & Stream Mechanics
 */

(function () {
  'use strict';

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const state = {
    candles: {
      current: 56,
      target: 3000
    },
    hearts: {
      current: 695,
      target: 1000,
      userTaps: 25
    },
    timer: {
      minutes: 2,
      seconds: 11
    },
    audio: {
      ctx: null,
      enabled: true
    },
    particles: [],
    selectedGift: null,
    three: {
      scene: null,
      camera: null,
      renderer: null,
      devotees: [],
      raycaster: null,
      mouse: null,
      container: null
    }
  };

  // Preset stream simulated events list
  const STREAM_EVENTS = [
    { type: 'checkin', text: 'Điểm danh' },
    { type: 'user', name: 'Alo', badge: '🌸 Hạng 1', text: 'Điểm danh' },
    { type: 'checkin', text: 'Điểm danh' },
    { type: 'bubble', name: 'bubu', text: 'điểm danh' },
    { type: 'join', prefix: '🔷 15', name: 'jonathan nguyen đã tham gia' },
    { type: 'join', prefix: '🙏 7', name: '🧑‍🍼 Mẹ Đơn Thân 👉 92 đã tham gia' },
    { type: 'streak', text: 'Gõ điểm danh mỗi ngày giữ chuỗi 🔥' },
    { type: 'bubble', name: 'Lan Anh', text: 'Nam mô A Di Đà Phật 🙏' },
    { type: 'user', name: 'THU TH...', badge: '⭐ 2', text: 'Cầu an cho gia đạo 🪷' },
    { type: 'bubble', name: 'Quốc Bảo', text: 'Điện Phật trang nghiêm quá' }
  ];

  // Devotees 3D specification (14 Buddhist practitioners on cushions)
  const DEVOTEES_CONFIG = [
    // Center devotee kneeling before altar
    { id: 'linh', name: 'Linh', badge: '🧘', x: 0, z: -2.0, robe: 0xf59e0b, halo: true, tagClass: 'altar-tag' },
    
    // Left row (close to far)
    { id: 'alo', name: 'Alo', badge: '🌸 Hạng 1', x: -1.05, z: -1.2, robe: 0xd1d5db, halo: true },
    { id: 'cá_voii', name: 'Cá_voii_ 🐳', badge: '🔥 3', x: -1.8, z: -0.9, robe: 0xb0bec5 },
    { id: 'kim', name: 'KimNhung ୨୧', badge: '✨ 1', x: -1.15, z: 0.1, robe: 0xf8fafc },
    { id: 'you', name: 'Bạn (Minh Anh)', badge: '★', x: -1.9, z: 0.35, robe: 0xe65100, halo: true },
    { id: 'phuc', name: 'Phúc An', badge: '🙏', x: -1.25, z: 1.4, robe: 0xd1d5db },
    { id: 'tuan', name: 'Tuấn Đạo Hữu', badge: '🌿', x: -2.0, z: 1.65, robe: 0xb0bec5 },
    { id: 'binh', name: 'Bình An', badge: '🪷', x: -1.35, z: 2.6, robe: 0xf8fafc },

    // Right row (close to far)
    { id: 'thu', name: 'THU TH...', badge: '🌸', x: 1.05, z: -1.2, robe: 0xf8fafc },
    { id: 'saa', name: 'Saa 👑', badge: '🔥 2', x: 1.8, z: -0.9, robe: 0xd97706, halo: true },
    { id: 'risu', name: 'Ri Su', badge: '🪷', x: 1.15, z: 0.1, robe: 0xd1d5db },
    { id: 'huuti', name: 'huuti...', badge: '1', x: 1.9, z: 0.35, robe: 0xb0bec5 },
    { id: 'duc', name: 'Đức Trí', badge: '✨', x: 1.25, z: 1.4, robe: 0xf8fafc },
    { id: 'thao', name: 'Thu Thảo', badge: '🌿', x: 2.0, z: 1.65, robe: 0xd1d5db },
    { id: 'mai', name: 'Diệu Mai', badge: '🙏', x: 1.35, z: 2.6, robe: 0xb0bec5 }
  ];

  // ==========================================================================
  // DOM REFERENCES
  // ==========================================================================
  const canvas = document.getElementById('effects-canvas');
  const ctx = canvas.getContext('2d');
  const timerDisplay = document.getElementById('timer-display');
  const candleCurrent = document.getElementById('candle-current');
  const candleProgressBar = document.getElementById('candle-progress-bar');
  const candleSubText = document.getElementById('candle-sub-text');
  const heartsCountText = document.getElementById('hearts-count-text');
  const heartsProgressBar = document.getElementById('hearts-progress-bar');
  const heartBottomCount = document.getElementById('heart-bottom-count');
  const eventsStream = document.getElementById('events-stream');
  const floatingHeartsContainer = document.getElementById('floating-hearts-container');
  const quickInputForm = document.getElementById('quick-input-form');
  const streamInput = document.getElementById('stream-input');
  const shareToast = document.getElementById('share-toast');
  const toastUsername = document.getElementById('toast-username');

  // Buttons
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const btnLikeHeart = document.getElementById('btn-like-heart');
  const btnQuickGomo = document.getElementById('btn-quick-gomo');
  const btnRoseQuick = document.getElementById('btn-rose-quick');
  const btnQuickEmoji = document.getElementById('btn-quick-emoji');
  const btnOpenGiftModal = document.getElementById('btn-open-gift-modal');
  const modalGifts = document.getElementById('modal-gifts');
  const btnCloseGifts = document.getElementById('btn-close-gifts');
  const btnConfirmGift = document.getElementById('btn-confirm-gift');

  // Offering Stack Buttons
  const btnGiftRose = document.getElementById('btn-gift-rose');
  const btnGiftPray = document.getElementById('btn-gift-pray');
  const btnGiftLotus = document.getElementById('btn-gift-lotus');
  const btnGiftGrand = document.getElementById('btn-gift-grand');

  // ==========================================================================
  // WEB AUDIO ENGINE (SYNTHESIZED TEMPLE BELL & WOODEN FISH)
  // ==========================================================================
  function initAudio() {
    if (!state.audio.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audio.ctx = new AudioCtx();
    }
    if (state.audio.ctx.state === 'suspended') {
      state.audio.ctx.resume();
    }
  }

  function playTempleBell() {
    if (!state.audio.enabled) return;
    initAudio();
    const actx = state.audio.ctx;
    const now = actx.currentTime;

    const freqs = [528, 1056, 1584, 2640];
    const gains = [0.4, 0.2, 0.1, 0.05];
    const decays = [3.8, 2.5, 1.6, 0.9];

    const master = actx.createGain();
    master.gain.setValueAtTime(0.7, now);
    master.connect(actx.destination);

    freqs.forEach((f, i) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f + (Math.random() * 2 - 1), now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gains[i], now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decays[i]);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + decays[i]);
    });
  }

  function playWoodenFish() {
    if (!state.audio.enabled) return;
    initAudio();
    const actx = state.audio.ctx;
    const now = actx.currentTime;

    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(actx.destination);

    osc.start(now);
    osc.stop(now + 0.14);

    // High click
    const click = actx.createOscillator();
    const clickGain = actx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1500, now);
    clickGain.gain.setValueAtTime(0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    click.connect(clickGain);
    clickGain.connect(actx.destination);

    click.start(now);
    click.stop(now + 0.04);
  }

  // ==========================================================================
  // THREE.JS 3D DEVOTEE CHARACTERS ENGINE
  // ==========================================================================
  function initThreeScene() {
    const container = document.getElementById('stream-container');
    const threeCanvas = document.getElementById('three-canvas');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    state.three.scene = scene;

    // Camera (eye-level looking towards Buddha down the red carpet aisle)
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(0, 1.45, 4.3);
    camera.lookAt(0, 0.45, -2.2);
    state.three.camera = camera;

    // WebGL Renderer with transparency to show Buddha backdrop
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.three.renderer = renderer;

    // Lighting
    // Warm interior ambient light
    const ambientLight = new THREE.AmbientLight(0xffecd2, 0.75);
    scene.add(ambientLight);

    // Divine golden spotlight from the Buddha statue halo
    const buddhaLight = new THREE.DirectionalLight(0xf59e0b, 1.4);
    buddhaLight.position.set(0, 4.5, -3.5);
    buddhaLight.castShadow = true;
    buddhaLight.shadow.mapSize.width = 1024;
    buddhaLight.shadow.mapSize.height = 1024;
    buddhaLight.shadow.camera.near = 0.5;
    buddhaLight.shadow.camera.far = 15;
    scene.add(buddhaLight);

    // Warm floor candle point light
    const floorLight = new THREE.PointLight(0xff7700, 0.9, 8);
    floorLight.position.set(0, 0.2, -0.5);
    scene.add(floorLight);

    // 3D Floor & Red Carpet (Thảm đỏ dẫn lên chính điện)
    const floorGeo = new THREE.PlaneGeometry(10, 14);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x120604,
      roughness: 0.5,
      metalness: 0.15
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.42;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Red Carpet Runner
    const carpetGeo = new THREE.PlaneGeometry(1.4, 12);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x8b1c10,
      roughness: 0.85,
      metalness: 0.05
    });
    const carpetMesh = new THREE.Mesh(carpetGeo, carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, -0.41, 0.2);
    carpetMesh.receiveShadow = true;
    scene.add(carpetMesh);

    // Carpet gold borders
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd4a640, roughness: 0.3, metalness: 0.6 });
    [-0.7, 0.7].forEach(xOffset => {
      const bGeo = new THREE.PlaneGeometry(0.05, 12);
      const bMesh = new THREE.Mesh(bGeo, borderMat);
      bMesh.rotation.x = -Math.PI / 2;
      bMesh.position.set(xOffset, -0.405, 0.2);
      scene.add(bMesh);
    });

    // Raycaster for interactive picking
    state.three.raycaster = new THREE.Raycaster();
    state.three.mouse = new THREE.Vector2();

    // Spawn 14 3D Devotee Models
    state.three.devotees = [];
    DEVOTEES_CONFIG.forEach(cfg => {
      const devotee = create3DDevotee(cfg);
      scene.add(devotee.group);
      state.three.devotees.push(devotee);
    });

    // Create or bind floating DOM tags for each 3D devotee
    setupDevoteeDOMTags();

    // Start 3D Render Loop
    animateThree();
  }

  // 3D Character Model Builder (Bồ đoàn, Thân kiết già, Áo tràng lam, Chắp tay búp sen 🙏, Đầu thanh tịnh, Hào quang)
  function create3DDevotee(cfg) {
    const group = new THREE.Group();
    group.position.set(cfg.x, -0.42, cfg.z);

    // Facing direction: Devotees face forward towards the Buddha (Z = -3)
    group.rotation.y = cfg.x > 0 ? -0.2 : (cfg.x < 0 ? 0.2 : 0);

    // 1. Meditation Cushion (Bồ đoàn)
    const cushionGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.1, 24);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: cfg.robe === 0xe65100 ? 0xe64a19 : 0xca8a04,
      roughness: 0.7,
      metalness: 0.1
    });
    const cushionMesh = new THREE.Mesh(cushionGeo, cushionMat);
    cushionMesh.position.y = 0.05;
    cushionMesh.castShadow = true;
    cushionMesh.receiveShadow = true;
    group.add(cushionMesh);

    // Cushion gold piping trim
    const rimGeo = new THREE.TorusGeometry(0.39, 0.015, 8, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.09;
    group.add(rimMesh);

    // 2. Cross-legged Lotus Pose Legs (Tư thế kiết già)
    const legsGeo = new THREE.CylinderGeometry(0.36, 0.4, 0.16, 20);
    const robeMat = new THREE.MeshStandardMaterial({
      color: cfg.robe,
      roughness: 0.75,
      metalness: 0.05
    });
    const legsMesh = new THREE.Mesh(legsGeo, robeMat);
    legsMesh.position.y = 0.18;
    legsMesh.scale.set(1.15, 0.9, 0.85);
    legsMesh.castShadow = true;
    group.add(legsMesh);

    // 3. Torso / Draped Robe (Thân trên áo tràng)
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.26;

    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.46, 16);
    const torsoMesh = new THREE.Mesh(torsoGeo, robeMat);
    torsoMesh.position.y = 0.23;
    torsoMesh.castShadow = true;
    bodyGroup.add(torsoMesh);

    // Draped Collar V-neck
    const collarGeo = new THREE.TorusGeometry(0.16, 0.025, 8, 16, Math.PI);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = -Math.PI / 4;
    collarMesh.position.set(0, 0.42, 0.08);
    bodyGroup.add(collarMesh);

    // 4. Arms & Praying Hands (Chắp tay hoa sen 🙏)
    const armMat = robeMat;
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbd0a6, roughness: 0.5 });

    // Left & Right Upper Arms
    [-1, 1].forEach(side => {
      const armGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.24, 10);
      const armMesh = new THREE.Mesh(armGeo, armMat);
      armMesh.position.set(side * 0.18, 0.28, 0.02);
      armMesh.rotation.z = side * 0.45;
      armMesh.rotation.x = 0.35;
      bodyGroup.add(armMesh);
    });

    // Folded Praying Hands (chắp tay búp sen trước ngực)
    const handsGeo = new THREE.ConeGeometry(0.055, 0.13, 10);
    const handsMesh = new THREE.Mesh(handsGeo, skinMat);
    handsMesh.position.set(0, 0.32, 0.18);
    handsMesh.rotation.x = 0.25;
    handsMesh.scale.set(0.65, 1, 1.2);
    bodyGroup.add(handsMesh);

    // 5. Neck & Head (Đầu và cổ)
    const neckGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.09, 10);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = 0.48;
    bodyGroup.add(neckMesh);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.60;

    const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Topknot hair / Buddhist bun
    const bunGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const bunMesh = new THREE.Mesh(bunGeo, hairMat);
    bunMesh.position.set(0, 0.11, -0.02);
    headGroup.add(bunMesh);

    // 6. Glowing Golden Halo (Vòng hào quang)
    let haloMesh = null;
    if (cfg.halo) {
      const haloGeo = new THREE.TorusGeometry(0.18, 0.016, 8, 24);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: false });
      haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.set(0, 0.06, -0.06);
      headGroup.add(haloMesh);
    }

    bodyGroup.add(headGroup);
    group.add(bodyGroup);

    return {
      cfg,
      group,
      bodyGroup,
      headGroup,
      haloMesh,
      baseY: -0.42,
      breathPhase: Math.random() * Math.PI * 2,
      breathSpeed: 1.8 + Math.random() * 0.6,
      isBowing: false,
      bowProgress: 0
    };
  }

  // Setup DOM badges dynamically tracked above each 3D devotee's head
  function setupDevoteeDOMTags() {
    const layer = document.querySelector('.devotee-tag-layer');
    layer.innerHTML = '';

    state.three.devotees.forEach(devotee => {
      const tag = document.createElement('div');
      tag.className = 'seat-badge-tag';
      tag.id = `tag-${devotee.cfg.id}`;
      tag.innerHTML = `
        <span class="badge-avatar">${devotee.cfg.badge || '🧘'}</span>
        <span class="badge-name">${devotee.cfg.name}</span>
      `;

      // Click on tag to bow devotee
      tag.addEventListener('click', () => {
        bowDevotee(devotee);
      });

      layer.appendChild(tag);
      devotee.domTag = tag;
    });
  }

  // Bow animation on interaction
  function bowDevotee(devotee) {
    devotee.isBowing = true;
    devotee.bowProgress = 0;
    playWoodenFish();
    showToastMessage(devotee.cfg.name, 'thành tâm niệm: Nam Mô A Di Đà Phật 🙏');
  }

  // Three.js Render & Dynamic Badge Tracking Loop
  function animateThree() {
    requestAnimationFrame(animateThree);

    const time = performance.now() * 0.001;
    const camera = state.three.camera;
    const container = document.getElementById('stream-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    state.three.devotees.forEach(devotee => {
      // 1. Idle Meditation Breathing Animation (Thở thiền định nhẹ nhàng)
      const breath = Math.sin(time * devotee.breathSpeed + devotee.breathPhase);
      devotee.bodyGroup.position.y = 0.26 + breath * 0.008;
      devotee.bodyGroup.scale.set(1 + breath * 0.015, 1 + breath * 0.02, 1 + breath * 0.015);

      // Subtle halo pulse
      if (devotee.haloMesh) {
        devotee.haloMesh.rotation.z += 0.008;
      }

      // 2. Bowing Animation
      if (devotee.isBowing) {
        devotee.bowProgress += 0.06;
        const bowAngle = Math.sin(devotee.bowProgress * Math.PI) * 0.38;
        devotee.bodyGroup.rotation.x = bowAngle;

        if (devotee.bowProgress >= 1.0) {
          devotee.isBowing = false;
          devotee.bodyGroup.rotation.x = 0;
        }
      }

      // 3. Project 3D Head Position onto 2D Screen Coordinates for Floating DOM Badges
      if (devotee.domTag) {
        const headWorldPos = new THREE.Vector3();
        devotee.headGroup.getWorldPosition(headWorldPos);
        headWorldPos.y += 0.16; // Just above head

        headWorldPos.project(camera);

        // Convert normalized device coords [-1, 1] to container pixel coords
        const screenX = (headWorldPos.x * 0.5 + 0.5) * width;
        const screenY = (-(headWorldPos.y) * 0.5 + 0.5) * height;

        // Apply if in front of camera
        if (headWorldPos.z < 1) {
          devotee.domTag.style.left = `${screenX}px`;
          devotee.domTag.style.top = `${screenY}px`;
          devotee.domTag.style.display = 'flex';
        } else {
          devotee.domTag.style.display = 'none';
        }
      }
    });

    state.three.renderer.render(state.three.scene, state.three.camera);
  }

  // 3D Canvas Click Raycasting
  function handleThreeCanvasClick(event) {
    const container = document.getElementById('stream-container');
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    const y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    state.three.raycaster.setFromCamera(new THREE.Vector2(x, y), state.three.camera);

    // Test intersections with all devotees
    for (const devotee of state.three.devotees) {
      const intersects = state.three.raycaster.intersectObjects(devotee.group.children, true);
      if (intersects.length > 0) {
        bowDevotee(devotee);
        break;
      }
    }
  }

  // ==========================================================================
  // COUNTDOWN TIMER ("LỄ HỒI HƯỚNG SAU")
  // ==========================================================================
  function startCountdownTimer() {
    setInterval(() => {
      if (state.timer.seconds > 0) {
        state.timer.seconds--;
      } else {
        if (state.timer.minutes > 0) {
          state.timer.minutes--;
          state.timer.seconds = 59;
        } else {
          // Reset cycle & bow all 3D devotees together!
          state.timer.minutes = 2;
          state.timer.seconds = 11;
          playTempleBell();
          showToastMessage('Hệ thống', 'Đang cử hành Lễ Hồi Hướng Tam Bảo trang nghiêm.');
          state.three.devotees.forEach(d => bowDevotee(d));
        }
      }

      const m = String(state.timer.minutes).padStart(2, '0');
      const s = String(state.timer.seconds).padStart(2, '0');
      timerDisplay.textContent = `${m}:${s}`;
    }, 1000);
  }

  // ==========================================================================
  // CANDLE & HEART PROGRESSION
  // ==========================================================================
  function addCandles(amount) {
    state.candles.current += amount;
    candleCurrent.textContent = state.candles.current.toLocaleString('vi-VN');
    const remaining = Math.max(0, state.candles.target - state.candles.current);
    candleSubText.textContent = `Còn ${remaining.toLocaleString('vi-VN')} nén nữa`;
    const pct = Math.min(100, (state.candles.current / state.candles.target) * 100);
    candleProgressBar.style.width = `${pct}%`;

    // Make front devotees bow in gratitude
    state.three.devotees.slice(0, 3).forEach(d => bowDevotee(d));
  }

  function addHeart() {
    state.hearts.current++;
    state.hearts.userTaps++;
    heartsCountText.textContent = state.hearts.current.toLocaleString('vi-VN');
    heartBottomCount.textContent = state.hearts.userTaps;

    const pct = Math.min(100, (state.hearts.current / state.hearts.target) * 100);
    heartsProgressBar.style.width = `${pct}%`;

    // Trigger visual floating heart
    spawnFloatingHeart();

    // Sound effect
    if (state.hearts.current % 10 === 0) {
      playTempleBell();
      state.three.devotees.forEach(d => bowDevotee(d));
    } else {
      playWoodenFish();
    }
  }

  function spawnFloatingHeart() {
    const heart = document.createElement('div');
    heart.className = 'flying-heart-item';
    const emojis = ['❤️', '💖', '🪷', '✨', '💛', '🧡'];
    heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const randomX = (Math.random() - 0.5) * 36;
    heart.style.right = `${10 + randomX}px`;

    floatingHeartsContainer.appendChild(heart);

    setTimeout(() => {
      heart.remove();
    }, 1800);
  }

  // ==========================================================================
  // FLOATING CHECK-IN & SANGHA EVENT STREAM
  // ==========================================================================
  function appendEvent(eventData) {
    const pill = document.createElement('div');
    pill.className = 'flying-event-pill';

    if (eventData.type === 'checkin') {
      pill.innerHTML = `<span>🙏</span> <span class="event-highlight">${eventData.text}</span>`;
    } else if (eventData.type === 'user') {
      pill.innerHTML = `<span>${eventData.name}</span> <span class="event-highlight">${eventData.badge}</span> <span>${eventData.text}</span>`;
    } else if (eventData.type === 'bubble') {
      pill.innerHTML = `<span>${eventData.name}:</span> <span>${eventData.text}</span>`;
    } else if (eventData.type === 'join') {
      pill.classList.add('join-event');
      pill.innerHTML = `<span class="event-highlight">${eventData.prefix}</span> <span>${eventData.name}</span>`;
    } else if (eventData.type === 'streak') {
      pill.innerHTML = `<span class="streak-banner">${eventData.text}</span>`;
    }

    eventsStream.appendChild(pill);

    // Keep max 5 visible items
    while (eventsStream.children.length > 5) {
      eventsStream.removeChild(eventsStream.firstChild);
    }
  }

  function scheduleEventsStream() {
    let index = 0;
    for (let i = 0; i < 4; i++) {
      appendEvent(STREAM_EVENTS[index++ % STREAM_EVENTS.length]);
    }

    setInterval(() => {
      appendEvent(STREAM_EVENTS[index++ % STREAM_EVENTS.length]);
    }, 3800);
  }

  function showToastMessage(username, message) {
    toastUsername.textContent = username;
    shareToast.style.opacity = '1';
  }

  // ==========================================================================
  // CANVAS VISUAL PARTICLES (INCENSE SMOKE & GOLDEN DIVINE MOTES)
  // ==========================================================================
  function resizeCanvas() {
    const container = document.getElementById('stream-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width;
    canvas.height = height;

    if (state.three.renderer && state.three.camera) {
      state.three.camera.aspect = width / height;
      state.three.camera.updateProjectionMatrix();
      state.three.renderer.setSize(width, height);
    }
  }

  function initParticles() {
    state.particles = [];
    for (let i = 0; i < 35; i++) {
      state.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.7,
        radius: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.6,
        vy: -0.3 - Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        type: Math.random() > 0.4 ? 'gold' : 'smoke'
      });
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    state.particles.forEach(p => {
      p.y += p.vy;
      p.x += p.vx;
      p.alpha -= 0.0015;

      if (p.y < 50 || p.alpha <= 0.05) {
        p.y = canvas.height * 0.6 + Math.random() * 40;
        p.x = canvas.width / 2 + (Math.random() - 0.5) * 160;
        p.alpha = 0.65;
      }

      ctx.save();
      if (p.type === 'gold') {
        ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(253, 230, 138, ${p.alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    requestAnimationFrame(animateParticles);
  }

  function triggerOfferingEffect() {
    for (let i = 0; i < 35; i++) {
      state.particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height * 0.45,
        radius: 2 + Math.random() * 4,
        alpha: 0.9,
        vy: -1.2 - Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 3.5,
        type: 'gold'
      });
    }
  }

  // ==========================================================================
  // EVENT LISTENERS & USER INTERACTIONS
  // ==========================================================================
  function bindEvents() {
    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });

    // 3D Canvas Click Detection
    const threeCanvas = document.getElementById('three-canvas');
    threeCanvas.addEventListener('click', handleThreeCanvasClick);

    // Heart Like Tap Button
    btnLikeHeart.addEventListener('click', () => {
      addHeart();
    });

    // Gõ Mõ Quick Button
    btnQuickGomo.addEventListener('click', () => {
      playWoodenFish();
      btnQuickGomo.style.transform = 'scale(0.85) rotate(-10deg)';
      setTimeout(() => {
        btnQuickGomo.style.transform = '';
      }, 150);
      // Devotee You bows
      const you = state.three.devotees.find(d => d.cfg.id === 'you');
      if (you) bowDevotee(you);
    });

    // Quick Rose Offering Button
    btnRoseQuick.addEventListener('click', () => {
      addCandles(1);
      playTempleBell();
      triggerOfferingEffect();
      appendEvent({ type: 'bubble', name: 'Bạn', text: 'đã dâng 1 nén hương hoa hồng 🌹' });
    });

    // Sound Toggle
    btnToggleSound.addEventListener('click', () => {
      state.audio.enabled = !state.audio.enabled;
      btnToggleSound.style.opacity = state.audio.enabled ? '1' : '0.4';
      if (state.audio.enabled) {
        playTempleBell();
      }
    });

    // Quick Input Submit (Điểm danh / Chat)
    quickInputForm.addEventListener('submit', e => {
      e.preventDefault();
      const val = streamInput.value.trim();
      if (!val) return;

      playWoodenFish();
      appendEvent({ type: 'bubble', name: 'Bạn', text: val });
      streamInput.value = '';

      // Devotee You bows
      const you = state.three.devotees.find(d => d.cfg.id === 'you');
      if (you) bowDevotee(you);
    });

    // Offering Buttons Stack
    btnGiftRose.addEventListener('click', () => {
      addCandles(1);
      playTempleBell();
      triggerOfferingEffect();
      appendEvent({ type: 'bubble', name: 'Bạn', text: 'vừa dâng hương thơm lên Tam Bảo 🌹' });
    });

    btnGiftPray.addEventListener('click', () => {
      addCandles(5);
      playTempleBell();
      triggerOfferingEffect();
      appendEvent({ type: 'bubble', name: 'Bạn', text: 'vừa thành kính lễ Phật cầu an 🙏' });
    });

    btnGiftLotus.addEventListener('click', () => {
      addCandles(10);
      playTempleBell();
      triggerOfferingEffect();
      appendEvent({ type: 'bubble', name: 'Bạn', text: 'vừa dâng cúng đài hoa sen nở 🪷' });
    });

    btnGiftGrand.addEventListener('click', () => {
      addCandles(100);
      playTempleBell();
      triggerOfferingEffect();
      appendEvent({ type: 'bubble', name: 'Bạn', text: 'vừa phát tâm Đại Lễ Cúng Dường ✨' });
    });

    // Gifts Modal
    btnOpenGiftModal.addEventListener('click', () => {
      modalGifts.classList.add('open');
    });

    btnCloseGifts.addEventListener('click', () => {
      modalGifts.classList.remove('open');
    });

    document.querySelectorAll('.gift-item-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.gift-item-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.selectedGift = {
          name: card.getAttribute('data-name'),
          cost: parseInt(card.getAttribute('data-cost'), 10)
        };
      });
    });

    btnConfirmGift.addEventListener('click', () => {
      const gift = state.selectedGift || { name: 'Đài Hoa Sen Hồng', cost: 10 };
      addCandles(gift.cost);
      playTempleBell();
      triggerOfferingEffect();
      modalGifts.classList.remove('open');
      appendEvent({ type: 'bubble', name: 'Bạn', text: `đã cúng dường ${gift.name} (${gift.cost} xu) 🪷` });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        playWoodenFish();
        const you = state.three.devotees.find(d => d.cfg.id === 'you');
        if (you) bowDevotee(you);
      }
      if ((e.key === 'b' || e.key === 'B') && document.activeElement.tagName !== 'INPUT') {
        playTempleBell();
      }
      if (e.key === 'Escape') {
        modalGifts.classList.remove('open');
      }
    });

    // Emoji button quick action
    btnQuickEmoji.addEventListener('click', () => {
      streamInput.value = 'Điểm danh 🙏';
      quickInputForm.dispatchEvent(new Event('submit'));
    });
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    initThreeScene();
    resizeCanvas();
    initParticles();
    animateParticles();
    startCountdownTimer();
    scheduleEventsStream();
    bindEvents();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
