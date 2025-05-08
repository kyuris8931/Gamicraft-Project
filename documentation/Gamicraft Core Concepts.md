This document outlines the fundamental philosophies, framework mechanics, and core systems that define Gamicraft. Gamicraft aims to go beyond typical gamification by deeply integrating real-life productivity with engaging custom game mechanics.

*(**Note:** This document provides a high-level overview. More details on specific systems or modules can be found in their respective files within this repository.)*

## Core Philosophies

Gamicraft is built upon several key principles:

* **High Modularity:** Gamicraft is not a single monolithic game, but a flexible **framework** allowing the creation and integration of various distinct "mini-game" **modules**. This enables high customization and continuous development. Module examples range from turn-based combat and farming simulations to integrations with external games like Minecraft .
    * ➡️ *Explore available modules in the [`/modules/`](../modules/) directory.*
* **"Growth to Win":** Real-life progress (e.g., completing tasks, exercising, learning) directly powers up your abilities within the game. The more productive you are, the stronger you become in Gamicraft.
* **"Productivity as Privilege":** Reverses the common paradigm where productive activities (especially challenging ones) are seen as burdens. In Gamicraft, engaging in these activities is a "privilege" that needs to be *unlocked* or *purchased* using in-game resources (like **Privilege Tickets**), adding a layer of psychological motivation.
    * ➡️ *Learn more about the [Privilege Tickets System](#privilege-tickets-system).*
* **User Empowerment ("Your Game, Your Rules"):** Giving users, including non-programmers, the ability to extensively customize their Gamicraft experience using the Tasker/KLWP foundation.
* **Short Play Sessions:** Interactions within Gamicraft modules, especially those requiring tickets, are designed to be brief (typically under 3 minutes per session) to integrate smoothly into daily routines without overshadowing real-world responsibilities.

## Key Framework Mechanics

The Gamicraft framework relies on several core mechanics to create a cohesive and motivating experience:

### 1. Deep Real-Life Integration (Two-Way Street)

This is the cornerstone of Gamicraft:

* **Productivity Fuels Gameplay:** Completing tasks in **LifeUp** generates resources like **Coins**, **EXP**, and contributes to leveling up **Attributes**. These resources power actions, progression, or acquisitions within game modules. Specific activities like exercise can directly boost character stats.
* **Gameplay Motivates Productivity (Privilege Ticket System):** As mentioned in the philosophies, certain productive activities require **Privilege Tickets** purchased with game resources (**Coins** or **Tokens**). This creates a loop where game progress enables more productivity.

### 2. Triple Currency Economy & Balancing

Gamicraft utilizes three primary currency types:

* **Coins:** Generally earned actively from completing tasks in LifeUp. Used for common purchases like Gacha pulls or Tickets.
* **Tokens:** Passively generated over time based on the user's LifeUp **Attribute** levels via the [`IDLE Life Tokens`](../modules/Idle_Life_Tokens/README.md) module. Tokens must be claimed periodically. There are six types of Tokens, corresponding to the six default LifeUp Attributes. Tokens are crucial resources for long-term systems like **Hero Ascension** and purchasing **Privilege Tickets**.
* **Diamonds:** A premium and rare currency, representing significant achievement or cross-game integration value. The primary planned source is through integration with external games like *Minecraft* (e.g., reaching milestones or farming within Minecraft). Used to bypass escalating cost mechanics, acquire unique/powerful items, or unlock premium cosmetic options.
    * ➡️ *See the [`Minecraft Integration`](../modules/Minecraft_Integration/README.md) concept for Diamond sources.*

**Anti-Inflation Mechanisms:**

* **Daily Escalating Costs (Coins & Tokens):** To maintain resource value and encourage daily engagement, the cost of purchasing items or tickets using Coins or Tokens increases with each purchase within the same day. This cost *resets* back to the base price each day. Token purchases often use a *triangular number sequence* (e.g., 10, 30, 60, 100 Tokens), while Coin purchases might use a linear sequence (e.g., 10, 20, 30, 40 Coins).
* **Diamond Purchases:** Generally bypass the escalating cost mechanic, offering a fixed price.

### 3. Stats, Growth & Life Level Cap

Game elements (like heroes or the player character) possess RPG-style stats.

* **Stat Growth:** Follows a combined Linear * Exponential formula for significant scaling as levels increase.
* **Life Level (Global Cap):** A global level derived from the total EXP earned across *all* real-life activities in LifeUp. This Life Level acts as a **hard cap** on the maximum level attainable by any game element (e.g., heroes). You *must* make real-life progress to unlock higher potential within Gamicraft.

### 4. Hero Ascension System

Beyond basic leveling (capped by Life Level), Gacha-obtained heroes can undergo **Ascension** to increase their Star Rank (e.g., ★1 to ★8) and unlock deeper potential.

* **Core Resources:** Requires *Hero-Specific Shards* (from Gacha duplicates) AND a substantial amount of *Tokens* (passively generated via LifeUp Attributes). The Token requirement increases significantly at higher Ascension levels, linking long-term hero power growth to consistent real-life productivity.
* **Upgrade Focus:** Provides impactful, non-stat upgrades, especially in early ranks (e.g., enhancing Talent effects, modifying Skills/Ultimates, unlocking new passive abilities). Higher ranks may offer additional stat boosts as long-term goals.
* **Life Level Integration:** Maximum attainable Ascension Rank might also be gated by achieving specific **Life Level** milestones.
* **Shard Accessibility:** A system for exchanging surplus Hero Shards or using Tokens to acquire needed shards (likely at a significant cost) will be implemented.
* **Distinction from Stat Seeds:** Permanent base stat increases are handled separately via rare consumable items ("Seeds"), possibly purchasable with Diamonds.

### 5. Core Motivational Loop

The intended gameplay cycle reinforces productivity:

1.  **Engage in Real-Life Productivity** -> Earn Coins, EXP (increases Attributes & Life Level), passively generate Tokens.
2.  **Use Resources** -> To Power/Engage with Game Modules OR Purchase "Tickets" for specific productive "privilege" activities.
3.  **Gain Rewards** -> From modules (items, currency) or benefits from ticketed activities (EXP, skills).
4.  **Higher Attributes** -> Generate Tokens faster -> More engagement/ticket purchases (Snowball Effect).
5.  **Repeat Cycle**.

### 6. Psychological Design Focus

Gamicraft heavily emphasizes motivational psychology, using concepts like *reverse psychology* (paying for the "privilege" to do a beneficial task), *anticipation*, *meaningful rewards*, and light *FOMO* elements to encourage engagement and positive habit formation.

## Core Systems Spotlight

Beyond the framework mechanics, specific core systems play vital roles:

### 1. Privilege Tickets System

This system is the primary implementation of the "Productivity as Privilege" philosophy.

* **Purpose:** To motivate engagement in specific productive activities by reframing them as "privileges" requiring tickets to access.
* **Ticket Types:** Six primary ticket types exist, each linked to a LifeUp Attribute and enabling a specific (often time-boxed) activity:
    * `Strength Ticket`: Grants a "Blank Exercise Card" to start the.
    * `Vitality Ticket`: Permits a "3-minute Recite Al-Qur'an" session (or similar mindfulness practice).
    * `Charisma Ticket`: Permits a "3-minute Streaming" session or extends a streaming time quota.
    * `Creativity Ticket`: Permits a "3-minute Reference Search" session (e.g., Pinterest).
    * `Intelligence Ticket`: Permits a "3-minute Anki Review" session (or similar focused learning).
    * `Endurance Ticket`: Grants a "3-minute Extend Task Time" permission to combat perfectionism.
* **Acquisition:** Tickets are primarily obtained by exchanging corresponding **Tokens** (daily escalating cost), purchasing with **Coins** (daily escalating cost), or randomly from Lapis Lazuli Bundles (from [`Minecraft Integration`](../modules/Minecraft_Integration/README.md)).
* **Usage:** Consuming a ticket from the inventory permits the player to engage in the associated activity.
* ➡️ *See the full [`System_Privilege_Tickets.md`](./System_Privilege_Tickets.md) document for more details.*

### 2. Exercise Progression System ("Exercise RPG")

A core module focused on gamifying physical exercises.

* **Purpose:** To motivate consistent physical activity via a structured leveling system for specific exercises (e.g., Push-ups, Skipping).
* **Core Gameplay Loop:**
    1.  Obtain a "Blank Exercise Card" (from a Strength Ticket).
    2.  Unlock the Lvl 1 definition.
    3.  Craft a "Level 1 Exercise Card" (using Exercise RPG Material from Minecraft Iron).
    4.  Perform the Lvl 1 exercise.
    5.  Track completion (use item in LifeUp).
    6.  Earn **Exercise Points** & **Strength EXP**.
    7.  Repeat Lvl 1 required times to unlock Lvl 2.
    8.  Craft Lvl 2 Card (from a new Blank Card + more materials), etc.
* **Exercise Points:** Used to generate **Keys** fueling the *Trials of Bravery* module in [`Minecraft Integration`](../modules/Minecraft_Integration/README.md).
* **Strength EXP:** Increases the LifeUp Strength Attribute.
* **Exercise Cards:** Represent mastery of an exercise level. Crafting higher-level cards requires Blank Cards and increasing amounts of Exercise RPG Material. Cards are fixed at the level they are crafted .
* **Unlocking Next Level:** Requires completing the current level multiple times (e.g., `Level * 10` times).
* **Alternative Tracking (Coins):** Players can buy daily limited "Session Permits" with Coins to perform exercises at unlocked levels *without* needing the crafted Exercise Card for that level.
* ➡️ *See the full [`System_Exercise_Progression.md`](./System_Exercise_Progression.md) document for more details.*

---
