# Alexa Skills Development: Remember Exam (Practice 1)

**Course:** SIPC
**Institution:** Universidad de La Laguna (ULL) - Escuela Superior de Ingeniería y Tecnología  
**Author:** Adrián Martín Castellano  
**Email:** alu0101547619@ull.edu.es  
**Date:** Nov 2024

---

## Overview

This repository contains the full implementation for **Practice 1**, which focuses on building an Alexa Skill titled **"Remember Exam"**. The goal of the skill is to help students keep track of their upcoming academic exams through interactive voice conversations.

The project is structured into two main tasks:
1. **Task 1 (Interaction Model):** Voice interface specification, including intents, slots, custom slot types, dialog management rules, and slot validation prompts.
2. **Task 2 (Backend Fulfillment):** Node.js AWS Lambda backend built with the ASK SDK v2 (`ask-sdk-core`), responsible for processing user requests, validating slots, and maintaining session state.

---

## Project Structure

```text
practice-1/
├── task-1-interaction-model/
│   └── interactionModel.json    # Alexa Voice Interface & Dialog Model
└── task-2-backend/
    ├── index.js                 # Lambda Request Handlers & Business Logic
    └── package.json             # Node.js Dependencies & Configuration
```

### Architecture & Core Features

#### Task 1: Voice Interaction Model (`interactionModel.json`)

* **Custom Slot Types:**
  * `MonthType`: Maps calendar months to numeric IDs (`1` to `12`).
  * `subject`: Defines academic subjects with built-in synonyms (e.g., *"AI"* for *Artificial Intelligence*, *"DB"* for *Databases*).
* **Dialog Management & Auto-Delegation:**
  * Uses the `ALWAYS` delegation strategy to automatically manage multi-turn conversations.
  * Elicits missing slot values (`day`, `month`, `year`, `hour`, `subject`) sequentially before sending the request to the backend.
* **Built-in Validation Rules:**
  * **Day:** Must be a number between `1` and `31`.
  * **Hour:** Must be a four-digit number between `0000` and `2359`.
  * **Month:** Strictly checked against defined entity resolution matches.

---

#### Task 2: Backend Logic (`index.js`)

* **`LaunchRequestHandler`:** Welcomes the user and prompts them to register or query an exam.
* **`RegisterExamIntentHandler`:** Extracts fully validated slot inputs, formats time values (e.g., `0900` $\rightarrow$ `09:00`), and persists the exam details inside **Session Attributes**.
* **`SayExamIntentHandler`:** Retrieves saved exam information from session state and reads it back to the student.
* **Built-in Alexa Handlers:** Implements standard behavior for `HelpIntent`, `CancelIntent`, `StopIntent`, `FallbackIntent`, and error handling.

---

### Getting Started & Deployment

#### Prerequisites
* An active **Amazon Developer Account** and **AWS Account** (or Alexa Hosted Skills environment).
* Node.js **v14.x** or higher installed locally.

#### Installation & Local Setup
1. Navigate to the backend directory:
   ```bash
   cd practice-1/task-2-backend
   ```
2. Install the required ASK SDK dependencies:
   ```bash
   npm install
   ```
   #### Deployment Steps

1. **Import Interaction Model:**
   * Open the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
   * Go to **Build** $\rightarrow$ **Interaction Model** $\rightarrow$ **JSON Editor**.
   * Paste the contents of `task-1-interaction-model/interactionModel.json` and click **Save Model**, then **Build Model**.

2. **Deploy Code Backend:**
   * Go to the **Code** tab in the developer console (or your AWS Lambda function).
   * Copy `index.js` and `package.json` into the root execution folder.
   * Click **Save** and **Deploy**.

---

### Intent Reference & Invocation

* **Invocation Name:** `remember exam`

| Intent Name | Utterance Examples | Description |
| :--- | :--- | :--- |
| `RegisterExamIntent` | *"register my exam"*, *"add an exam"*, *"15 of June"* | Triggers the dialog flow to collect exam date, time, and subject. |
| `SayExamIntent` | *"when is the exam"* | Reads back the currently stored exam from the session attributes. |
| `AMAZON.HelpIntent` | *"help"*, *"what can I do"* | Provides guidance on how to use the skill. |
| `AMAZON.StopIntent` | *"stop"*, *"bye"* | Gracefully closes the session. |

### Example Dialog Flow

```text
User:  "Alexa, open remember exam"
Alexa: "Welcome to Remember Exam! You can register an exam or ask me when your exam is. What would you like to do?"

User:  "Register my exam"
Alexa: "Okay, what day?"

User:  "15"
Alexa: "In which month?"

User:  "June"
Alexa: "In which year?"

User:  "2026"
Alexa: "At what time?"

User:  "1000"
Alexa: "What subject is the exam for?"

User:  "AI"
Alexa: "Got it! I have registered your Artificial Intelligence exam for June 15, 2026 at 10:00."
```