# Section 1: Gamicraft Project Overview & Brand

## 1.1. Overview

Gamicraft is a YouTube channel and broader project focused on gamification, but with a unique twist. Unlike other gamification approaches, it provides custom mini-games designed to make real-life productivity more meaningful through modular game elements derived from general game concepts (e.g., turn-based battles, farming simulations). A core philosophy involves transforming activities often seen as burdens into engaging "privileges" within the system.

Gamicraft concentrates on creating these game modules and systems. There is also a sister channel, Gamilife, which focuses on self-improvement and human behavioral science, presented through game analogies and gamification narratives or stories.

## 1.2. Reason & Inspiration

Addressing the common desire to play games or engage in "unproductive" scrolling, while mitigating associated guilt, Gamicraft draws inspiration from LifeRPG and platforms like Habitica but aims for a deeper integration. It seeks to elevate gamification by creating actual game mechanics seamlessly blended with real life.

A key goal is to make standard gamification rewards, like Coins earned from completing tasks in LifeUp, more meaningful than simple gratification (e.g., redeeming for treats or game time). In Gamicraft, Coins, alongside passively generated Tokens (tied to LifeUp attribute levels), become crucial resources used to progress within game modules – for example, summoning heroes, buying virtual livestock, or purchasing "Tickets" required to engage in certain productive "privilege" activities.

This creates a robust core loop:

**Productivity → Powering Mini Games → Earning Rewards/Treats → Enabling More Productivity (via Tickets/Items).**

Conversely, in-game achievements can also yield real-life rewards. The central principle remains: **The more productive users are, the more powerful they become in-game, leading to potentially more rewards (both virtual and real).**

## 1.3. How This Works

Gamicraft utilizes:

- **LifeUp:** As the productivity/habit-tracking app, providing Coins/EXP for tasks and serving as the source for Attribute levels which passively generate Tokens.
    
- **Tasker:** As the automation engine, reading LifeUp data, triggering events, manipulating game data (JSON), and running module logic (JavaScriptlets).
    
- **KLWP:** As the UI/UX layer, displaying the game modules with a modern touch based on the data processed by Tasker.
    

This combination allows immense flexibility in creating diverse game modules fueled by productivity.

## 1.4. Content Messages

- **Insightful:** Creating modular game designs that tap into human psychology and self-improvement concepts.
    
- **Inspirative:** Sharing diverse possibilities for modular games blended with real-life activities or adapting typical game genres (e.g., Exercise RPG).
    

## 1.5. Tagline

**"Modular Gamification Systems"**

## 1.6. Brand Visual

- Utilizes a **blueprint theme** as a core brand element.
    
- Object design features **white strokes**, often with **hatching shader details**, evoking a technical/design aesthetic.
    

---

# Section 2: Core Gamicraft Principles & Framework Mechanics

Gamicraft is built upon several core principles and framework mechanics designed to create a unique, motivating, and sustainable gamified experience integrated with real life.

## Modular Framework

Gamicraft is not a single, monolithic game but a flexible, modular framework. It allows for the creation and integration of various distinct "mini-game" modules.

Examples of potential or developed modules include:

- **Turn-Based Combat**
    
- **Virtual Pets (Tamagotchi-style)**
    
- **Farming Simulation**
    
- **Idle Token Generation**
    
- **Dungeon Dice (dice-based exploration)**
    
- **Deep integration with external games like Minecraft**
    

## Deep Real-Life Integration (Two-Way Street)

This is the cornerstone of Gamicraft. Integration works in two primary directions:

1. **Productivity Fuels Gameplay:** Completing real-life tasks (tracked via LifeUp) generates essential resources like Coins, EXP, and contributes to leveling up LifeUp Attributes. These resources power actions, progression, or acquisition within game modules. Specific actions like exercise can also directly boost character stats.
    
2. **Gameplay Enables/Motivates Productivity (Privilege & Ticket System):** Certain productive activities (often seen as chores or difficult habits, e.g., Exercise, Reading, Anki reviews, focused learning) become "privileges." Accessing these activities requires spending in-game resources (Coins and/or Tokens) to acquire specific "Tickets" (e.g., "Exercise Ticket", "3-Min Reading Ticket").
    

## Dual Economy & Balancing (Coins & Tokens)

The system utilizes two primary resources:

- **Coins:** Typically earned actively by completing tasks in LifeUp. Used for various purchases like Gacha pulls or Tickets.
    
- **Tokens:** Passively generated over time based on the levels of the user's LifeUp Attributes. These must be claimed periodically to avoid overflow (like an idle game mechanic).
    

### Anti-Inflation Mechanism

To maintain economic balance and ensure rewards feel valuable:

- Purchasing items or Tickets (especially with Tokens) follows an **escalating cost system**, often based on a triangular number sequence (e.g., 1st purchase = 10 Tokens, 2nd = 30, 3rd = 60...).
    
- This cost resets daily, introducing a light **FOMO (Fear Of Missing Out)** element and preventing hyperinflation when redeeming rewards like real-life treats.
    

## Stats, Growth & The Life Level Cap

Game elements (like heroes, pets, or even the player character) possess **RPG-style stats**.

- **Stat growth** follows a **Linear * Exponential formula** (Base * (1 + Level * 0.1) * (1.025 ^ Level)), allowing for significant scaling.
    
- A global **"Life Level"** (derived from total EXP earned across all real-life activities tracked in LifeUp) acts as a **hard cap** on the maximum level attainable by game elements.
    
- Users must make **real-life progress** to raise their Life Level and unlock higher potential within Gamicraft modules.
    

## Core Motivational Loop

The intended gameplay cycle reinforces productivity:

1. **Engage in Real-Life Productivity** → Earn Coins, EXP (increases Attributes & Life Level), and passively generate Tokens.
    
2. **Use resources to Power/Engage with Game Modules** (e.g., fight battles, feed pets) OR **Purchase "Tickets"** to enable specific productive "privilege" activities.
    
3. **Gain Rewards** from modules (items, currency, treats) or benefits from ticketed activities (EXP, skill).
    
4. **Higher attributes generate Tokens faster**, allowing more engagement or ticket purchases (**Snowball Effect**).
    
5. **Cycle repeats**, linking real progress with game progress and motivation.
    

## Short Play Sessions Principle

- Interactions within Gamicraft modules, especially activities requiring "Tickets," are often designed to be **brief (under 3 minutes per session).**
    
- This lowers the **barrier to entry** ("It's just 3 minutes!"), aligns with **casual game engagement patterns**, and reinforces the focus on **real-life priorities** rather than long, immersive gaming sessions.
    

## Psychological Design Focus

Gamicraft heavily emphasizes **motivational psychology**, using:

- **Reverse psychology** (paying for the "privilege" to do a beneficial task).
    
- **Anticipation, meaningful rewards, and light FOMO elements** to encourage engagement and habit formation.
    

## Technical Foundation

The framework relies on:

- **LifeUp** (data source, habit tracking).
    
- **Tasker** (automation, logic engine via JavaScriptlets).
    
- **KLWP** (flexible UI/UX layer) on Android.