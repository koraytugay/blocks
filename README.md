# BLOCKS 3D — Educational 3D Block Builder & Architectural View Tool

A lightweight, high-performance, interactive 3D block builder built purely with **vanilla HTML, CSS, and JavaScript** (zero external dependencies or libraries). 

Designed as an educational tool to help students and kids develop 3D spatial thinking and understand how 3D physical structures map directly to 2D orthogonal architectural drawings (Plan and Elevation views).

![BLOCKS 3D Screenshot](https://raw.githubusercontent.com/koraytugay/blocks/main/preview.png) *(or run locally)*

---

## ✨ Features

- **Pure Vanilla Web Tech**: 100% vanilla HTML5, CSS3 3D transforms, and ES6 JavaScript. No Three.js, WebGL, bundlers, or external libraries.
- **Interactive 3D Grid Snapping**:
  - Hover over any block face to see a real-time ghost block snapping preview.
  - Left-click to attach a new cube to any face.
  - Shift + Left Click or right-click to delete a block.
  - Paint tool with 12 preset colors, custom HTML5 color picker, and random color mode.
- **Full 3D Orbit & Navigation**:
  - Drag to orbit freely in 3D around your creation.
  - Scroll wheel or on-screen `+` / `-` buttons to zoom smoothly.
  - Shift + Drag or Right-Mouse Drag to pan.
  - Auto-spin showcase mode.
  - Recenter camera with a single click or pressing `R`.
- **📐 2D Architectural Projection Views**:
  - **`TOP`**: Plan view from above.
  - **`BOTTOM`**: Under view from below.
  - **`FRONT`**: Front elevation view.
  - **`BACK`**: Rear elevation view.
  - **`LEFT`**: Left side elevation view.
  - **`RIGHT`**: Right side elevation view.
  - **`3D ISO`**: Free 3D orbit and isometric perspective.
- **🧭 Spatial Orientation Guides**:
  - **3D Ground Compass Arrows**: Prominent, color-coded directional arrows (`▲ FRONT`, `▲ BACK`, `▲ LEFT`, `▲ RIGHT`) lie on the ground plane pointing directly at the structure. Clicking any arrow glides the camera into that 2D view.
  - **Interactive 3D ViewCube**: A synchronized orientation cube in the top-right corner rotates with the camera in real time. Click any face to snap flat, or drag the ViewCube to rotate.
  - **Bidirectional Hover Highlights**: Hovering over any 2D view button pulses the corresponding 3D ground arrow and ViewCube face before clicking.
- **Educational Tools**:
  - **X-Ray Mode (`X`)**: Make blocks translucent to see interior and lower floors.
  - **Height Labels (`H`)**: Toggle elevation height markers (`H:0`, `H:1`, `H:2`...) on cubes.
  - **High-Contrast Styling**: 2px dark charcoal borders and neutral studio gray background for maximum visual clarity.
- **Built-in Presets**:
  - 1 Cube, Stairs, Pyramid, 3D Cross, Spiral Tower, and Voxel Heart.
- **🎲 Random Structure Generator**:
  - Input any custom block count (e.g. 5, 10, 15, 25, 50, or up to 200) to generate connected 3D structures.
  - Generates organic, contiguous 3D architectural shapes on the ground plane (towers, arches, terraces) ideal for testing architectural projections.
  - Quick-preset chips (`5`, `10`, `15`, `25`, `50`) for one-click generation.
  - Supports URL parameter generation (e.g. `?random=20`).
- **Export & Import**: Save your creations to `.json` files and reload them anytime.
- **Sound Synth**: Web Audio API synthesized pops and clicks for tactile feedback (toggleable).

---

## 🚀 Running Locally

No installation or build steps required. Simply serve the directory with any local HTTP server:

```bash
# Python 3
python3 -m http.server 8088

# Node.js (npx)
npx serve .
```

Then open your browser at **`http://localhost:8088`**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `A` | Add Block Tool |
| `D` | Delete Block Tool |
| `P` | Paint Block Tool |
| `1` – `4` | Brush Size (1×1 – 4×4 slab per click) |
| `[` / `]` | Smaller / Bigger Brush |
| `O` | Cycle Slab Orientation (On face → Floor → Front wall → Side wall) |
| `Shift + Click` | Delete Block |
| `X` | Toggle X-Ray Mode |
| `H` | Toggle Height Elevation Labels |
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo |
| `R` | Recenter Camera |
| `Space` | Toggle Auto-Spin Showcase |
| `+` / `-` | Zoom In / Out |

---

## 📄 License

MIT
