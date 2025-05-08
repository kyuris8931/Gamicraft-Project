# Gamicraft Architecture Overview

This document provides a high-level overview of the core technology stack that powers the Gamicraft framework. Gamicraft is designed to run primarily on the **Android platform**.

## Core Components

Gamicraft leverages the synergy between several key Android applications and tools to achieve its deep integration between real-life activities and game modules:

1.  **LifeUp (Gamification/Habit Tracker)**
    * **Role:** **Primary Data Source**
    * **Function:** Tracks user's real-life tasks, habits, skills, and associated rewards like **Coins** and **EXP**. It also manages the user's core **Attributes** (e.g., Strength, Intelligence) and **Life Level**, which are fundamental inputs for Gamicraft's mechanics. Gamicraft reads this data to fuel its modules.

2.  **Tasker (Automation Tool)**
    * **Role:** **Automation Engine & Core Logic Hub**
    * **Function:** Acts as the central "brain" of Gamicraft. Tasker profiles and tasks are responsible for:
        * Reading data periodically from LifeUp (e.g., task completions, attribute levels).
        * Executing the core logic for various Gamicraft **modules** and **systems**.
        * Managing game state data (often using variables or JSON files).
        * Triggering events and sending data to KLWP for UI updates.
        * Receiving user input triggers from KLWP.
        * Potentially interacting with other apps or services as needed (e.g., sending commands for Minecraft Integration via RCON).

3.  **KLWP (Kustom Live Wallpaper Maker)**
    * **Role:** **UI/UX Layer**
    * **Function:** Provides the visual interface for Gamicraft modules. KLWP themes are used to:
        * Display game module interfaces (e.g., Turn-Based Combat screen, IDLE Life Token vaults).
        * Visualize data processed and sent by Tasker (e.g., HP bars, Token counts, stats).
        * Provide interactive elements (buttons, touch zones) that trigger Tasker actions when the user interacts with them.

4.  **JavaScriptlets (within Tasker)**
    * **Role:** **Complex Logic Execution**
    * **Function:** Used within Tasker tasks to handle more complex calculations, data manipulation (like advanced JSON processing), or algorithms that would be inefficient or overly cumbersome to implement using only standard Tasker actions [Source: 253].

## How It Works: The Synergy

The Gamicraft experience emerges from the interaction between these components:

1.  **Data Input:** The user interacts with **LifeUp**, completing tasks and making real-life progress.
2.  **Logic Processing:** **Tasker** periodically reads data from LifeUp, processes it according to the rules of active Gamicraft modules (potentially using **JavaScriptlets** for complex parts), updates the internal game state, and determines what needs to be displayed.
3.  **Visual Output & Interaction:** Tasker sends the relevant data to **KLWP**, which updates the live wallpaper interface to reflect the current game state. User interactions on the KLWP interface (e.g., tapping a "Claim Tokens" button) trigger specific Tasker tasks to handle the action.

This architecture allows for a highly flexible and customizable system where different modules can be developed and integrated relatively independently, all orchestrated by Tasker and visualized through KLWP, fueled by the user's real-life data from LifeUp.

## Potential Future Integrations & Ecosystem Components

While the core architecture relies on LifeUp, Tasker, and KLWP, the Gamicraft framework is designed with modularity in mind, opening possibilities for future integrations with other platforms or services to enhance the experience. These are conceptual and not part of the current required stack:

* **Discord:** Could potentially be integrated for community features, notifications, or even simple multiplayer interactions managed via bots that communicate with Tasker.
* **Smartwatches (Wear OS/Other):** Might offer companion apps for quick interactions, like feeding a virtual pet module, tracking short exercises, or receiving Gamicraft notifications directly on the wrist.
* **Web Services/APIs:** Tasker's networking capabilities could allow integration with external APIs or webhooks for more complex data exchange or cross-platform features .
* **Other Tracking Apps:** While LifeUp is the primary data source, future adapters could potentially allow reading data from other habit or fitness trackers if their APIs or data export methods are accessible to Tasker.

---