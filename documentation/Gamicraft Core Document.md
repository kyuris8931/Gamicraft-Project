# 📌 Gamicraft Project Overview & Brand

## 📖 1.1 Overview

**Gamicraft** is a YouTube channel and a broader project focused on gamification, but with a unique twist. Unlike other gamification approaches, it provides custom mini-games designed to make real-life productivity more meaningful through modular game elements derived from general game concepts (e.g., turn-based battles, farming simulations).

A core philosophy involves transforming activities often seen as burdens into engaging **"privileges"** within the system.

Gamicraft concentrates on creating these game modules and systems. There is also a sister channel, **Gamilife**, which focuses on self-improvement and human behavioral science, presented through game analogies and gamification narratives or stories.

---

## 🎯 1.2 Reason & Inspiration

Gamicraft addresses the common desire to play games or engage in "unproductive" scrolling while mitigating associated guilt. Inspired by **LifeRPG** and platforms like **Habitica**, it aims for a deeper integration by creating actual game mechanics that seamlessly blend with real life.

A key goal is to make standard gamification rewards, like **Coins** earned from completing tasks in LifeUp, more meaningful than simple gratification (e.g., redeeming for treats or game time). In Gamicraft:

- **Coins** and **passively generated Tokens** (tied to LifeUp attribute levels) become crucial resources used to progress within game modules.
    
- These resources can be used for summoning heroes, buying virtual livestock, or purchasing "Tickets" required to engage in certain productive "privilege" activities.
    
- This creates a robust core loop:
    
    > **Productivity → Powering Mini Games → Earning Rewards/Treats → Enabling More Productivity (via Tickets/Items).**
    

Conversely, in-game achievements can also yield real-life rewards. The central principle remains: **the more productive users are, the more powerful they become in-game, leading to potentially more rewards (both virtual and real).**

---

## 🔧 1.3 How This Works

Gamicraft utilizes:

- **LifeUp**: As the productivity/habit-tracking app, providing Coins/EXP for tasks and serving as the source for Attribute levels that passively generate Tokens.
    
- **Tasker**: As the automation engine, reading LifeUp data, triggering events, manipulating game data (JSON), and running module logic (JavaScript).
    
- **KLWP**: As the UI/UX layer, displaying game modules with a modern touch based on the data processed by Tasker.
    

This combination allows immense flexibility in creating diverse game modules fueled by productivity.

---

## 💡 1.4 Content Messages

- **Insightful**: Creating modular game designs that tap into human psychology and self-improvement concepts.
    
- **Inspirative**: Sharing diverse possibilities for modular games blended with real-life activities or adapting typical game genres (e.g., Exercise RPG).
    

---

## 🔖 1.5 Tagline

> **"Modular Gamification Systems"**

---

## 🎨 1.6 Brand Visual

- Utilizes a **blueprint theme** as a core brand element.
    
- Object designs feature **white strokes with hatching shader details**, evoking a technical/design aesthetic.
    

---

# ⚙️ Core Gamicraft Principles & Framework Mechanics

## 🏗️ 2.1 Modular Framework

Gamicraft is not a single, monolithic game but a **flexible, modular framework**. It allows for the creation and integration of various distinct "mini-game" modules.

### Examples of potential or developed modules:

- Turn-Based Combat ⚔️
    
- Virtual Pets (Tamagotchi-style) 🐾
    
- Farming Simulation 🌾
    
- Idle Token Generation ⏳
    
- Dungeon Dice (Dice-based exploration) 🎲
    
- Deep integration with external games like **Minecraft** 🏗️
    

---

## 🔗 2.2 Deep Real-Life Integration (Two-Way Street)

Integration works in two primary directions:

1. **Productivity Fuels Gameplay**:
    
    - Completing real-life tasks (**tracked via LifeUp**) generates essential resources like **Coins, EXP**, and contributes to leveling up LifeUp Attributes.
        
    - These resources power actions, progression, or acquisition within game modules.
        
    - Specific actions like **exercise can directly boost character stats**.
        
2. **Gameplay Enables/Motivates Productivity (Privilege & Ticket System)**:
    
    - Certain productive activities (**e.g., Exercise, Reading Al-Qur'an, Anki reviews**) are transformed into "privileges".
        
    - Accessing these activities requires spending in-game resources (Coins and/or Tokens) to acquire specific "Tickets" (**e.g., "Exercise Ticket", "3-Min Reading Ticket"**).
        

---

## 💰 2.3 Triple Economy & Balancing (Coins, Tokens, Diamonds)

The system utilizes three primary resources:

- **Coins**: Earned actively by completing tasks in LifeUp.
    
- **Tokens**: Passively generated based on LifeUp Attribute levels; must be claimed periodically like an idle game.
    
- **Diamonds**: A premium currency, sourced via external game integrations (e.g., Minecraft milestones) or rare achievements.
    

🔹 **Balancing Mechanics**:

- **Anti-Inflation Mechanism**: Purchases (especially with Tokens) use an escalating cost system (e.g., 1st purchase = 10 Tokens, 2nd = 30, 3rd = 60...).
    
- **Daily Reset**: Escalating Coin costs for items reset daily to maintain economic balance.
    
- **Diamond Purchases**: Bypass escalating costs but have high fixed prices.
    

---

## 📊 2.4 Stats, Growth & The Life Level Cap

- All game elements (heroes, pets, even the player) possess RPG-style **stats**.
    
- **Stat growth follows a combined Linear + Exponential formula**:
    
    > **Base * (1 + Level * 0.1) * (1.025 ^ Level)**
    
- A global **"Life Level" (based on real-life EXP in LifeUp) acts as a cap** on in-game progression.
    

### 🏅 Hero Ascension System:

- Heroes can ascend from **★1 to ★8**, unlocking new skills and stat boosts.
    
- Ascension requires **Hero-Specific Shards + Tokens**, linking hero growth to real-life productivity.
    

---

## 🔄 2.5 Core Motivational Loop

1. **Engage in Real-Life Productivity** → Earn Coins, EXP, and passively generate Tokens.
    
2. **Use resources to interact with game modules** (e.g., battle, care for pets) OR **purchase "Tickets" for productive activities**.
    
3. **Gain rewards** (items, currency, treats) and skill benefits.
    
4. **Higher attributes generate Tokens faster**, enabling more engagement.
    
5. **Cycle repeats**, linking real progress with game progress.
    

---

## ⏳ 2.6 Short Play Sessions Principle

- Designed for **quick interactions (under 3 minutes per session)**.
    
- Lowers engagement barriers (**"It's just 3 minutes!"**).
    
- Aligns with casual game engagement patterns.
    

---

## 🧠 2.7 Psychological Design Focus

- Uses **reverse psychology** (paying for the "privilege" to do beneficial tasks).
    
- Encourages **anticipation, meaningful rewards, and light FOMO elements**.
    

---

## 🔬 2.8 Technical Foundation

- **LifeUp**: Habit tracking & data source 📊
    
- **Tasker**: Automation engine & logic 💻
    
- **KLWP**: UI/UX for game visualization 🎨
    

By combining **habit tracking, automation, and gamification**, Gamicraft creates a **seamless and engaging productivity game**. 🚀
