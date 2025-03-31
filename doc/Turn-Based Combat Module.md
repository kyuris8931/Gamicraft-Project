# 🏹 Turn-Based Combat Module

## 📜 Section 1: Module Overview & Concepts
**(Version: Draft 2.0 - Date: March 31, 2025)**

### 🎯 1.1. Module Purpose within Gamicraft
The **Turn-Based Combat module** remains a core interactive gameplay component for the **Gamicraft framework** 📦 [source: 1, 13]. It provides users with **short, engaging battle sessions** where their **main character (Kyuris)** and collected **heroes** face various opponents.

🔹 **Purpose & Integration:**
- Battles allow players to **utilize their collected heroes** (obtained via the **Gacha system** 🎰 [source: 4, 239]).
- Players **manage combat resources** like **Skill Points (SP)** and **Gauge**.
- Battles **reward players** with in-game items, real-life benefits, or progression 📈.
- Designed for quick play sessions, typically **under 3 minutes** ⏳, to integrate smoothly into daily life [source: 5, 115].

---

### 🔄 1.2. Core Gameplay Loop

#### 🏆 **Turn Structure:**
- Battles proceed in **turns** within **rounds**.
- Units act based on **calculated TurnOrder** [source: 7].

#### ⚔️ **Action Economy:**
Each unit performs **one primary action per turn:**
- **Basic Attack**: Standard action that **generates Skill Points (SP)**.
- **Skill**: Unique hero ability (or Kyuris's random skill), usually **consumes SP**.
- **Ultimate**: A **powerful move** available when **Gauge is full**, potentially interrupting turn order ⚡.

#### 📊 **Resource Management:**
- Players manage a **shared Team SP pool** (balance generation & consumption).
- Heroes accumulate **Gauge** to unleash **Ultimate abilities**.

#### 🔄 **Round Progression:**
- When all units act (**Status = "End"**), the round **resets**.
- TurnOrder **reshuffles** before the next round.
- Kyuris’s **active Skill is randomized** at the start of each round 🎲.

#### ⚡ **Win/Lose Condition:**
- **Battle ends** when all units of either **"Ally" or "Enemy"** type are defeated (**HP ≤ 0**).
- Updates the **global BattleState** [source: 11].

---

### 🛠️ 1.3. Key Mechanics within this Module

#### 🔷 **Pseudo-Position System:**
- **No grid-based movement**, instead uses **relative offsets (PseudoPos)** (e.g., `0, +/-1, +/-2`) [source: 13-14, 86, 119].
- Allows **range-based skills & positioning tactics**.

#### 🔥 **Skill Point (SP) System:**
- A **shared resource** for the team (**max 4-5 SP**).
- **Basic Attacks generate SP**, most **Skills consume SP**.
- Encourages **tactical resource management**.

#### ⚡ **Gauge & Ultimate System:**
- Heroes accumulate **Gauge** through **actions & damage taken**.
- When full, heroes can unleash their **Ultimate** 🔥.

#### 🎓 **Technique System:**
- Before battle, **Kyuris selects a Technique** (one-time advantage).
- Techniques **cost Technique Points (TP)**, regenerated via real-life progress 🎖️.
- Examples: Bonus SP, starting Gauge, enemy debuffs.

#### 🌀 **Kyuris (Main Character) Uniqueness:**
- **Adaptive Skill Mimicry**: Kyuris learns **many Skills** but has **only one active at a time**, randomized **each round** 🎲.
- **Summoner Ultimate**: Kyuris **summons a Gacha hero** to fight temporarily (then applies standard cooldown).
- **Commander Role (Talent)**: Enhances allies, interacts with Skill Mimicry, and allows **Inventory access**.
- **Inventory Use**: Kyuris can use **LifeUp consumables** (e.g., SP/Gauge potions) **without consuming a turn** 🧪.

#### 📈 **Stats, Growth & Life Level Cap:**
- Heroes follow **Gamicraft-wide RPG growth formulas** [source: 16, 117].
- **Growth is capped** by the player's real-life **Life Level** 📊 [source: 16, 118].
- **Kyuris's stats** primarily increase via **real-life exercise** 🏃‍♂️ [source: 17, 108, 252].

#### 🌍 **Integration Points:**
- **Hero Cooldowns** impact cross-module interactions [source: 19, 116, 132].
- **LifeUp consumables** bridge real life & gameplay.
- **Technique unlocking & TP regeneration** link to **real-life achievements**.
- **Cross-module effects** (e.g., synergy with farming or exploration systems) [source: 19, 139].

---

### 🚀 1.4. Future Planned Features & Expansion

🔮 With **SP/Gauge/Techniques** now central, future expansions may include:
- 📜 **Expanding Skill Types & Trigger Conditions**.
- 🎭 **Hero Ascension System** (Gacha duplicates, Tokens 🎰).
- 🏞️ **Environmental & Tile Effects** based on **PseudoPos**.
- 🧠 **Advanced Enemy AI** that uses **SP, Gauge & Techniques**.
- 🔗 **Complex Buff/Debuff interactions**.
- ☁️ **Real-Life Integration** (e.g., weather-based bonuses ☀️❄️).

---

✅ **This draft serves as a blueprint for development & refinement.** Stay tuned for updates as we iterate and expand Gamicraft’s combat experience! 🎮🔥
