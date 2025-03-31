# ⚙️ Turn-Based Combat Module (Draft 2.0 - March 31, 2025)

## **1. Module Overview & Concepts**

### **1.1. 🎮 Module Purpose within Gamicraft**

The **Turn-Based Combat** module is a core interactive component of the Gamicraft framework. It enables users to engage in **quick, strategic battles** using their main character (**Kyuris**) and collected heroes. Battles serve as a key way to:

- Utilize collected heroes (obtained via the **Gacha system** 🎰).
    
- Manage combat resources like **Skill Points (SP)** ⚖️.
    
- Earn diverse rewards (**in-game resources, real-life treats, and progress** 🌟).
    

### **1.2. ♻️ Core Gameplay Loop**

- **🎯 Turn Structure:** Battles proceed in turns within rounds, determined by `TurnOrder`.
    
- **🗨️ Action Economy:** The active unit can perform **one primary action** per turn:
    
    - 🏰 **Basic Attack:** Generates `SP` for the team.
        
    - 🔮 **Skill:** A hero-specific move consuming `SP`.
        
    - ✨ **Ultimate:** A powerful move unlocked when `Gauge` is full.
        
- **🛠️ Resource Management:** Players must balance the **shared Team SP pool** and individual **Hero Gauge accumulation**.
    
- **⏳ Round Progression:** When all units have acted (`Status = "End"`), the round concludes, and `TurnOrder` is reshuffled.
    
- **⚔️ Win/Lose Condition:** The battle ends when all units of either the **Ally** or **Enemy** side reach `HP <= 0`.
    

### **1.3. ⚡ Key Mechanics**

- **🎨 Pseudo-Position System:** No grid; positioning is determined by **relative offsets** (`PseudoPos: 0, +/-1, +/-2`).
    
- **⚖️ SP System:** **Basic Attacks generate SP**, while **Skills consume SP**, requiring **teamwide tactical planning**.
    
- **⏳ Gauge & Ultimate System:**
    
    - **Heroes build** `**Gauge**` through actions (attacking, taking damage, effects).
        
    - A full `Gauge` unlocks a **unique Ultimate move** ✨.
        
- **🤖 Technique System:**
    
    - **Before battle**, Kyuris can **activate one Technique** for a tactical advantage (e.g., bonus SP, enemy debuffs).
        
    - **Consumes** `**Technique Points (TP)**`, which regenerate via real-life activities.
        
- **🔄 Kyuris (Main Character) Unique Abilities:**
    
    - **Adaptive Skill Mimicry** ✨: Each round, Kyuris gets a **random active Skill** from their known pool.
        
    - **Summoner Ultimate** 🐉: Calls an allied Gacha hero into battle.
        
    - **Commander Role (Talent):** Special abilities affecting **allies and team synergy**.
        
    - **Inventory Access** 🎒: Use `LifeUp` consumables **without consuming a turn**.
        
- **📊 Stats & Growth:**
    
    - **Heroes' growth follows a global Gamicraft formula**.
        
    - **Kyuris' stats improve via real-life exercise** 🏃.
        
- **🧑‍💻 Integration with Gamicraft:**
    
    - **Hero Cooldowns** ⏳: **Summoned heroes enter cooldown** after Ultimate use.
        
    - **Real-life tied progression**: **Techniques, LifeUp rewards, and hero power scaling** are linked to real-world actions.
        

## **2. 🚀 Future Features & Expansions**

Next steps for improving the Turn-Based Combat module:

- 🔍 **Expand Skill Types & Triggers.**
    
- 💎 **Hero Ascension System** using Gacha duplicates.
    
- 🌍 **Environmental Effects** & Tile-based interactions.
    
- 🤖 **Smarter Enemy AI** with `SP/Gauge` tactics.
    
- 🛠️ **Advanced Status Effects** & Buff mechanics.
    
- ☁ **Real-Life Event Triggers** (e.g., weather-based hero boosts ☀️🌧️).
    
- 🔬 **Refined Kyuris Skill Learning** based on achievements.