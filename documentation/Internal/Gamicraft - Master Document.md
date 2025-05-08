# Gamicraft - Master Document v2.0

Last Updated: May 8, 2025

Status: Draft Revision - Reflecting New Architectural Vision

This document serves as the central source of truth for Gamicraft's core concepts, fundamental mechanics, and foundational design principles. It focuses on the framework itself, with lore elements kept subtle.

## Section 1: Introduction & Gamicraft Vision

### 1.1. What is Gamicraft?

Gamicraft is a unique, modular gamification framework primarily designed for the Android platform, with the potential for broader integration. Its core purpose is to deeply integrate real-life productivity, habits, and activities (primarily tracked via LifeUp) with engaging, customizable digital experiences and game modules. It aims to make self-improvement more meaningful and engaging by bridging the gap between tangible real-world effort and interactive system feedback. The new architectural vision emphasizes a distributed model where individual game modules can be developed using "full code" (e.g., JavaScript-based PWAs/WebViews) for enhanced collaboration and modernity, with Tasker acting as a central orchestrator and bridge to the core Gamicraft system and external Android functionalities.

### 1.2. Core Philosophies

Gamicraft is built upon several key philosophical pillars:

- **Growth to Win:** Real-world progress and effort are the fundamental drivers of advancement and capability within the Gamicraft system.
    
- **Productivity as Privilege:** Reframing potentially burdensome productive activities as valuable opportunities accessed or unlocked through the system's mechanics.
    
- **High Modularity & Customization:** Gamicraft is designed as a flexible framework. Modules can be independent, "full code" applications or simpler Tasker/KLWP integrations, allowing users to add, remove, or modify various distinct experiences.
    
- **User Empowerment (Your Game, Your Rules):** Granting users significant freedom to choose their goals, define their own 'quests', customize their Gamicraft experience, and even contribute to module development.
    
- **Short Play Sessions (for some modules):** Interactions with certain Gamicraft modules are designed to be brief (~1-3 minutes) to integrate easily into daily routines, while others might offer more extensive gameplay.
    

### 1.3. Goals & Target Audience

- **Primary Goal:** To establish Gamicraft as a leading framework for deep, customizable real-life gamification, build an active community, and achieve project sustainability.
    
- **Target Audience:** Individuals interested in deep gamification, productivity enhancement, self-improvement, Android customization, RPG mechanics applied to real life, innovative technology applications, and potentially collaborative development.
    

### 1.4. Technical Foundation (Revised Architecture)

Gamicraft leverages a synergistic and distributed architecture:

- **Platform:** Primarily Android, with Gamicraft modules potentially being cross-platform (e.g., PWAs).
    
- **Core Data Backbone (The "Universal Save File"):**
    
    - **Central JSON Data:** A master JSON file (or set of files) managed by Tasker, storing all core Gamicraft data: player stats (Attributes, EXP, Coins, Tokens, Life Level), inventory, module states, hero data, achievements, etc. This acts as the universal "save file" for the Gamicraft ecosystem.
        
- **Core Orchestrator & System Bridge (Tasker):**
    
    - **Tasker:** Remains a crucial component on Android, acting as the central "Gamicraft Core Service" or "System Bridge."
        
    - **Responsibilities:**
        
        - Managing and modifying the Central JSON Data.
            
        - Integrating with LifeUp for real-world activity tracking.
            
        - Launching and providing initial data to "full code" game modules.
            
        - Receiving and processing results from game modules to update the Central JSON Data and LifeUp.
            
        - Bridging Gamicraft data/events with external applications (e.g., Minecraft via RCON) or Android system events.
            
        - Executing core Gamicraft system logic (potentially via JavaScriptlets operating on the Central JSON).
            
- **Game & Interactive Modules ("Full Code" & Others):**
    
    - **"Full Code" Modules (e.g., PWAs, WebViews):** Interactive game modules (like TBC) will primarily be developed using standard web technologies (HTML, CSS, JavaScript) or other "full code" languages.
        
        - **Self-Contained Logic:** These modules will contain their own gameplay logic, UI, and potentially temporary session states.
            
        - **GitHub Collaboration:** Code for these modules will reside on GitHub, allowing for standard development practices (version control, PRs, issues) and easier AI/human collaboration.
            
        - **Communication with Tasker:** Modules will communicate with Tasker to receive initial state data from the Central JSON and to report results/changes back to Tasker for updating the Central JSON.
            
    - **Simpler/Utility Modules:** Tasker profiles/tasks and KLWP presets can still be used for simpler utility modules, passive information displays, or quick interactions.
        
