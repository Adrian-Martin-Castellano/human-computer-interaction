# Gesture-Controlled Music Player (Practice 2)

**Course:** SIPC
**Institution:** Universidad de La Laguna (ULL) - Escuela Superior de Ingeniería y Tecnología  
**Author:** Adrián Martín Castellano  
**Email:** alu0101547619@ull.edu.es  
**Date:** Dec 2024 

---

## Overview

This repository contains the implementation of **Practice 2**, a gesture-driven Spotify-style media player. The application uses real-time computer vision and 2D physics simulation to track the user's hand movements and interact with on-screen player controls.

Key features include:
* **Gesture Tracking:** Real-time index finger tracking powered by **MediaPipe Hand Landmarker**.
* **Physics Collision Engine:** Powered by **Pymunk** to handle interactions between the user's hand pointer and dynamic UI elements.
* **Interactive UI:** A **Pygame** interface featuring song album artwork, real-time playback timer, track title rendering, and responsive visual controls.

---

## Project Structure

```text
practice-2/
├── hand_landmarker.task   # MediaPipe pretrained vision task model
├── main.py                 # Core application logic and main execution loop
└── images/                 # Graphical assets and album covers
    ├── fondo.jpg           # Application background interface
    ├── .....
```

```plaintext
      [ Webcam Feed ]
              │
              ▼
      ┌──────────────────────┐
      │ MediaPipe Vision     │  ── Coordinates (Landmark 8: Index Tip) ──┐
      └──────────────────────┘                                          │
                                                                        ▼
      ┌──────────────────────┐                             ┌──────────────────────┐
      │ Pygame Display Engine│ ◄── [ Renders UI & Feedback]│ Pymunk 2D Physics    │
      └──────────────────────┘                             └──────────────────────┘
                                                                        │
                                                            Collision Callbacks:
                                                            - Like / Unlike
                                                            - Play / Pause
                                                            - Next Track (Random)
                                                            - Volume Control (+/-)
```

### Core Components

1. **MediaPipe Hand Landmarker (`hand_landmarker.task`):**
   * Processes the webcam input stream asynchronously (`LIVE_STREAM` mode).
   * Extracts 3D landmark coordinates and tracks the index fingertip (Landmark index `8`).

2. **Pymunk Physics Space:**
   * Maps hand tracking coordinates to a kinematic body moving within a 2D physics simulation.
   * Defines static circle bodies representing UI interaction triggers:
     * **Heart (Like):** Toggles track favorite status.
     * **Pause:** Toggles real-time timer progression and state.
     * **Next:** Loads a random track from the library and resets track state.
     * **Volume Up / Down:** Increments or decrements volume level within bounds (`0` to `10`).

3. **Pygame Graphical Interface:**
   * Renders background layouts, song cover art, active track titles, volume indicators, and playback timers at 60 FPS.

---

### Controls & Gesture Interactions

Hover your index finger over the corresponding control buttons at the top of the interface:

| Control Icon | Feature | Action |
| :---: | :--- | :--- |
| **Heart** | Like / Favorite | Toggles track "Liked" state (`corazonSI.jpg` / `corazonNO.jpg`). |
| **Pause** | Playback Toggle | Pauses or resumes the active track timer. |
| **Next** | Skip Track | Switches randomly to another song in the dictionary. |
| **Plus (+)** | Volume Up | Increases output volume (Max: `10`). |
| **Minus (-)** | Volume Down | Decreases output volume (Min: `0`). |

---

### Requirements & Installation

#### Prerequisites
* Python **3.8+**
* An active webcam connected to your device.

#### Installation Steps
1. Clone the repository and navigate to the project root:

```bash
cd practice-2
```

2. Install the required Python libraries:

```bash
pip install opencv-python mediapipe pygame pymunk numpy
```

3. Ensure hand_landmarker.task is placed in the project root directory alongside main.py.

### Execution

Run the application with:

```bash
python main.py
```

* **Keyboard Controls:** Press `ESC` on the OpenCV feedback window to close the application gracefully.