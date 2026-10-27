/**
 * BLOCKS 3D - Pure Vanilla JS Interactive 3D Block Builder
 * No external dependencies or libraries.
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const CUBE_SIZE = 60; // Size of each block in pixels
  const HALF_SIZE = CUBE_SIZE / 2;

  const FACES_CONFIG = {
    front:  { dx: 0,  dy: 0,  dz: 1,  opposite: 'back' },
    back:   { dx: 0,  dy: 0,  dz: -1, opposite: 'front' },
    right:  { dx: 1,  dy: 0,  dz: 0,  opposite: 'left' },
    left:   { dx: -1, dy: 0,  dz: 0,  opposite: 'right' },
    top:    { dx: 0,  dy: 1,  dz: 0,  opposite: 'bottom' },
    bottom: { dx: 0,  dy: -1, dz: 0,  opposite: 'top' },
  };

  // 3D neighbor offsets for the 4 2D edges (top, bottom, right, left) of each face.
  // When an adjacent neighbor exists in that edge direction with an unoccluded coplanar face,
  // the inner border on that edge is removed so connected blocks look like a single piece.
  const FACE_EDGES_CONFIG = {
    front: {
      normal: { dx: 0, dy: 0, dz: 1 },
      edges: {
        top:    { dx: 0, dy: 1, dz: 0 },
        bottom: { dx: 0, dy: -1, dz: 0 },
        right:  { dx: 1, dy: 0, dz: 0 },
        left:   { dx: -1, dy: 0, dz: 0 },
      }
    },
    back: {
      normal: { dx: 0, dy: 0, dz: -1 },
      edges: {
        top:    { dx: 0, dy: 1, dz: 0 },
        bottom: { dx: 0, dy: -1, dz: 0 },
        right:  { dx: -1, dy: 0, dz: 0 },
        left:   { dx: 1, dy: 0, dz: 0 },
      }
    },
    right: {
      normal: { dx: 1, dy: 0, dz: 0 },
      edges: {
        top:    { dx: 0, dy: 1, dz: 0 },
        bottom: { dx: 0, dy: -1, dz: 0 },
        right:  { dx: 0, dy: 0, dz: -1 },
        left:   { dx: 0, dy: 0, dz: 1 },
      }
    },
    left: {
      normal: { dx: -1, dy: 0, dz: 0 },
      edges: {
        top:    { dx: 0, dy: 1, dz: 0 },
        bottom: { dx: 0, dy: -1, dz: 0 },
        right:  { dx: 0, dy: 0, dz: 1 },
        left:   { dx: 0, dy: 0, dz: -1 },
      }
    },
    top: {
      normal: { dx: 0, dy: 1, dz: 0 },
      edges: {
        top:    { dx: 0, dy: 0, dz: -1 },
        bottom: { dx: 0, dy: 0, dz: 1 },
        right:  { dx: 1, dy: 0, dz: 0 },
        left:   { dx: -1, dy: 0, dz: 0 },
      }
    },
    bottom: {
      normal: { dx: 0, dy: -1, dz: 0 },
      edges: {
        top:    { dx: 0, dy: 0, dz: 1 },
        bottom: { dx: 0, dy: 0, dz: -1 },
        right:  { dx: 1, dy: 0, dz: 0 },
        left:   { dx: -1, dy: 0, dz: 0 },
      }
    },
  };

  // --- Preset Color Palette (20 distinct, logically categorized colors) ---
  const PALETTE_COLORS = [
    // Row 1: Structural & Neutrals
    '#ffffff', // Pure White
    '#94a3b8', // Silver Gray
    '#475569', // Slate Gray
    '#b45309', // Warm Terracotta

    // Row 2: Reds & Warm Tones
    '#ef4444', // Crimson Red
    '#fb7185', // Coral Rose
    '#f97316', // Flame Orange
    '#f59e0b', // Amber Gold

    // Row 3: Yellows & Greens
    '#facc15', // Canary Yellow
    '#84cc16', // Lime Chartreuse
    '#10b981', // Emerald Green
    '#047857', // Pine Green

    // Row 4: Cyans & Blues
    '#06b6d4', // Electric Cyan
    '#0ea5e9', // Sky Blue
    '#2563eb', // Royal Cobalt
    '#4338ca', // Deep Indigo

    // Row 5: Purples & Pinks
    '#7c3aed', // Royal Violet
    '#c084fc', // Lavender
    '#d946ef', // Hot Magenta
    '#ec4899', // Bubblegum Pink
  ];

  const PALETTE_NAMES = {
    '#ffffff': 'Pure White',
    '#94a3b8': 'Silver Gray',
    '#475569': 'Slate Gray',
    '#b45309': 'Warm Terracotta',
    '#ef4444': 'Crimson Red',
    '#fb7185': 'Coral Rose',
    '#f97316': 'Flame Orange',
    '#f59e0b': 'Amber Gold',
    '#facc15': 'Canary Yellow',
    '#84cc16': 'Lime Chartreuse',
    '#10b981': 'Emerald Green',
    '#047857': 'Pine Green',
    '#06b6d4': 'Electric Cyan',
    '#0ea5e9': 'Sky Blue',
    '#2563eb': 'Royal Cobalt',
    '#4338ca': 'Deep Indigo',
    '#7c3aed': 'Royal Violet',
    '#c084fc': 'Lavender',
    '#d946ef': 'Hot Magenta',
    '#ec4899': 'Bubblegum Pink',
  };

  // --- Sound FX via Web Audio API (Vanilla Synth) ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playPop(freqStart = 320, freqEnd = 640, duration = 0.08) {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {
        // Audio might fail if user hasn't interacted
      }
    }

    playAdd() {
      this.playPop(340, 680, 0.09);
    }

    playDelete() {
      this.playPop(480, 180, 0.11);
    }

    playPaint() {
      this.playPop(520, 520, 0.06);
    }

    playCorrect() {
      this.playPop(440, 880, 0.15);
    }

    playWrong() {
      this.playPop(260, 140, 0.22);
    }
  }

  // --- Camera Controller (Orbit, Zoom, Pan, Presets) ---
  class CameraController {
    constructor(viewportEl, worldEl, onUpdate) {
      this.viewport = viewportEl;
      this.world = worldEl;
      this.onUpdate = onUpdate;

      // Camera State
      this.rotX = -26;
      this.rotY = 40;
      this.targetRotX = -26;
      this.targetRotY = 40;

      this.panX = 0;
      this.panY = 0;
      this.targetPanX = 0;
      this.targetPanY = 0;

      this.zoom = 1.0;
      this.targetZoom = 1.0;

      // Auto-rotation showcase
      this.isAutoRotating = false;

      // Pointer drag tracking
      this.isPointerDown = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.hasDragged = false;
      this.activeButton = 0; // 0: left, 1: middle, 2: right
      this.isShiftDown = false;

      // Pinch zoom tracking
      this.projectionMode = 'perspective'; // 'perspective' or 'ortho'
      this.currentPreset = 'iso';
      this.onProjectionChange = null;

      // 3D Orientation ViewCube Gizmo
      this.viewCube = document.getElementById('viewcube');
      this.viewCubeViewport = document.getElementById('viewcube-viewport');

      this.setupEvents();
      this.startRenderLoop();
    }

    setProjection(mode) {
      this.projectionMode = mode;
      if (mode === 'ortho') {
        this.viewport.classList.add('arch-view');
      } else {
        this.viewport.classList.remove('arch-view');
      }
      if (this.onProjectionChange) {
        this.onProjectionChange(mode);
      }
    }

    setupEvents() {
      // Window resize
      window.addEventListener('resize', () => this.applyTransform());

      // Keyboard tracking for Shift
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
          this.isShiftDown = true;
          if (this.isPointerDown) {
            this.viewport.classList.add('panning');
          }
        }
      });
      window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
          this.isShiftDown = false;
          this.viewport.classList.remove('panning');
        }
      });

      // Pointer events for orbit and pan
      this.viewport.addEventListener('pointerdown', (e) => this.onPointerDown(e));
      window.addEventListener('pointermove', (e) => this.onPointerMove(e));
      window.addEventListener('pointerup', (e) => this.onPointerUp(e));
      window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

      // Prevent default right-click menu on 3D canvas
      this.viewport.addEventListener('contextmenu', (e) => e.preventDefault());

      // Wheel Zoom
      this.viewport.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

      // Touch pinch zoom
      this.viewport.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
      this.viewport.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
      this.viewport.addEventListener('touchend', () => { this.initialPinchDist = null; });

      // ViewCube direct drag & click navigation
      if (this.viewCubeViewport) {
        let isCubeDragging = false;
        let cubeStartX = 0, cubeStartY = 0;
        let hasCubeDragged = false;

        this.viewCubeViewport.addEventListener('pointerdown', (e) => {
          isCubeDragging = true;
          hasCubeDragged = false;
          cubeStartX = e.clientX;
          cubeStartY = e.clientY;
          e.stopPropagation();
        });

        window.addEventListener('pointermove', (e) => {
          if (!isCubeDragging) return;
          const dx = e.clientX - cubeStartX;
          const dy = e.clientY - cubeStartY;
          if (Math.hypot(dx, dy) > 3) hasCubeDragged = true;
          if (!hasCubeDragged) return;

          cubeStartX = e.clientX;
          cubeStartY = e.clientY;

          if (this.projectionMode === 'ortho') {
            this.setProjection('perspective');
          }
          this.targetRotY += dx * 0.7;
          this.targetRotX -= dy * 0.7;
          this.targetRotX = Math.max(-88, Math.min(88, this.targetRotX));
        });

        window.addEventListener('pointerup', (e) => {
          if (!isCubeDragging) return;
          isCubeDragging = false;
          if (!hasCubeDragged) {
            const face = e.target.closest('.vface');
            if (face) {
              const view = face.dataset.view;
              const pill = document.querySelector(`.pill-btn[data-view="${view}"]`);
              if (pill) pill.click();
            }
          }
        });
      }
    }

    onPointerDown(e) {
      this.isPointerDown = true;
      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.activeButton = e.button;
      this.isShiftDown = e.shiftKey;

      if (this.activeButton === 2 || this.activeButton === 1 || this.isShiftDown) {
        this.viewport.classList.add('panning');
      } else {
        this.viewport.classList.add('grabbing');
      }
    }

    onPointerMove(e) {
      if (!this.isPointerDown) return;

      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      const dist = Math.hypot(dx, dy);

      if (dist > 4) {
        this.hasDragged = true;
      }

      if (!this.hasDragged) return;

      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const isPanning = (this.activeButton === 2 || this.activeButton === 1 || this.isShiftDown || e.shiftKey);

      if (isPanning) {
        // Pan
        this.targetPanX += dx;
        this.targetPanY += dy;
      } else {
        // Orbit Rotate - if we were in 2D ortho view, smoothly switch back to 3D perspective orbit!
        if (this.projectionMode === 'ortho') {
          this.setProjection('perspective');
        }
        this.targetRotY += dx * 0.42;
        this.targetRotX -= dy * 0.42;

        // Clamp pitch so scene doesn't flip upside down
        this.targetRotX = Math.max(-88, Math.min(88, this.targetRotX));
      }
    }

    onPointerUp(e) {
      this.isPointerDown = false;
      this.viewport.classList.remove('grabbing');
      this.viewport.classList.remove('panning');
    }

    onWheel(e) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      this.setZoom(this.targetZoom * zoomFactor);
    }

    onTouchStart(e) {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.initialPinchDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        this.initialPinchZoom = this.targetZoom;
      }
    }

    onTouchMove(e) {
      if (e.touches.length === 2 && this.initialPinchDist) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        const scale = currentDist / this.initialPinchDist;
        this.setZoom(this.initialPinchZoom * scale);
      }
    }

    setZoom(val) {
      this.targetZoom = Math.max(0.25, Math.min(4.0, val));
      if (this.onUpdate) this.onUpdate(this);
    }

    zoomIn() {
      this.setZoom(this.targetZoom * 1.25);
    }

    zoomOut() {
      this.setZoom(this.targetZoom * 0.8);
    }

    resetView(centerOffset = null) {
      this.viewport.classList.remove('arch-top');
      this.targetRotX = -26;
      this.targetRotY = 40;
      this.targetPanX = centerOffset ? -centerOffset.centerX : 0;
      this.targetPanY = centerOffset ? -centerOffset.centerY : 0;
      this.targetZoom = 1.0;
      this.setProjection('perspective');
      if (this.onUpdate) this.onUpdate(this);
    }

    setViewPreset(preset, bounds = null) {
      this.currentPreset = preset;
      if (preset === 'top') {
        this.viewport.classList.add('arch-top');
      } else {
        this.viewport.classList.remove('arch-top');
      }
      switch (preset) {
        case 'iso':
          this.targetRotX = -26;
          this.targetRotY = 45;
          this.setProjection('perspective');
          if (bounds) {
            this.targetPanX = -bounds.centerX;
            this.targetPanY = -bounds.centerY;
          } else {
            this.targetPanX = 0;
            this.targetPanY = 0;
          }
          break;
        case 'top':
          this.targetRotX = -90;
          this.targetRotY = 0;
          this.setProjection('ortho');
          if (bounds) {
            this.targetPanX = -bounds.centerX;
            this.targetPanY = -bounds.centerZ;
          } else {
            this.targetPanX = 0;
            this.targetPanY = 0;
          }
          break;
        case 'bottom':
          this.targetRotX = 90;
          this.targetRotY = 0;
          this.setProjection('ortho');
          if (bounds) {
            this.targetPanX = -bounds.centerX;
            this.targetPanY = bounds.centerZ;
          } else {
            this.targetPanX = 0;
            this.targetPanY = 0;
          }
          break;
        case 'front':
          this.targetRotX = 0;
          this.targetRotY = 0;
          this.setProjection('ortho');
          if (bounds) {
            this.targetPanX = -bounds.centerX;
            this.targetPanY = -bounds.centerY;
          } else {
            this.targetPanX = 0;
            this.targetPanY = 0;
          }
          break;
        case 'back':
          this.targetRotX = 0;
          this.targetRotY = 180;
          this.setProjection('ortho');
          if (bounds) {
            this.targetPanX = bounds.centerX;
            this.targetPanY = -bounds.centerY;
          } else {
            this.targetPanX = 0;
            this.targetPanY = 0;
          }
          break;
        case 'left':
          this.targetRotX = 0;
          this.targetRotY = 90;
          this.setProjection('ortho');
          if (bounds) {
            this.targetPanX = -bounds.centerZ;
            this.targetPanY = -bounds.centerY;
          } else {
            this.targetPanX = 0;
            this.targetPanY = 0;
          }
          break;
        case 'right':
        case 'side':
          this.targetRotX = 0;
          this.targetRotY = -90;
          this.setProjection('ortho');
          if (bounds) {
            this.targetPanX = bounds.centerZ;
            this.targetPanY = -bounds.centerY;
          } else {
            this.targetPanX = 0;
            this.targetPanY = 0;
          }
          break;
      }
    }

    // Rotates the Top or Bottom 2D plan view by 90 degrees around the structure center.
    // dir: +1 for clockwise (↷), -1 for counter-clockwise (↶)
    rotatePlan90(dir = 1, bounds = null) {
      const isTop = (this.currentPreset === 'top' || Math.round(this.targetRotX) === -90);
      const isBottom = (this.currentPreset === 'bottom' || Math.round(this.targetRotX) === 90);
      if (!isTop && !isBottom) return;

      const delta = (isTop ? -dir : dir) * 90;
      this.targetRotY = Math.round((this.targetRotY + delta) / 90) * 90;

      if (bounds) {
        const rad = (this.targetRotY * Math.PI) / 180;
        const cx = bounds.centerX;
        const cz = bounds.centerZ;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        if (isTop) {
          const sx = cx * cos + cz * sin;
          const sy = -cx * sin + cz * cos;
          this.targetPanX = -sx;
          this.targetPanY = -sy;
        } else if (isBottom) {
          const sx = cx * cos + cz * sin;
          const sy = cx * sin - cz * cos;
          this.targetPanX = -sx;
          this.targetPanY = -sy;
        }
      }
    }

    toggleAutoRotate() {
      this.isAutoRotating = !this.isAutoRotating;
      return this.isAutoRotating;
    }

    startRenderLoop() {
      const step = () => {
        // Auto rotate increment
        if (this.isAutoRotating && !this.isPointerDown) {
          this.targetRotY += 0.35;
        }

        // Smooth damping interpolation
        const lerpFactor = 0.18;
        this.rotX += (this.targetRotX - this.rotX) * lerpFactor;
        this.rotY += (this.targetRotY - this.rotY) * lerpFactor;
        this.panX += (this.targetPanX - this.panX) * lerpFactor;
        this.panY += (this.targetPanY - this.panY) * lerpFactor;
        this.zoom += (this.targetZoom - this.zoom) * lerpFactor;

        this.applyTransform();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    applyTransform() {
      // Compose 3D World Transform: Pan -> Scale -> Orbit Rotations
      this.world.style.transform = `
        translate3d(${this.panX.toFixed(2)}px, ${this.panY.toFixed(2)}px, 0px)
        scale3d(${this.zoom.toFixed(4)}, ${this.zoom.toFixed(4)}, ${this.zoom.toFixed(4)})
        rotateX(${this.rotX.toFixed(2)}deg)
        rotateY(${this.rotY.toFixed(2)}deg)
      `;

      // Synchronize 3D Orientation ViewCube Gizmo
      if (this.viewCube) {
        this.viewCube.style.transform = `rotateX(${this.rotX.toFixed(2)}deg) rotateY(${this.rotY.toFixed(2)}deg)`;
      }
    }
  }

  // --- Grid & Block Manager ---
  class GridManager {
    constructor(containerEl, ghostEl, soundManager) {
      this.container = containerEl;
      this.ghostEl = ghostEl;
      this.sound = soundManager;

      // Map: key 'x,y,z' -> Block object
      this.blocks = new Map();

      // Undo & Redo Stacks
      this.undoStack = [];
      this.redoStack = [];

      this.onCountChange = null;
      this.onHistoryChange = null;
    }

    key(x, y, z) {
      return `${x},${y},${z}`;
    }

    has(x, y, z) {
      return this.blocks.has(this.key(x, y, z));
    }

    get(x, y, z) {
      return this.blocks.get(this.key(x, y, z));
    }

    createBlockElement(x, y, z, color, animate = false) {
      const cube = document.createElement('div');
      cube.className = 'cube' + (animate ? ' new-cube-anim' : '');
      cube.dataset.x = x;
      cube.dataset.y = y;
      cube.dataset.z = z;
      cube.style.setProperty('--block-color', color);

      // Positioning in 3D: positive Y is UP, so translateY is -y * CUBE_SIZE
      const px = x * CUBE_SIZE;
      const py = -y * CUBE_SIZE;
      const pz = z * CUBE_SIZE;
      cube.style.transform = `translate3d(${px}px, ${py}px, ${pz}px)`;

      const faces = {};
      const faceNames = ['front', 'back', 'right', 'left', 'top', 'bottom'];

      faceNames.forEach((faceName) => {
        const face = document.createElement('div');
        face.className = `face ${faceName}`;
        face.dataset.face = faceName;
        face.dataset.x = x;
        face.dataset.y = y;
        face.dataset.z = z;

        if (faceName === 'top') {
          const tag = document.createElement('span');
          tag.className = 'height-tag';
          tag.textContent = `H:${y}`;
          face.appendChild(tag);
        }

        cube.appendChild(face);
        faces[faceName] = face;
      });

      return { cube, faces };
    }

    insertBlock(x, y, z, color, animate) {
      const k = this.key(x, y, z);
      if (this.blocks.has(k)) return false;

      const { cube, faces } = this.createBlockElement(x, y, z, color, animate);
      this.container.appendChild(cube);

      const block = { x, y, z, color, cube, faces };
      this.blocks.set(k, block);

      // Update neighbor occlusions
      this.updateOcclusionForBlock(block, true);
      this.updateNeighborhoodBorders(x, y, z);
      return true;
    }

    // Add several blocks as a single undoable action (one sound, one undo step)
    addBlocks(list, isUndoRedo = false, animate = true) {
      const added = list.filter((b) => this.insertBlock(b.x, b.y, b.z, b.color, animate));
      if (added.length === 0) return [];

      if (!isUndoRedo) {
        this.undoStack.push({ type: 'multi', blocks: added.map(({ x, y, z, color }) => ({ x, y, z, color })) });
        this.redoStack = [];
        this.notifyHistory();
      }

      this.updateAllBorders();
      this.sound.playAdd();
      this.notifyCount();
      return added;
    }

    removeBlocks(list) {
      list.forEach((b) => {
        const block = this.get(b.x, b.y, b.z);
        if (!block) return;
        this.updateOcclusionForBlock(block, false);
        if (block.cube.parentNode) block.cube.parentNode.removeChild(block.cube);
        this.blocks.delete(this.key(b.x, b.y, b.z));
      });
      this.updateAllBorders();
      this.sound.playDelete();
      this.notifyCount();
    }

    addBlock(x, y, z, color = '#ffffff', isUndoRedo = false, animate = true) {
      if (!this.insertBlock(x, y, z, color, animate)) return false;

      if (!isUndoRedo) {
        this.undoStack.push({ type: 'add', x, y, z, color });
        this.redoStack = []; // Clear redo
        this.notifyHistory();
      }

      this.sound.playAdd();
      this.notifyCount();
      return true;
    }

    removeBlock(x, y, z, isUndoRedo = false) {
      const k = this.key(x, y, z);
      const block = this.blocks.get(k);
      if (!block) return false;

      const oldColor = block.color;

      // Update neighbors to reveal previously occluded faces
      this.updateOcclusionForBlock(block, false);

      // Remove DOM element
      if (block.cube.parentNode) {
        block.cube.parentNode.removeChild(block.cube);
      }
      this.blocks.delete(k);
      this.updateNeighborhoodBorders(x, y, z);

      if (!isUndoRedo) {
        this.undoStack.push({ type: 'delete', x, y, z, color: oldColor });
        this.redoStack = [];
        this.notifyHistory();
      }

      this.sound.playDelete();
      this.notifyCount();
      return true;
    }

    paintBlock(x, y, z, newColor, isUndoRedo = false) {
      const block = this.get(x, y, z);
      if (!block || block.color === newColor) return false;

      const oldColor = block.color;
      block.color = newColor;
      block.cube.style.setProperty('--block-color', newColor);
      this.updateNeighborhoodBorders(x, y, z);

      if (!isUndoRedo) {
        this.undoStack.push({ type: 'paint', x, y, z, oldColor, newColor });
        this.redoStack = [];
        this.notifyHistory();
      }

      this.sound.playPaint();
      return true;
    }

    updateOcclusionForBlock(block, isAdding) {
      const { x, y, z, faces } = block;

      for (const [faceName, cfg] of Object.entries(FACES_CONFIG)) {
        const nx = x + cfg.dx;
        const ny = y + cfg.dy;
        const nz = z + cfg.dz;
        const neighbor = this.get(nx, ny, nz);

        if (neighbor) {
          if (isAdding) {
            // Both faces now touch -> hide both to prevent Z-fighting and allow only exterior clicks
            faces[faceName].classList.add('hidden');
            neighbor.faces[cfg.opposite].classList.add('hidden');
          } else {
            // Block is being removed -> reveal neighbor's face
            neighbor.faces[cfg.opposite].classList.remove('hidden');
          }
        } else {
          if (isAdding) {
            // Exterior face -> keep visible
            faces[faceName].classList.remove('hidden');
          }
        }
      }
    }

    // Updates edge border classes on faces:
    // - When a coplanar neighbor has the SAME color, no-border-* is added so
    //   connected blocks of the same color merge into a single seamless piece.
    // - When neighbors have DIFFERENT colors (or empty space), the outer border
    //   is kept so borders per block/piece always remain distinct.
    updateBlockBorders(block) {
      if (!block) return;
      const { x, y, z, faces, color } = block;

      for (const [faceName, config] of Object.entries(FACE_EDGES_CONFIG)) {
        const faceEl = faces[faceName];
        if (!faceEl) continue;

        for (const [edgeName, dir] of Object.entries(config.edges)) {
          const noBorderClass = `no-border-${edgeName}`;

          // Coplanar neighbor must exist
          const nx = x + dir.dx;
          const ny = y + dir.dy;
          const nz = z + dir.dz;
          const neighbor = this.get(nx, ny, nz);

          if (neighbor && neighbor.color === color) {
            // Neighbor of the SAME color must not be occluded by a protruding block in front of this face
            const bx = nx + config.normal.dx;
            const by = ny + config.normal.dy;
            const bz = nz + config.normal.dz;
            if (!this.has(bx, by, bz)) {
              faceEl.classList.add(noBorderClass);
              continue;
            }
          }
          faceEl.classList.remove(noBorderClass);
        }
      }
    }

    updateNeighborhoodBorders(cx, cy, cz) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const b = this.get(cx + dx, cy + dy, cz + dz);
            if (b) this.updateBlockBorders(b);
          }
        }
      }
    }

    updateAllBorders() {
      for (const block of this.blocks.values()) {
        this.updateBlockBorders(block);
      }
    }

    undo() {
      if (this.undoStack.length === 0) return;
      const action = this.undoStack.pop();

      if (action.type === 'add') {
        this.removeBlock(action.x, action.y, action.z, true);
        this.redoStack.push(action);
      } else if (action.type === 'delete') {
        this.addBlock(action.x, action.y, action.z, action.color, true, false);
        this.redoStack.push(action);
      } else if (action.type === 'paint') {
        this.paintBlock(action.x, action.y, action.z, action.oldColor, true);
        this.redoStack.push(action);
      } else if (action.type === 'bulk') {
        this.loadState(action.prevBlocks, true);
        this.redoStack.push(action);
      } else if (action.type === 'multi') {
        this.removeBlocks(action.blocks);
        this.redoStack.push(action);
      }

      this.notifyHistory();
    }

    redo() {
      if (this.redoStack.length === 0) return;
      const action = this.redoStack.pop();

      if (action.type === 'add') {
        this.addBlock(action.x, action.y, action.z, action.color, true, false);
        this.undoStack.push(action);
      } else if (action.type === 'delete') {
        this.removeBlock(action.x, action.y, action.z, true);
        this.undoStack.push(action);
      } else if (action.type === 'paint') {
        this.paintBlock(action.x, action.y, action.z, action.newColor, true);
        this.undoStack.push(action);
      } else if (action.type === 'bulk') {
        this.loadState(action.newBlocks, true);
        this.undoStack.push(action);
      } else if (action.type === 'multi') {
        this.addBlocks(action.blocks, true, false);
        this.undoStack.push(action);
      }

      this.notifyHistory();
    }

    clear(recordUndo = true) {
      if (this.blocks.size === 0) return;
      if (recordUndo) {
        const prevBlocks = this.serialize();
        this.undoStack.push({ type: 'bulk', prevBlocks, newBlocks: [] });
        this.redoStack = [];
        this.notifyHistory();
      }

      this.container.innerHTML = '';
      this.blocks.clear();
      this.notifyCount();
    }

    serialize() {
      const list = [];
      for (const block of this.blocks.values()) {
        list.push({ x: block.x, y: block.y, z: block.z, color: block.color });
      }
      return list;
    }

    loadState(list, isUndoRedo = false) {
      if (!isUndoRedo) {
        const prevBlocks = this.serialize();
        this.undoStack.push({ type: 'bulk', prevBlocks, newBlocks: list });
        this.redoStack = [];
        this.notifyHistory();
      }

      this.container.innerHTML = '';
      this.blocks.clear();

      list.forEach((item) => {
        const { x, y, z, color } = item;
        const { cube, faces } = this.createBlockElement(x, y, z, color, false);
        this.container.appendChild(cube);
        const block = { x, y, z, color, cube, faces };
        this.blocks.set(this.key(x, y, z), block);
      });

      // Recalculate occlusions for all blocks
      for (const block of this.blocks.values()) {
        for (const [faceName, cfg] of Object.entries(FACES_CONFIG)) {
          const nx = block.x + cfg.dx;
          const ny = block.y + cfg.dy;
          const nz = block.z + cfg.dz;
          if (this.has(nx, ny, nz)) {
            block.faces[faceName].classList.add('hidden');
          } else {
            block.faces[faceName].classList.remove('hidden');
          }
        }
      }

      this.updateAllBorders();

      this.notifyCount();
    }

    notifyCount() {
      if (this.onCountChange) this.onCountChange(this.blocks.size);
    }

    notifyHistory() {
      if (this.onHistoryChange) {
        this.onHistoryChange(this.undoStack.length > 0, this.redoStack.length > 0);
      }
    }

    // Bounding box and center computation for auto-centering
    getBounds() {
      if (this.blocks.size === 0) {
        return { centerX: 0, centerY: 0, centerZ: 0 };
      }
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const b of this.blocks.values()) {
        if (b.x < minX) minX = b.x;
        if (b.x > maxX) maxX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.y > maxY) maxY = b.y;
        if (b.z < minZ) minZ = b.z;
        if (b.z > maxZ) maxZ = b.z;
      }

      return {
        centerX: ((minX + maxX) / 2) * CUBE_SIZE,
        centerY: -((minY + maxY) / 2) * CUBE_SIZE,
        centerZ: ((minZ + maxZ) / 2) * CUBE_SIZE
      };
    }

    // Ghost Block preview positioning
    showGhostAt(x, y, z, color) {
      this.showGhostCells([{ x, y, z }], color);
    }

    // Preview several cells at once; extra ghost elements are cloned from the original on demand
    showGhostCells(cells, color) {
      if (!this.ghostPool) this.ghostPool = [this.ghostEl];
      while (this.ghostPool.length < cells.length) {
        const clone = this.ghostEl.cloneNode(true);
        clone.removeAttribute('id');
        this.ghostEl.parentNode.appendChild(clone);
        this.ghostPool.push(clone);
      }

      this.ghostPool.forEach((el, i) => {
        const cell = cells[i];
        if (!cell) {
          el.classList.add('hidden');
          return;
        }
        el.classList.remove('hidden');
        el.style.transform = `translate3d(${cell.x * CUBE_SIZE}px, ${-cell.y * CUBE_SIZE}px, ${cell.z * CUBE_SIZE}px)`;
        el.style.setProperty('--ghost-color', color);
      });
    }

    hideGhost() {
      (this.ghostPool || [this.ghostEl]).forEach((el) => el.classList.add('hidden'));
    }
  }

  // --- Quiz Mode Manager (Spatial Reasoning & Architectural Projections) ---
  class QuizManager {
    constructor(app) {
      this.app = app;
      this.grid = app.grid;
      this.camera = app.camera;
      this.sound = app.sound;

      this.active = false;
      this.savedScene = null;
      this.currentBlocks = null;
      this.currentQuestion = null;

      this.score = 0;
      this.total = 0;
      this.streak = 0;
      this.questionNum = 1;

      // Elements
      this.btnToggle = document.getElementById('btn-quiz-mode');
      this.panel = document.getElementById('quiz-panel');
      this.btnClose = document.getElementById('btn-exit-quiz');
      this.qNumEl = document.getElementById('quiz-q-num');
      this.scoreEl = document.getElementById('quiz-score');
      this.streakEl = document.getElementById('quiz-streak');
      this.targetNameEl = document.getElementById('quiz-target-name');
      this.optionsContainer = document.getElementById('quiz-options-container');
      this.feedbackBox = document.getElementById('quiz-feedback-box');
      this.feedbackContent = document.getElementById('quiz-feedback-content');
      this.btnShow3D = document.getElementById('btn-quiz-show-3d');
      this.btnNext = document.getElementById('btn-quiz-next');
      this.btnNewStructure = document.getElementById('btn-quiz-new-structure');
      this.btnSkip = document.getElementById('btn-quiz-skip');

      this.setupEvents();
    }

    setupEvents() {
      if (this.btnToggle) {
        this.btnToggle.addEventListener('click', () => this.toggle());
      }
      if (this.btnClose) {
        this.btnClose.addEventListener('click', () => this.exit());
      }
      if (this.btnNext) {
        this.btnNext.addEventListener('click', () => {
          this.questionNum++;
          this.nextQuestion(true);
        });
      }
      if (this.btnNewStructure) {
        this.btnNewStructure.addEventListener('click', () => {
          this.nextQuestion(true);
        });
      }
      if (this.btnSkip) {
        this.btnSkip.addEventListener('click', () => {
          this.questionNum++;
          this.nextQuestion(false);
        });
      }
      if (this.btnShow3D) {
        this.btnShow3D.addEventListener('click', () => {
          if (this.currentQuestion) {
            this.camera.setViewPreset(this.currentQuestion.targetView, this.grid.getBounds());
          }
        });
      }
    }

    toggle() {
      if (this.active) {
        this.exit();
      } else {
        this.start();
      }
    }

    start() {
      this.active = true;
      this.savedScene = this.grid.serialize();
      document.body.classList.add('quiz-active');
      if (this.btnToggle) this.btnToggle.classList.add('active');
      if (this.panel) this.panel.classList.remove('hidden');

      if (this.camera.isAutoRotating) {
        this.camera.toggleAutoRotate();
        const autoRotateBtn = document.getElementById('btn-auto-rotate');
        if (autoRotateBtn) autoRotateBtn.classList.remove('active');
      }

      if (this.app.isWhiteMode) {
        this.app.toggleWhiteMode(false);
      }

      this.score = 0;
      this.total = 0;
      this.streak = 0;
      this.questionNum = 1;
      this.updateStatsUI();

      this.nextQuestion(true);
    }

    exit() {
      this.active = false;
      document.body.classList.remove('quiz-active');
      if (this.btnToggle) this.btnToggle.classList.remove('active');
      if (this.panel) this.panel.classList.add('hidden');

      if (this.savedScene !== null) {
        this.grid.loadState(this.savedScene);
        this.camera.setViewPreset('iso', this.grid.getBounds());
      }
    }

    createSlab(x0, y0, z0, orientation, color, id) {
      const cubes = [];
      const wx = orientation === 'yz' ? 1 : 4;
      const wy = orientation === 'xz' ? 1 : 4;
      const wz = orientation === 'xy' ? 1 : 4;

      for (let dx = 0; dx < wx; dx++) {
        for (let dy = 0; dy < wy; dy++) {
          for (let dz = 0; dz < wz; dz++) {
            cubes.push({ x: x0 + dx, y: y0 + dy, z: z0 + dz });
          }
        }
      }
      return { id, x0, y0, z0, orientation, wx, wy, wz, color, cubes };
    }

    slabsIntersect(s1, s2) {
      const overlapX = Math.max(0, Math.min(s1.x0 + s1.wx, s2.x0 + s2.wx) - Math.max(s1.x0, s2.x0));
      const overlapY = Math.max(0, Math.min(s1.y0 + s1.wy, s2.y0 + s2.wy) - Math.max(s1.y0, s2.y0));
      const overlapZ = Math.max(0, Math.min(s1.z0 + s1.wz, s2.z0 + s2.wz) - Math.max(s1.z0, s2.z0));
      return overlapX > 0 && overlapY > 0 && overlapZ > 0;
    }

    generateStructure(minBlocks = 3, maxBlocks = 8) {
      // Pick from vibrant chromatic colors in the palette (excluding pure white)
      const vibrantColors = PALETTE_COLORS.filter((c) => c !== '#ffffff');
      const colors = [...vibrantColors].sort(() => Math.random() - 0.5);
      const count = Math.floor(Math.random() * (maxBlocks - minBlocks + 1)) + minBlocks;
      const blocks = [];
      const orientations = ['xz', 'xy', 'yz'];

      // Start with a base slab at ground
      const firstOri = orientations[Math.floor(Math.random() * orientations.length)];
      blocks.push(this.createSlab(0, 0, 0, firstOri, colors[0], 1));

      let attempts = 0;
      while (blocks.length < count && attempts < 500) {
        attempts++;
        const base = blocks[Math.floor(Math.random() * blocks.length)];
        const newOri = orientations[Math.floor(Math.random() * orientations.length)];
        const nwx = newOri === 'yz' ? 1 : 4;
        const nwy = newOri === 'xz' ? 1 : 4;
        const nwz = newOri === 'xy' ? 1 : 4;

        const faces = ['+x', '-x', '+y', '-y', '+z', '-z'];
        const face = faces[Math.floor(Math.random() * faces.length)];

        let nx = base.x0;
        let ny = base.y0;
        let nz = base.z0;

        if (face === '+x') nx = base.x0 + base.wx;
        else if (face === '-x') nx = base.x0 - nwx;
        else if (face === '+y') ny = base.y0 + base.wy;
        else if (face === '-y') ny = base.y0 - nwy;
        else if (face === '+z') nz = base.z0 + base.wz;
        else if (face === '-z') nz = base.z0 - nwz;

        if (face === '+x' || face === '-x') {
          ny = base.y0;
          nz = base.z0;
        } else if (face === '+y' || face === '-y') {
          nx = base.x0;
          nz = base.z0;
        } else if (face === '+z' || face === '-z') {
          nx = base.x0;
          ny = base.y0;
        }

        if (ny < 0 || ny > 12) continue;
        if (Math.abs(nx) > 16 || Math.abs(nz) > 16) continue;

        const candidate = this.createSlab(nx, ny, nz, newOri, colors[blocks.length % colors.length], blocks.length + 1);
        if (!blocks.some((b) => this.slabsIntersect(b, candidate))) {
          blocks.push(candidate);
        }
      }
      return blocks;
    }

    loadStructureIntoGrid(blocks) {
      const cubes = [];
      for (const b of blocks) {
        for (const cube of b.cubes) {
          cubes.push({
            x: cube.x,
            y: cube.y,
            z: cube.z,
            color: b.color
          });
        }
      }
      this.grid.loadState(cubes);
      this.camera.setViewPreset('iso', this.grid.getBounds());
    }

    getProjectedGrid(blocks, view) {
      const grid = new Map();
      let minCx = Infinity, maxCx = -Infinity;
      let minCy = Infinity, maxCy = -Infinity;

      for (const b of blocks) {
        for (const cube of b.cubes) {
          const { x, y, z } = cube;
          let cx, cy, depth;
          switch (view) {
            case 'top':    cx = x;  cy = z;  depth = y;  break;
            case 'bottom': cx = x;  cy = -z; depth = -y; break;
            case 'front':  cx = x;  cy = -y; depth = z;  break;
            case 'back':   cx = -x; cy = -y; depth = -z; break;
            case 'left':   cx = z;  cy = -y; depth = -x; break;
            case 'right':  cx = -z; cy = -y; depth = x;  break;
          }

          minCx = Math.min(minCx, cx);
          maxCx = Math.max(maxCx, cx);
          minCy = Math.min(minCy, cy);
          maxCy = Math.max(maxCy, cy);

          const k = `${cx},${cy}`;
          const existing = grid.get(k);
          if (!existing || depth > existing.depth) {
            grid.set(k, { depth, color: b.color, blockId: b.id });
          }
        }
      }
      return { grid, minCx, maxCx, minCy, maxCy };
    }

    getSignature(proj) {
      const { grid, minCx, minCy } = proj;
      const cells = [];
      for (const [key, val] of grid.entries()) {
        const [cx, cy] = key.split(',').map(Number);
        cells.push(`${cx - minCx},${cy - minCy}:${val.blockId}`);
      }
      return cells.sort().join(';');
    }

    transformGrid(proj, mode) {
      const { grid, minCx, maxCx, minCy, maxCy } = proj;
      const transformed = new Map();
      let rMinX = Infinity, rMaxX = -Infinity;
      let rMinY = Infinity, rMaxY = -Infinity;
      const w = maxCx - minCx;
      const h = maxCy - minCy;

      for (const [key, val] of grid.entries()) {
        const [cx, cy] = key.split(',').map(Number);
        const ox = cx - minCx;
        const oy = cy - minCy;

        let rx, ry;
        if (mode === 90) {
          rx = h - oy;
          ry = ox;
        } else if (mode === 180) {
          rx = w - ox;
          ry = h - oy;
        } else if (mode === 270) {
          rx = oy;
          ry = w - ox;
        } else if (mode === 'flipH') {
          rx = w - ox;
          ry = oy;
        } else if (mode === 'flipV') {
          rx = ox;
          ry = h - oy;
        }

        rMinX = Math.min(rMinX, rx);
        rMaxX = Math.max(rMaxX, rx);
        rMinY = Math.min(rMinY, ry);
        rMaxY = Math.max(rMaxY, ry);
        transformed.set(`${rx},${ry}`, { ...val });
      }

      return { grid: transformed, minCx: rMinX, maxCx: rMaxX, minCy: rMinY, maxCy: rMaxY };
    }

    renderSVG(proj, maxBox = 110) {
      const { grid, minCx, maxCx, minCy, maxCy } = proj;
      const cols = maxCx - minCx + 1;
      const rows = maxCy - minCy + 1;
      const cellSize = Math.min(18, Math.max(5, Math.floor((maxBox - 12) / Math.max(cols, rows))));
      const pad = 6;
      const svgW = cols * cellSize + pad * 2;
      const svgH = rows * cellSize + pad * 2;

      let rects = '';
      let borders = '';

      for (const [key, val] of grid.entries()) {
        const [cx, cy] = key.split(',').map(Number);
        const x = pad + (cx - minCx) * cellSize;
        const y = pad + (cy - minCy) * cellSize;

        rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${val.color}" shape-rendering="crispEdges"/>`;

        const topKey = `${cx},${cy - 1}`;
        const botKey = `${cx},${cy + 1}`;
        const leftKey = `${cx - 1},${cy}`;
        const rightKey = `${cx + 1},${cy}`;

        const topDiff = !grid.has(topKey) || grid.get(topKey).blockId !== val.blockId;
        const botDiff = !grid.has(botKey) || grid.get(botKey).blockId !== val.blockId;
        const leftDiff = !grid.has(leftKey) || grid.get(leftKey).blockId !== val.blockId;
        const rightDiff = !grid.has(rightKey) || grid.get(rightKey).blockId !== val.blockId;

        if (topDiff) borders += `<line x1="${x}" y1="${y}" x2="${x + cellSize}" y2="${y}" stroke="rgba(15,23,42,0.85)" stroke-width="1.8"/>`;
        if (botDiff) borders += `<line x1="${x}" y1="${y + cellSize}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="rgba(15,23,42,0.85)" stroke-width="1.8"/>`;
        if (leftDiff) borders += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cellSize}" stroke="rgba(15,23,42,0.85)" stroke-width="1.8"/>`;
        if (rightDiff) borders += `<line x1="${x + cellSize}" y1="${y}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="rgba(15,23,42,0.85)" stroke-width="1.8"/>`;
      }

      return `<svg viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">${rects}${borders}</svg>`;
    }

    nextQuestion(newStructure = true) {
      if (newStructure || !this.currentBlocks) {
        this.currentBlocks = this.generateStructure(3, 8);
        this.loadStructureIntoGrid(this.currentBlocks);
      }

      const views = [
        { id: 'top', name: 'TOP VIEW (Plan)' },
        { id: 'bottom', name: 'BOTTOM VIEW' },
        { id: 'front', name: 'FRONT ELEVATION' },
        { id: 'back', name: 'BACK ELEVATION' },
        { id: 'right', name: 'RIGHT SIDE VIEW' },
        { id: 'left', name: 'LEFT SIDE VIEW' },
      ];

      const target = views[Math.floor(Math.random() * views.length)];
      const correctProj = this.getProjectedGrid(this.currentBlocks, target.id);
      const correctSig = this.getSignature(correctProj);

      // Distractor candidates pool
      const candidateProjs = [
        this.transformGrid(correctProj, 90),
        this.transformGrid(correctProj, 180),
        this.transformGrid(correctProj, 270),
        this.transformGrid(correctProj, 'flipH'),
        this.transformGrid(correctProj, 'flipV'),
      ];

      for (const v of views) {
        if (v.id !== target.id) {
          const otherProj = this.getProjectedGrid(this.currentBlocks, v.id);
          candidateProjs.push(otherProj);
          candidateProjs.push(this.transformGrid(otherProj, 90));
          candidateProjs.push(this.transformGrid(otherProj, 'flipH'));
        }
      }

      const distractorPool = [];
      const seen = new Set([correctSig]);
      for (const cand of candidateProjs) {
        const sig = this.getSignature(cand);
        if (!seen.has(sig)) {
          seen.add(sig);
          distractorPool.push(cand);
        }
      }

      distractorPool.sort(() => Math.random() - 0.5);
      const distractors = distractorPool.slice(0, 3);

      const rawOptions = [
        { proj: correctProj, isCorrect: true },
        { proj: distractors[0], isCorrect: false },
        { proj: distractors[1], isCorrect: false },
        { proj: distractors[2], isCorrect: false },
      ];

      rawOptions.sort(() => Math.random() - 0.5);
      const correctIndex = rawOptions.findIndex((o) => o.isCorrect);

      this.currentQuestion = {
        targetView: target.id,
        targetName: target.name,
        options: rawOptions,
        correctIndex,
        answered: false
      };

      if (this.targetNameEl) this.targetNameEl.textContent = target.name;
      if (this.feedbackBox) this.feedbackBox.classList.add('hidden');
      this.updateStatsUI();

      this.renderOptionsGrid();
    }

    renderOptionsGrid() {
      if (!this.optionsContainer || !this.currentQuestion) return;
      this.optionsContainer.innerHTML = '';

      const letters = ['A', 'B', 'C', 'D'];
      this.currentQuestion.options.forEach((opt, idx) => {
        const card = document.createElement('div');
        card.className = 'quiz-opt-card';
        card.dataset.index = idx;

        const badge = document.createElement('span');
        badge.className = 'quiz-opt-letter';
        badge.textContent = letters[idx];
        card.appendChild(badge);

        const svgHtml = this.renderSVG(opt.proj);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = svgHtml;
        card.appendChild(wrapper.firstChild);

        card.addEventListener('click', () => this.handleOptionClick(idx, card));
        this.optionsContainer.appendChild(card);
      });
    }

    handleOptionClick(choiceIndex, cardEl) {
      if (!this.currentQuestion || this.currentQuestion.answered) return;
      this.currentQuestion.answered = true;
      this.total++;

      const isCorrect = choiceIndex === this.currentQuestion.correctIndex;
      const cards = this.optionsContainer.querySelectorAll('.quiz-opt-card');
      cards.forEach((c) => c.classList.add('disabled'));

      if (isCorrect) {
        this.score++;
        this.streak++;
        cardEl.classList.add('is-correct');
        if (this.sound) this.sound.playCorrect();
        this.showFeedback(true, '🎉 Correct! That is the exact projection.');
      } else {
        this.streak = 0;
        cardEl.classList.add('is-wrong');
        const correctCard = cards[this.currentQuestion.correctIndex];
        if (correctCard) correctCard.classList.add('is-correct');
        if (this.sound) this.sound.playWrong();
        this.showFeedback(false, '❌ Not quite. Click "Show in 3D" to rotate the model and see why!');
      }

      this.updateStatsUI();
    }

    showFeedback(isCorrect, message) {
      if (!this.feedbackBox || !this.feedbackContent) return;
      this.feedbackBox.className = 'quiz-feedback-box ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
      this.feedbackContent.textContent = message;
      this.feedbackBox.classList.remove('hidden');
    }

    updateStatsUI() {
      if (this.qNumEl) this.qNumEl.textContent = `#${this.questionNum}`;
      if (this.scoreEl) this.scoreEl.textContent = `${this.score} / ${this.total}`;
      if (this.streakEl) this.streakEl.textContent = `🔥 ${this.streak}`;
    }
  }

  // --- Main Application Controller ---
  class App {
    constructor() {
      // DOM Elements
      this.viewport = document.getElementById('viewport');
      this.world = document.getElementById('world');
      this.blocksContainer = document.getElementById('blocks-container');
      this.ghostBlock = document.getElementById('ghost-block');

      this.blockCountEl = document.getElementById('block-count');
      this.zoomIndicator = document.getElementById('zoom-indicator');
      this.btnUndo = document.getElementById('btn-undo');
      this.btnRedo = document.getElementById('btn-redo');
      this.btnSound = document.getElementById('btn-sound');
      this.soundIconOn = document.getElementById('sound-icon-on');
      this.soundIconOff = document.getElementById('sound-icon-off');
      this.emptyStarter = document.getElementById('empty-starter');

      this.btnSeamless = document.getElementById('btn-seamless');
      this.btnWhiteMode = document.getElementById('btn-white-mode');
      this.btnXray = document.getElementById('btn-xray');
      this.btnHeights = document.getElementById('btn-heights');
      this.archBanner = document.getElementById('arch-banner');
      this.archBannerTitle = document.getElementById('arch-banner-title');
      this.archRotateControls = document.getElementById('arch-rotate-controls');
      this.btnArchRotateCCW = document.getElementById('btn-arch-rotate-ccw');
      this.btnArchRotateCW = document.getElementById('btn-arch-rotate-cw');
      this.btnCamRotateCCW = document.getElementById('btn-cam-rotate-ccw');
      this.btnCamRotateCW = document.getElementById('btn-cam-rotate-cw');
      this.btnExitArch = document.getElementById('btn-exit-arch');

      // State
      this.currentMode = 'add'; // 'add', 'delete', 'paint'
      this.currentColor = PALETTE_COLORS[0];
      this.isRandomColor = false;
      this.isSeamless = true; // Inner grids hidden by default (blocks look like a single piece)
      this.isWhiteMode = false; // When true, all blocks render pure white (colors disabled temporarily)
      this.brushSize = 1; // N×N slab placed per click in add mode
      this.brushPlane = 'auto'; // 'auto' (flat on clicked face), 'floor' (XZ), 'front' (XY), 'side' (YZ)

      // Subsystems
      this.sound = new SoundManager();
      this.grid = new GridManager(this.blocksContainer, this.ghostBlock, this.sound);
      this.camera = new CameraController(this.viewport, this.world, (cam) => {
        this.zoomIndicator.textContent = Math.round(cam.targetZoom * 100) + '%';
      });
      this.quiz = new QuizManager(this);

      this.init();
    }

    init() {
      document.body.dataset.activeMode = this.currentMode;

      // Setup Subsystem Callbacks
      this.grid.onCountChange = (count) => {
        this.blockCountEl.textContent = count;
        if (count === 0) {
          this.emptyStarter.classList.remove('hidden');
        } else {
          this.emptyStarter.classList.add('hidden');
        }
        this.updateCompassPositions();
      };

      this.emptyStarter.addEventListener('click', () => {
        this.grid.addBlock(0, 0, 0, this.currentColor, false, true);
        this.camera.resetView(this.grid.getBounds());
      });

      this.grid.onHistoryChange = (canUndo, canRedo) => {
        this.btnUndo.disabled = !canUndo;
        this.btnRedo.disabled = !canRedo;
      };

      // Camera projection change callback
      this.camera.onProjectionChange = (mode) => {
        if (mode === 'perspective') {
          this.archBanner.classList.add('hidden');
          this.updateRotateControlsVisibility('iso');
          const activePill = document.querySelector('.pill-btn.active');
          if (activePill && activePill.dataset.view !== 'iso') {
            document.querySelectorAll('.pill-btn').forEach((p) => p.classList.remove('active'));
            const isoPill = document.querySelector('.pill-btn[data-view="iso"]');
            if (isoPill) isoPill.classList.add('active');
          }
        }
      };

      this.setupPalette();
      this.setupToolButtons();
      this.setupCameraButtons();
      this.setupPresets();
      this.setupRandomGenerator();
      this.setupExportImport();
      this.setupInteractiveBlockClicks();
      this.setupKeyboardShortcuts();
      this.setupHelpModal();
      this.setupDirectionIndicators();

      // Check URL parameters for preset, random, and view
      const params = new URLSearchParams(window.location.search);
      const presetParam = params.get('preset');
      const randomParam = params.get('random');
      const viewParam = params.get('view');

      if (presetParam && this.presets && this.presets[presetParam]) {
        const list = this.presets[presetParam]();
        this.grid.loadState(list);
        this.camera.resetView(this.grid.getBounds());
      } else if (randomParam) {
        const count = parseInt(randomParam, 10) || 15;
        const inputCount = document.getElementById('input-random-count');
        if (inputCount) inputCount.value = count;
        this.buildRandomStructure(count);
      } else {
        // Spawn initial center cube
        this.grid.addBlock(0, 0, 0, this.currentColor, false, false);
      }

      this.updateCompassPositions();

      if (viewParam) {
        const pill = document.querySelector(`.pill-btn[data-view="${viewParam}"]`);
        if (pill) {
          pill.click();
          this.camera.rotX = this.camera.targetRotX;
          this.camera.rotY = this.camera.targetRotY;
          this.camera.panX = this.camera.targetPanX;
          this.camera.panY = this.camera.targetPanY;
          this.camera.zoom = this.camera.targetZoom;
          this.camera.applyTransform();
        }
      }
    }

    updateCompassPositions() {
      const compass = document.getElementById('ground-compass');
      if (!compass) return;

      let minX = 0, maxX = 0;
      let minY = 0, maxY = 0;
      let minZ = 0, maxZ = 0;

      if (this.grid.blocks.size > 0) {
        minX = Infinity; maxX = -Infinity;
        minY = Infinity; maxY = -Infinity;
        minZ = Infinity; maxZ = -Infinity;
        for (const b of this.grid.blocks.values()) {
          if (b.x < minX) minX = b.x;
          if (b.x > maxX) maxX = b.x;
          if (b.y < minY) minY = b.y;
          if (b.y > maxY) maxY = b.y;
          if (b.z < minZ) minZ = b.z;
          if (b.z > maxZ) maxZ = b.z;
        }
      }

      const cx = ((minX + maxX) / 2) * CUBE_SIZE;
      const cz = ((minZ + maxZ) / 2) * CUBE_SIZE;
      // Floor level: right under lowest block
      const floorY = -minY * CUBE_SIZE + HALF_SIZE + 4;

      const spanX = (maxX - minX + 1) * CUBE_SIZE;
      const spanZ = (maxZ - minZ + 1) * CUBE_SIZE;
      const radiusX = Math.max(160, spanX * 0.5 + 110);
      const radiusZ = Math.max(160, spanZ * 0.5 + 110);

      const indFront = compass.querySelector('.dir-front');
      const indBack = compass.querySelector('.dir-back');
      const indLeft = compass.querySelector('.dir-left');
      const indRight = compass.querySelector('.dir-right');

      if (indFront) indFront.style.transform = `translate3d(${cx}px, ${floorY}px, ${cz + radiusZ}px) rotateX(90deg)`;
      if (indBack) indBack.style.transform = `translate3d(${cx}px, ${floorY}px, ${cz - radiusZ}px) rotateX(90deg) rotateZ(180deg)`;
      if (indLeft) indLeft.style.transform = `translate3d(${cx - radiusX}px, ${floorY}px, ${cz}px) rotateX(90deg) rotateZ(90deg)`;
      if (indRight) indRight.style.transform = `translate3d(${cx + radiusX}px, ${floorY}px, ${cz}px) rotateX(90deg) rotateZ(-90deg)`;
    }

    setupDirectionIndicators() {
      // Ground indicator clicks
      document.querySelectorAll('.dir-indicator').forEach((ind) => {
        ind.addEventListener('click', (e) => {
          e.stopPropagation();
          const view = ind.dataset.view;
          const pill = document.querySelector(`.pill-btn[data-view="${view}"]`);
          if (pill) pill.click();
        });
      });

      // ViewCube Home Button
      const btnHome = document.getElementById('btn-viewcube-home');
      if (btnHome) {
        btnHome.addEventListener('click', (e) => {
          e.stopPropagation();
          const isoPill = document.querySelector(`.pill-btn[data-view="iso"]`);
          if (isoPill) isoPill.click();
        });
      }

      // Bidirectional Hover Highlighting between View Pills, ViewCube faces, and Ground Arrows
      const attachHoverPairing = (elements, attrName) => {
        elements.forEach((el) => {
          el.addEventListener('pointerenter', () => {
            const view = el.getAttribute(attrName);
            if (!view || view === 'iso') return;
            document.querySelectorAll(`[data-view="${view}"]`).forEach((matched) => {
              matched.classList.add('highlighted');
            });
          });
          el.addEventListener('pointerleave', () => {
            const view = el.getAttribute(attrName);
            if (!view) return;
            document.querySelectorAll(`[data-view="${view}"]`).forEach((matched) => {
              matched.classList.remove('highlighted');
            });
          });
        });
      };

      attachHoverPairing(document.querySelectorAll('.pill-btn'), 'data-view');
      attachHoverPairing(document.querySelectorAll('.vface'), 'data-view');
      attachHoverPairing(document.querySelectorAll('.dir-indicator'), 'data-view');
    }

    setupPalette() {
      const swatchesContainer = document.getElementById('color-swatches');
      const customPicker = document.getElementById('custom-color-picker');
      const customPreview = document.getElementById('custom-color-preview');
      const randomToggle = document.getElementById('random-color-toggle');

      PALETTE_COLORS.forEach((color, idx) => {
        const swatch = document.createElement('div');
        swatch.className = 'swatch' + (idx === 0 ? ' active' : '');
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        const colorName = PALETTE_NAMES[color] || color;
        swatch.title = `${colorName} (${color})`;

        swatch.addEventListener('click', () => {
          this.setColor(color);
          randomToggle.checked = false;
          this.isRandomColor = false;
        });

        swatchesContainer.appendChild(swatch);
      });

      customPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        customPreview.style.backgroundColor = color;
        this.setColor(color);
        randomToggle.checked = false;
        this.isRandomColor = false;
      });

      randomToggle.addEventListener('change', (e) => {
        this.isRandomColor = e.target.checked;
      });
    }

    setColor(color) {
      this.currentColor = color;
      document.querySelectorAll('.swatch').forEach((s) => {
        s.classList.toggle('active', s.dataset.color === color);
      });
      document.getElementById('custom-color-preview').style.backgroundColor = color;
    }

    getRandomPaletteColor() {
      const idx = Math.floor(Math.random() * PALETTE_COLORS.length);
      return PALETTE_COLORS[idx];
    }

    setupToolButtons() {
      const modeButtons = document.querySelectorAll('.mode-selector .tool-btn');
      modeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          this.setMode(mode);
        });
      });

      document.querySelectorAll('.size-selector .size-btn').forEach((btn) => {
        btn.addEventListener('click', () => this.setBrushSize(parseInt(btn.dataset.size, 10)));
      });

      document.querySelectorAll('.plane-selector .plane-btn').forEach((btn) => {
        btn.addEventListener('click', () => this.setBrushPlane(btn.dataset.plane));
      });

      this.btnUndo.addEventListener('click', () => this.grid.undo());
      this.btnRedo.addEventListener('click', () => this.grid.redo());

      document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Clear all blocks and start fresh?')) {
          this.grid.clear();
          this.grid.addBlock(0, 0, 0, this.currentColor, false, true);
        }
      });

      this.btnSound.addEventListener('click', () => {
        this.sound.enabled = !this.sound.enabled;
        this.soundIconOn.classList.toggle('hidden', !this.sound.enabled);
        this.soundIconOff.classList.toggle('hidden', this.sound.enabled);
      });

      // Seamless Blocks / Inner Grids Toggle (Hide inner borders so blocks look like a single piece)
      if (this.btnSeamless) {
        this.btnSeamless.addEventListener('click', () => {
          this.toggleSeamless();
        });
      }

      // White Mode / Disable Colors Toggle (Temporarily make all blocks white)
      if (this.btnWhiteMode) {
        this.btnWhiteMode.addEventListener('click', () => {
          this.toggleWhiteMode();
        });
      }

      // X-Ray Mode Toggle
      this.btnXray.addEventListener('click', () => {
        const isXray = this.viewport.classList.toggle('xray-mode');
        this.btnXray.classList.toggle('active', isXray);
      });

      // Elevation Height Labels Toggle
      this.btnHeights.addEventListener('click', () => {
        const isHeights = this.viewport.classList.toggle('show-heights');
        this.btnHeights.classList.toggle('active', isHeights);
      });

      // Exit Architecture Banner -> Return to 3D Orbit
      this.btnExitArch.addEventListener('click', () => {
        this.camera.setViewPreset('iso', this.grid.getBounds());
        document.querySelectorAll('.pill-btn').forEach((p) => p.classList.remove('active'));
        const isoPill = document.querySelector('.pill-btn[data-view="iso"]');
        if (isoPill) isoPill.classList.add('active');
        this.archBanner.classList.add('hidden');
        this.updateRotateControlsVisibility('iso');
      });
    }

    rotatePlan(dir) {
      this.camera.rotatePlan90(dir, this.grid.getBounds());
      this.updateCompassPositions();
    }

    updateRotateControlsVisibility(view) {
      const isPlan = (view === 'top' || view === 'bottom');
      if (this.archRotateControls) {
        this.archRotateControls.classList.toggle('hidden', !isPlan);
      }
      if (this.btnCamRotateCCW) {
        this.btnCamRotateCCW.classList.toggle('hidden', !isPlan);
      }
      if (this.btnCamRotateCW) {
        this.btnCamRotateCW.classList.toggle('hidden', !isPlan);
      }
    }

    toggleSeamless(force) {
      this.isSeamless = typeof force === 'boolean' ? force : !this.isSeamless;
      this.viewport.classList.toggle('seamless-mode', this.isSeamless);
      if (this.btnSeamless) {
        this.btnSeamless.classList.toggle('active', this.isSeamless);
        this.btnSeamless.title = this.isSeamless
          ? 'Toggle Inner Grids (G) - Currently Hidden (Seamless Single Piece)'
          : 'Toggle Inner Grids (G) - Currently Visible';
      }
    }

    toggleWhiteMode(force) {
      this.isWhiteMode = typeof force === 'boolean' ? force : !this.isWhiteMode;
      this.viewport.classList.toggle('white-mode', this.isWhiteMode);
      if (this.btnWhiteMode) {
        this.btnWhiteMode.classList.toggle('active', this.isWhiteMode);
        this.btnWhiteMode.title = this.isWhiteMode
          ? 'Restore Colors (W) - Currently in White Mode'
          : 'Disable Colors / White Mode (W) - Temporarily make all blocks white';
      }
    }

    // Cells covered by an N×N slab placed against the clicked face.
    // The slab plane is either flat on the face ('auto') or a fixed plane: floor (XZ), front wall (XY), side wall (YZ).
    // Per slab axis: the face-normal axis extends outward from the face, Y grows upward from the clicked row,
    // and any other axis is centered on the target cell (even sizes extend one more toward +x / +z).
    getBrushCells(tx, ty, tz, faceName) {
      const n = this.brushSize;
      const cfg = FACES_CONFIG[faceName];
      const normal = { x: cfg.dx, y: cfg.dy, z: cfg.dz };
      const normalAxis = cfg.dx ? 'x' : cfg.dy ? 'y' : 'z';
      const planes = { floor: ['x', 'z'], front: ['x', 'y'], side: ['z', 'y'] };
      const axes = planes[this.brushPlane] || ['x', 'y', 'z'].filter((a) => a !== normalAxis);

      const offsets = (axis) => {
        const list = [];
        for (let i = 0; i < n; i++) {
          if (axis === normalAxis) list.push(i * normal[axis]);
          else if (axis === 'y') list.push(i);
          else list.push(i - Math.floor((n - 1) / 2));
        }
        return list;
      };

      const cells = [];
      for (const a of offsets(axes[0])) {
        for (const b of offsets(axes[1])) {
          const cell = { x: tx, y: ty, z: tz };
          cell[axes[0]] += a;
          cell[axes[1]] += b;
          cells.push(cell);
        }
      }
      return cells;
    }

    setBrushPlane(plane) {
      this.brushPlane = plane;
      document.querySelectorAll('.plane-selector .plane-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.plane === plane);
      });
      if (this.currentMode !== 'add') this.setMode('add');
      this.refreshGhost();
    }

    setBrushSize(size) {
      this.brushSize = Math.max(1, Math.min(4, size));
      document.querySelectorAll('.size-selector .size-btn').forEach((btn) => {
        btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === this.brushSize);
      });
      if (this.currentMode !== 'add') this.setMode('add');
      this.refreshGhost();
    }

    setMode(mode) {
      this.currentMode = mode;
      document.body.dataset.activeMode = mode;
      document.querySelectorAll('.mode-selector .tool-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
      this.refreshGhost();
    }

    // Redraw the preview for the face under the cursor (e.g. after a size, orientation or mode change
    // while the mouse is not moving)
    refreshGhost() {
      const face = this.hoveredFace;
      if (!face || !face.isConnected || this.currentMode !== 'add') {
        this.grid.hideGhost();
        return;
      }
      const cfg = FACES_CONFIG[face.dataset.face];
      const x = parseInt(face.dataset.x, 10) + cfg.dx;
      const y = parseInt(face.dataset.y, 10) + cfg.dy;
      const z = parseInt(face.dataset.z, 10) + cfg.dz;
      const placeColor = this.isRandomColor ? this.getRandomPaletteColor() : this.currentColor;
      const cells = this.getBrushCells(x, y, z, face.dataset.face).filter((c) => !this.grid.has(c.x, c.y, c.z));
      this.grid.showGhostCells(cells, placeColor);
    }

    setupCameraButtons() {
      document.getElementById('btn-zoom-in').addEventListener('click', () => this.camera.zoomIn());
      document.getElementById('btn-zoom-out').addEventListener('click', () => this.camera.zoomOut());
      document.getElementById('btn-recenter').addEventListener('click', () => {
        const bounds = this.grid.getBounds();
        this.camera.resetView(bounds);
      });

      const btnAuto = document.getElementById('btn-auto-rotate');
      btnAuto.addEventListener('click', () => {
        const active = this.camera.toggleAutoRotate();
        btnAuto.classList.toggle('active', active);
      });

      if (this.btnArchRotateCCW) {
        this.btnArchRotateCCW.addEventListener('click', () => this.rotatePlan(-1));
      }
      if (this.btnArchRotateCW) {
        this.btnArchRotateCW.addEventListener('click', () => this.rotatePlan(1));
      }
      if (this.btnCamRotateCCW) {
        this.btnCamRotateCCW.addEventListener('click', () => this.rotatePlan(-1));
      }
      if (this.btnCamRotateCW) {
        this.btnCamRotateCW.addEventListener('click', () => this.rotatePlan(1));
      }

      const pills = document.querySelectorAll('.pill-btn');
      pills.forEach((pill) => {
        pill.addEventListener('click', () => {
          pills.forEach((p) => p.classList.remove('active'));
          pill.classList.add('active');
          const view = pill.dataset.view;
          this.camera.setViewPreset(view, this.grid.getBounds());
          this.updateCompassPositions();
          this.updateRotateControlsVisibility(view);

          if (view === 'iso') {
            this.archBanner.classList.add('hidden');
          } else {
            this.archBanner.classList.remove('hidden');
            const titles = {
              top: 'Top Plan (View from Above)',
              bottom: 'Bottom View (View from Below)',
              front: 'Front Elevation (2D View)',
              back: 'Back Elevation (Rear View)',
              left: 'Left Elevation (Side View)',
              right: 'Right Elevation (Side View)',
              side: 'Side Elevation (2D View)'
            };
            this.archBannerTitle.textContent = titles[view] || '2D Architecture View';
          }
        });
      });
    }

    setupInteractiveBlockClicks() {
      // Hover tracking for Ghost preview block
      this.viewport.addEventListener('pointermove', (e) => {
        if (this.quiz && this.quiz.active) {
          this.hoveredFace = null;
          this.grid.hideGhost();
          return;
        }
        if (this.camera.isPointerDown) {
          this.hoveredFace = null;
          this.grid.hideGhost();
          return;
        }

        const face = e.target.closest('.face');
        this.hoveredFace = face && FACES_CONFIG[face.dataset.face] ? face : null;
        this.refreshGhost();
      });

      this.viewport.addEventListener('pointerleave', () => {
        this.hoveredFace = null;
        this.grid.hideGhost();
      });

      // Click handling on blocks
      this.viewport.addEventListener('pointerup', (e) => {
        if (this.quiz && this.quiz.active) return;
        // If it was a drag, ignore click
        if (this.camera.hasDragged) return;

        const face = e.target.closest('.face');
        if (!face) return;

        const x = parseInt(face.dataset.x, 10);
        const y = parseInt(face.dataset.y, 10);
        const z = parseInt(face.dataset.z, 10);
        const faceName = face.dataset.face;

        // Right click directly deletes the block if it's a click without drag
        if (e.button === 2) {
          e.preventDefault();
          this.grid.removeBlock(x, y, z);
          this.grid.hideGhost();
          return;
        }

        if (e.button !== 0) return; // Only process left click below

        // Shift + Click in any mode deletes block
        if (e.shiftKey || this.currentMode === 'delete') {
          this.grid.removeBlock(x, y, z);
          this.grid.hideGhost();
          return;
        }

        if (this.currentMode === 'paint') {
          const paintColor = this.isRandomColor ? this.getRandomPaletteColor() : this.currentColor;
          this.grid.paintBlock(x, y, z, paintColor);
          return;
        }

        if (this.currentMode === 'add') {
          const cfg = FACES_CONFIG[faceName];
          if (!cfg) return;

          const cells = this.getBrushCells(x + cfg.dx, y + cfg.dy, z + cfg.dz, faceName);
          const placeColor = this.isRandomColor ? this.getRandomPaletteColor() : this.currentColor;
          const added = this.grid.addBlocks(cells.map((c) => ({
            ...c,
            color: this.isRandomColor ? this.getRandomPaletteColor() : this.currentColor
          })));

          if (added.length > 0) {
            // Update ghost to the next layer out from the clicked face
            const next = cells
              .map((c) => ({ x: c.x + cfg.dx, y: c.y + cfg.dy, z: c.z + cfg.dz }))
              .filter((c) => !this.grid.has(c.x, c.y, c.z));
            this.grid.showGhostCells(next, placeColor);
          }
        }
      });
    }

    setupPresets() {
      const presets = {
        single: () => [{ x: 0, y: 0, z: 0, color: PALETTE_COLORS[0] }],
        stairs: () => {
          const blocks = [];
          for (let i = 0; i < 7; i++) {
            for (let w = 0; w < 3; w++) {
              blocks.push({
                x: w - 1,
                y: i,
                z: i,
                color: PALETTE_COLORS[i % PALETTE_COLORS.length]
              });
            }
          }
          return blocks;
        },
        pyramid: () => {
          const blocks = [];
          const colors = [PALETTE_COLORS[2], PALETTE_COLORS[3], PALETTE_COLORS[4], PALETTE_COLORS[1]];
          // Base 5x5
          for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
              blocks.push({ x, y: 0, z, color: colors[0] });
            }
          }
          // Tier 3x3
          for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
              blocks.push({ x, y: 1, z, color: colors[1] });
            }
          }
          // Top 1x1
          blocks.push({ x: 0, y: 2, z: 0, color: colors[2] });
          return blocks;
        },
        cross: () => {
          const blocks = [{ x: 0, y: 0, z: 0, color: PALETTE_COLORS[5] }];
          const dirs = [
            [1, 0, 0], [-1, 0, 0],
            [0, 1, 0], [0, -1, 0],
            [0, 0, 1], [0, 0, -1]
          ];
          dirs.forEach(([dx, dy, dz], idx) => {
            for (let step = 1; step <= 2; step++) {
              blocks.push({
                x: dx * step,
                y: dy * step,
                z: dz * step,
                color: PALETTE_COLORS[(idx + step) % PALETTE_COLORS.length]
              });
            }
          });
          return blocks;
        },
        tower: () => {
          const blocks = [];
          for (let y = 0; y < 8; y++) {
            const color = PALETTE_COLORS[y % PALETTE_COLORS.length];
            blocks.push({ x: 0, y, z: 0, color });
            blocks.push({ x: 1, y, z: 0, color });
            blocks.push({ x: 0, y, z: 1, color });
            blocks.push({ x: 1, y, z: 1, color });
          }
          // Battlements
          blocks.push({ x: 0, y: 8, z: 0, color: '#f8fafc' });
          blocks.push({ x: 1, y: 8, z: 1, color: '#f8fafc' });
          return blocks;
        },
        heart: () => {
          // Pixel heart
          const heartMap = [
            [0, 1, 1, 0, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 0, 0, 0],
          ];
          const blocks = [];
          for (let r = 0; r < heartMap.length; r++) {
            for (let c = 0; c < heartMap[r].length; c++) {
              if (heartMap[r][c]) {
                const x = c - 3;
                const y = (heartMap.length - 1 - r) - 1;
                blocks.push({ x, y, z: 0, color: '#ef4444' });
                blocks.push({ x, y, z: 1, color: '#f43f5e' });
              }
            }
          }
          return blocks;
        }
      };
      this.presets = presets;

      document.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const presetName = btn.dataset.preset;
          if (presets[presetName]) {
            const list = presets[presetName]();
            this.grid.loadState(list);
            this.camera.resetView(this.grid.getBounds());
            this.updateCompassPositions();
          }
        });
      });
    }

    buildRandomStructure(targetCount = 15) {
      const count = Math.max(1, Math.min(200, parseInt(targetCount, 10) || 15));
      const blocks = [];
      const occupied = new Set();
      const candidates = [];
      const candidateSet = new Set();

      const addOccupied = (x, y, z) => occupied.add(`${x},${y},${z}`);
      const isOccupied = (x, y, z) => occupied.has(`${x},${y},${z}`);

      // Start with origin block
      const startColor = this.isRandomColor ? this.getRandomPaletteColor() : PALETTE_COLORS[0];
      blocks.push({ x: 0, y: 0, z: 0, color: startColor });
      addOccupied(0, 0, 0);

      const neighborDirs = [
        { dx: 1, dy: 0, dz: 0 },
        { dx: -1, dy: 0, dz: 0 },
        { dx: 0, dy: 1, dz: 0 },
        { dx: 0, dy: -1, dz: 0 },
        { dx: 0, dy: 0, dz: 1 },
        { dx: 0, dy: 0, dz: -1 }
      ];

      const addCandidates = (x, y, z) => {
        for (const d of neighborDirs) {
          const nx = x + d.dx;
          const ny = y + d.dy;
          const nz = z + d.dz;
          // Keep structure on or above ground (ny >= 0)
          if (ny >= 0 && !isOccupied(nx, ny, nz)) {
            const k = `${nx},${ny},${nz}`;
            if (!candidateSet.has(k)) {
              candidateSet.add(k);
              candidates.push({ x: nx, y: ny, z: nz, key: k });
            }
          }
        }
      };

      addCandidates(0, 0, 0);

      while (blocks.length < count && candidates.length > 0) {
        // Bias towards recent candidates (65%) for natural organic architectural shapes (wings, towers, arches)
        let idx;
        if (Math.random() < 0.65 && candidates.length > 2) {
          const start = Math.floor(candidates.length * 0.45);
          idx = start + Math.floor(Math.random() * (candidates.length - start));
        } else {
          idx = Math.floor(Math.random() * candidates.length);
        }

        const chosen = candidates.splice(idx, 1)[0];
        candidateSet.delete(chosen.key);

        if (isOccupied(chosen.x, chosen.y, chosen.z)) continue;

        // Color selection: vibrant palette rotation or current color
        let blockColor;
        if (this.isRandomColor) {
          blockColor = this.getRandomPaletteColor();
        } else if (this.currentColor !== PALETTE_COLORS[0]) {
          blockColor = this.currentColor;
        } else {
          blockColor = PALETTE_COLORS[blocks.length % PALETTE_COLORS.length];
        }

        blocks.push({ x: chosen.x, y: chosen.y, z: chosen.z, color: blockColor });
        addOccupied(chosen.x, chosen.y, chosen.z);
        addCandidates(chosen.x, chosen.y, chosen.z);
      }

      this.grid.loadState(blocks);
      this.sound.playPop(340, 680, 0.12);
      this.camera.resetView(this.grid.getBounds());
      this.updateCompassPositions();
      return blocks;
    }

    setupRandomGenerator() {
      const inputCount = document.getElementById('input-random-count');
      const btnGenerate = document.getElementById('btn-generate-random');
      const chips = document.querySelectorAll('.random-quick-chips .chip-btn');

      const triggerGenerate = (val) => {
        const count = parseInt(val !== undefined ? val : inputCount.value, 10);
        if (isNaN(count) || count < 1) {
          inputCount.value = 15;
          this.buildRandomStructure(15);
        } else {
          const clamped = Math.max(1, Math.min(200, count));
          inputCount.value = clamped;
          this.buildRandomStructure(clamped);
        }
      };

      if (btnGenerate) {
        btnGenerate.addEventListener('click', () => triggerGenerate());
      }

      if (inputCount) {
        inputCount.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            triggerGenerate();
          }
        });
      }

      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          const num = parseInt(chip.dataset.count, 10);
          if (inputCount) inputCount.value = num;
          triggerGenerate(num);
        });
      });
    }

    setupExportImport() {
      const btnExport = document.getElementById('btn-export');
      const btnImport = document.getElementById('btn-import');
      const fileInput = document.getElementById('import-file-input');

      btnExport.addEventListener('click', () => {
        const data = JSON.stringify(this.grid.serialize(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `3d-blocks-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });

      btnImport.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const list = JSON.parse(event.target.result);
            if (Array.isArray(list)) {
              this.grid.loadState(list);
              this.camera.resetView(this.grid.getBounds());
              this.updateCompassPositions();
            } else {
              alert('Invalid file format.');
            }
          } catch (err) {
            alert('Failed to parse JSON file.');
          }
        };
        reader.readAsText(file);
      });
    }

    setupKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Prevent hotkeys when typing in input
        if (e.target.tagName === 'INPUT') return;

        if (e.key === 'Escape') {
          if (this.quiz && this.quiz.active) {
            this.quiz.exit();
            return;
          }
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            this.grid.redo();
          } else {
            this.grid.undo();
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          this.grid.redo();
        } else if (e.key === '[') {
          this.setBrushSize(this.brushSize - 1);
        } else if (e.key === ']') {
          this.setBrushSize(this.brushSize + 1);
        } else if (e.key.toLowerCase() === 'o') {
          const order = ['auto', 'floor', 'front', 'side'];
          this.setBrushPlane(order[(order.indexOf(this.brushPlane) + 1) % order.length]);
        } else if (['1', '2', '3', '4'].includes(e.key)) {
          this.setBrushSize(parseInt(e.key, 10));
        } else if (e.key.toLowerCase() === 'a') {
          this.setMode('add');
        } else if (e.key.toLowerCase() === 'd') {
          this.setMode('delete');
        } else if (e.key.toLowerCase() === 'p') {
          this.setMode('paint');
        } else if (e.key.toLowerCase() === 'q') {
          this.rotatePlan(-1);
        } else if (e.key.toLowerCase() === 'e') {
          this.rotatePlan(1);
        } else if (e.key.toLowerCase() === 'g') {
          this.toggleSeamless();
        } else if (e.key.toLowerCase() === 'w' || (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey)) {
          this.toggleWhiteMode();
        } else if (e.key.toLowerCase() === 'x') {
          const isXray = this.viewport.classList.toggle('xray-mode');
          this.btnXray.classList.toggle('active', isXray);
        } else if (e.key.toLowerCase() === 'h') {
          const isHeights = this.viewport.classList.toggle('show-heights');
          this.btnHeights.classList.toggle('active', isHeights);
        } else if (e.key.toLowerCase() === 'r') {
          this.camera.resetView(this.grid.getBounds());
        } else if (e.key === ' ') {
          e.preventDefault();
          const active = this.camera.toggleAutoRotate();
          document.getElementById('btn-auto-rotate').classList.toggle('active', active);
        } else if (e.key === '+' || e.key === '=') {
          this.camera.zoomIn();
        } else if (e.key === '-' || e.key === '_') {
          this.camera.zoomOut();
        }
      });
    }

    setupHelpModal() {
      const modal = document.getElementById('help-modal');
      const btnHelp = document.getElementById('btn-help');
      const btnClose = document.getElementById('btn-close-modal');
      const btnGotIt = document.getElementById('btn-modal-gotit');

      const openModal = () => modal.classList.remove('hidden');
      const closeModal = () => modal.classList.add('hidden');

      btnHelp.addEventListener('click', openModal);
      btnClose.addEventListener('click', closeModal);
      btnGotIt.addEventListener('click', closeModal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }
  }

  // Initialize once DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.__app = new App();
  });
})();