- **Presentation Layer (Optional - KLWP):**
    
    - **KLWP (Kustom Live Wallpaper Maker):** Can serve as an ambient Gamicraft dashboard on the Android homescreen, displaying key information (stats, notifications) pulled from the Central JSON Data (via Tasker). Its role shifts away from complex interactive gameplay.
        
- **Logic Implementation:**
    
    - **Module-Specific Logic:** Resides within each "full code" module (e.g., JavaScript for a PWA TBC module).
        
    - **Gamicraft Core Logic & Orchestration:** Handled by Tasker, potentially utilizing JavaScriptlets for complex data manipulation or rule enforcement on the Central JSON.
        

## Section 2: Core Universe Concepts (Gamicraft Context)

_(Important Note: For narrative purposes and immersion within the Gamicraft novel adaptation, some specific technical implementation details are abstracted. For instance, the Central JSON and Tasker's orchestration represent the 'Gamicraft Engine's' backend, and data sources like LifeUp are abstracted into the base Nexus Interface's internal attribute tracking system.)_

### 2.1 The Premise: Reality & Interface

Gamicraft operates within the Physical Reality, where common AR gamification services might exist. However, rare individuals known as The Anomalies can, through specific technology or traits, activate a true Nexus Interface, enabling interaction with a deeper layer of reality.

### 2.2 The Core Energy: The Aether

The Nexus Interface allows Anomalies to interact with The Aether, the fundamental energy substrate. Real-world effort allows Anomalies to draw upon or generate Aether, which fuels manifestations and serves as the basis for resources like Coins and Tokens (stored and tracked in the Central JSON Data).

### 2.3 The Users: Anomalies vs. Standard Users

Standard Users experience only surface-level gamification. Anomalies, via the Nexus Interface and The Aether, can achieve Local Manifestation of tangible rewards and effects, reflected and managed within the Gamicraft system.

### 2.4 The Player Character: Kyuris & The Gamicraft Engine

Kyuris (MC) is a unique "Modder Anomaly" who constructs and interacts with the Gamicraft system.

- **Gamicraft System (Lore Representation):** The combination of the Central JSON Data, Tasker's orchestration, and the various modules (both "full code" and simpler ones) represents Kyuris's personalized "Gamicraft Engine."
    
- **Interaction Model:** Kyuris interacts with modules that read from and report to the Central JSON Data, with Tasker ensuring system integrity and integration with real-world inputs (LifeUp). This grants deep customization and control over Aetheric interactions.
    

### 2.5 Foundational Balancing: Backlash

Manipulating The Aether requires balance. Attempting to draw excessive energy or rewards compared to real-world effort, or instability within a module, triggers Backlash – a negative consequence reinforcing the need for measured growth and system understanding. Tasker might enforce some balancing rules based on the Central JSON data.

### 2.6 Further Exploration

Detailed explanations of the lore, characters, factions, entities, and narrative elements are available in the dedicated `Gamicraft - Lore Compendium`.

## Section 3: Core Framework Mechanics [Lore De-emphasized]

These are the fundamental mechanics driving the Gamicraft framework under the new architecture:

### 3.1. Deep Real-Life Integration:

The core loop where tracked real-life activities (via LifeUp) are processed by Tasker to update the Central JSON Data (progress, resources like Coins, EXP), directly influencing potential within the Gamicraft system.

### 3.2. The Triple Economy (Managed in Central JSON):

The system utilizes distinct resource types, all tracked within the Central JSON Data:

- **Coins:** Standard currency earned primarily through completing user-defined tasks/goals or module activities. Used for various in-system purchases (e.g., Gacha pulls, Privilege Tickets).
    
- **Tokens:** Resources representing accumulated potential, often linked to long-term progress (e.g., LifeUp Attribute levels). Generated passively (e.g., via an IDLE Tokens module reading/writing to Central JSON) and used for significant upgrades or systems.
    
- **Diamonds:** A premium or rare resource, potentially obtained from high-level achievements or specific module interactions. Used for high-value exchanges.
    

### 3.3. Privilege Tickets:

An in-system mechanic allowing access to specific gamified tasks, modules, or activities, typically acquired using Coins or Tokens. Represents unlocking opportunities within the framework, managed via the Central JSON.

### 3.4. Anti-Inflation / Daily Resets:

Standard game design mechanics can be implemented (e.g., by Tasker logic or within specific modules) to maintain resource balance, with relevant flags or counters in the Central JSON.

### 3.5. Stats, Growth & Life Level Cap:

RPG-style stats apply to elements within the system (Kyuris's potential, Heroes). Growth follows defined formulas, and overall potential is capped by a global "Life Level" derived from total real-life EXP. All these are stored and updated in the Central JSON Data. "Full code" modules would fetch these stats from Tasker.

### 3.6. Hero System (Overview):

- **Representation:** Heroes represent allies, abilities, or personified potentials. Data for acquired heroes, their levels, and stats are stored in the Central JSON.
    
- **Acquisition:** Primarily obtained via an in-system Gacha mechanic (could be a "full code" module or Tasker-driven) interacting with the Central JSON.
    
- **Progression (Ascension):** A long-term system to enhance Heroes, requiring resources (Tokens, duplicate data/shards) tracked in the Central JSON.
    

### 3.7. Module Interaction Protocol (Conceptual):

- **Data Exchange:** "Full code" modules will typically:
    
    1. Be launched by Tasker.
        
    2. Receive an initial state/data snapshot (a relevant subset of the Central JSON) from Tasker.
        
    3. Run their internal gameplay loop.
        
    4. Report results (e.g., EXP gained, Coins earned, items used/acquired, state changes) back to Tasker.
        
    5. Tasker then validates and updates the Central JSON Data accordingly.
        
- **API/Interface:** A simple, well-defined interface (e.g., specific JSON structures for requests/responses, Tasker Intents, or JavaScriptInterface for WebViews) will be necessary for communication between Tasker and "full code" modules.
    

## Section 4: The Core Motivational Loop

The intended cycle reinforcing productivity and engagement:

Real-Life Activity (Tracked by LifeUp) -> Tasker updates Central JSON (Earn Resources/EXP) -> User engages with a Gamicraft Module (which reads initial state from Central JSON via Tasker) -> Module gameplay -> Module reports results to Tasker -> Tasker updates Central JSON (Gain Rewards / Progress) -> Enhanced Potential (e.g., new stats, faster Token generation reflected in Central JSON) -> Repeat.

## Section 5: Guiding Principles Summary (Design Focus) [Revised]

These principles guide the design and development of the Gamicraft framework:

- **Real-Life Integration Focus:** The primary goal is to create meaningful links between real-world actions/progress and the digital gamification experience, with LifeUp and Tasker as key integrators to the Central JSON.
    
- **Modularity & Decoupling:** Design the system as a core framework (Tasker + Central JSON) allowing for independent, interchangeable modules. "Full code" modules operate with their own logic but sync with the core.
    
- **Customizability & Extensibility:** Provide deep customization options. The new architecture allows for more diverse module types and easier contribution from others on "full code" modules via GitHub.
    
- **User Empowerment:** Give users control over their goals, progression paths, and how they interact with the system ("Your Game, Your Rules").
    
- **Growth to Win:** Ensure real-world effort and development are the primary drivers for meaningful progress within the system, reflected in the Central JSON.
    
- **Collaborative Potential:** Architect modules (especially "full code" ones) to be understandable, maintainable, and shareable on platforms like GitHub to facilitate AI and human collaboration.
    
- **Balanced Systems:** Design mechanics (economy, progression) to be engaging and sustainable long-term, with core rules potentially enforced by Tasker based on the Central JSON.
    
- **(Subtle Lore Hint):** Allow for emergent or unexpected experiences based on user interaction and system depth, as the "Gamicraft Engine" responds to the Anomaly's journey.