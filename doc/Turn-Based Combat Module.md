# 📜 Section 1: Module Overview & Concepts

## 🏗️ Version: Draft 2.0 - [Date: March 31, 2025]

### 🎯 1.1. Module Purpose within Gamicraft
The **Turn-Based Combat** module remains a core interactive gameplay component for the **Gamicraft** framework [source: 1, 13]. It provides users with short, engaging battle sessions where their main character (**Kyuris**) and collected heroes face various opponents. 

- **Primary Uses:**
  - Utilize collected heroes (obtained via the **Gacha system** [source: 4, 239])
  - Manage combat resources like **Skill Points (SP)**
  - Earn diverse rewards (**in-game resources, real-life treats, progress**) within the Gamicraft ecosystem [source: 133, User Context].
- **Design Philosophy:**
  - Battle sessions are designed to be brief (**typically under 3 minutes**) to integrate smoothly with daily life [source: 5, 115].

---

### 🔁 1.2. Core Gameplay Loop

#### 🔄 Turn Structure
- Battles proceed in **turns** within **rounds**.
- Units perform actions based on their **calculated TurnOrder** [source: 7].

#### ⚔️ Action Economy
- The **active unit** executes one primary action per turn:
  - **Basic Attack:** Generates **Skill Points (SP)** for the team.
  - **Skill:** A special ability unique to the hero (or Kyuris's randomly equipped skill). Typically **consumes SP**.
  - **Ultimate:** A powerful ability unique to the hero, **usable when their Gauge is full**. May interrupt normal turn order.

#### 🎮 Resource Management
- Players must **strategically manage**:
  - **Shared Team SP pool** (balancing generation and consumption)
  - **Individual Hero Gauge accumulation**

#### ⏳ Round Progression
- When all units have acted (**Status becomes "End"**), the **round concludes**:
  - **Statuses reset to "Idle"**
  - **TurnOrder is reshuffled** before the next round [source: 10, 84, 197].
  - Kyuris’s **active Skill may also be randomized** at this point.

#### 🏆 Win/Lose Condition
- The battle ends when all units of either the **Ally** or **Enemy** type are defeated (**HP ≤ 0**), updating the global **BattleState** [source: 11].

---

### ⚙️ 1.3. Key Mechanics within this Module

#### 📍 Pseudo-Position System
- Combat utilizes a **unique linear relative positioning system** (no grid!).
- **Positions are represented by offsets** (PseudoPos: 0, ±1, ±2, etc.) [source: 13-14, 86, 119].
- Allows for **range-based skills and positioning tactics**.

#### 🔷 Skill Point (SP) System
- **Shared resource pool** (e.g., max **4-5 SP**).
- **Basic Attacks generate SP**, while **most Skills consume SP**, requiring tactical management.

#### ⚡ Gauge & Ultimate System
- Each hero accumulates **Gauge** through actions (**attacking, taking damage, special effects**).
- **Full Gauge unlocks Ultimate**, a **unique, powerful ability**.

#### 🧠 Technique System
- Before battle, the player (**Kyuris**) can activate **one learned Technique**.
- **Techniques provide strategic advantages** (e.g., **bonus SP, enemy debuffs**).
- **Consumes Technique Points (TP)**, a resource **regenerated through real-life activity/Gamicraft progression**.
- **Techniques reflect Kyuris’s preparation**, rather than being active combat abilities.

#### 🦸‍♂️ Kyuris (Main Character) Uniqueness
- **Adaptive Skill Mimicry:**
  - Kyuris learns a **vast pool of Skills** (tied to **real-life achievements**).
  - **Only one active Skill slot** in combat.
  - **Skill is randomized per round**, requiring adaptability.

- **Summoner Ultimate:**
  - Kyuris's **Ultimate summons a Gacha hero** (not on cooldown) to assist.
  - The **summoned hero enters cooldown** afterward.

- **Commander Role (Talent):**
  - Kyuris has a **unique Talent (e.g., "Nexus Commander")**.
  - May **enhance allies, improve skill selection, or interact with summons**.
  - **Allows access to inventory use during battle.**

#### 🎒 Inventory Access
- **Kyuris can use consumable items** obtained via LifeUp (**e.g., SP/Gauge potions**).
- **Does not consume an action turn**, bridging **gameplay with real-life rewards**.

#### 📈 Stats, Growth & Life Level Cap
- Units follow the **Gamicraft-wide growth formula** [source: 16, 117].
- **Life Level (real-life progress) caps unit growth** [source: 16, 118].
- **Kyuris’s stats are primarily increased through exercise** [source: 17, 108, 252].

#### 🔗 Integration Points
- **Interacts with:**
  - **Hero Cooldowns** [source: 19, 116, 132]
  - **LifeUp consumables**
  - **Technique unlocking/TP regeneration tied to real-life progress**
  - **Cross-module effects** [source: 19, 139]

---

### 🚀 1.4. Future Planned Features & Expansion

🔹 **Planned Expansions:**
- Expand **Trigger Conditions** and **Skill Types**.
- **Hero Ascension system** using Gacha duplicates (**potential Token system**).
- **Environmental/Tile Effects** that interact with **PseudoPos**.
- Improve **Enemy AI to use SP/Gauge/Techniques**.
- **Deeper status effect interactions** (buffs/debuffs).
- **Real-Life Integration triggers** (e.g., weather, date-based hero boosts).
- **Refining Kyuris's Skill Learning** system (linked to real-life achievements).

---

📌 **Next Steps:**
- Implement **core battle mechanics**.
- Expand **Technique system mechanics**.
- Design **first wave of enemy AI and status effects**.

---

📝 **Document Version:** Draft 2.0 
🔄 **Last Updated:** March 31, 2025
