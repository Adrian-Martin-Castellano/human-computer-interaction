# Voice Applications and Multimodal Interfaces

**Course:** SIPC  
**Degree:** Computer Engineering (Grado en Ingeniería Informática)  
**Institution:** Universidad de La Laguna (ULL) - Escuela Superior de Ingeniería y Tecnología  
**Student:** Adrián Martín Castellano  
**Email:** alu0101547619@ull.edu.es  
**Academic Year:** 2024 – 2025  

---

## Course Overview

This repository contains all practical projects and assignments developed for the **Voice Applications and Multimodal Interfaces** course. The curriculum focuses on designing, implementing, and deploying human-computer interfaces using modern conversational platforms (voice-first skills), real-time computer vision frameworks, and physics-driven gesture interaction engines.

---

## Repository Structure

```text
.
├── practice-1/
│   ├── task-1-interaction-model/
│   │   └── interactionModel.json    # Alexa Voice Interface & Dialog Specifications
│   └── task-2-backend/
│       ├── index.js                 # AWS Lambda Node.js Fulfillment Code
│       └── package.json             # Node.js Dependencies & Configuration
│
└── practice-2/
    ├── hand_landmarker.task         # Pre-trained MediaPipe Hand Tracking Model
    ├── main.py                      # Gesture-controlled Player Entrypoint
    └── images/                      # UI Graphics & Album Covers
        ├── fondo.jpg
        ├── mano.png
        └── *.jpg / *.png            # Song Covers
```

## Summary of Practices

### [Practice 1: Alexa Skill "Remember Exam"](./practice-1)

A conversational voice application designed to assist university students in managing their upcoming academic exams via natural language interaction with Amazon Alexa.

* **Task 1 (Interaction Model):**
  * Custom slot types (`MonthType`, `subject`) with entity resolution synonyms.
  * Auto-delegation policies and slot validation prompts for dates and hours.
* **Task 2 (Backend Fulfillment):**
  * AWS Lambda backend implemented in Node.js using `ask-sdk-core`.
  * Session attribute management for storing and querying exam registration state.

---

### [Practice 2: MediaPipe Gesture-Controlled Music Player](./practice-2)

A multimodal, gesture-driven music player interface that processes real-time webcam video feeds to detect hand gestures and trigger media controls.

* **Real-time Computer Vision:** **MediaPipe Hand Landmarker** tracks index finger positioning (Landmark 8) asynchronously in live-stream mode.
* **Physics Engine:** **Pymunk** handles dynamic 2D collision detection between the user's cursor and UI interactive elements.
* **Graphical Rendering:** **Pygame** renders a Spotify-inspired interface featuring song metadata, volume controls, state-dependent button icons, and playback timers.

---

## Technologies & Stack

| Domain | Frameworks & Libraries | Languages |
| :--- | :--- | :--- |
| **Voice Interfaces** | Alexa Skills Kit (ASK) SDK v2, Alexa Developer Console | Node.js (JavaScript) |
| **Computer Vision** | MediaPipe Tasks (Hand Landmarker), OpenCV | Python 3.8+ |
| **GUI & Physics** | Pygame, Pymunk | Python 3.8+ |
| **Version Control** | Git, GitHub | Markdown |

---

## Getting Started

Refer to the individual practice documentation for detailed installation, execution, and deployment instructions:

* [Practice 1 Documentation](./practice-1)
* [Practice 2 Documentation](./practice-2)