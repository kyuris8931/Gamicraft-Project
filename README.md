# Gamicraft - Modular Gamification Framework for Android

<p align="center">
  </p>

<p align="center">
  <a href="https://discord.gg/etaybrXr2z"><img src="https://img.shields.io/discord/YOUR_SERVER_ID?label=Discord&logo=discord&style=for-the-badge&color=5865F2"></a> 
  <a href="https://www.youtube.com/@Gamicrafter"><img src="https://img.shields.io/badge/YouTube-Gamicraft%20Showcase-red?logo=youtube&style=for-the-badge"></a> 
  <a href="https://www.twitch.tv/kyuris_gc"><img src="https://img.shields.io/badge/Twitch-Live%20Streams-9146FF?logo=twitch&style=for-the-badge"></a>
  </p>

---

**Gamicraft is a unique, modular gamification framework for Android, aiming to blend real-life productivity with engaging, custom-built mini-game experiences.**

Built upon the foundation of **LifeUp**, **Tasker**, and **KLWP**, Gamicraft transforms daily tasks, habits, and even exercise into resources and progress within various interactive game modules.

This project is actively developed by **Kyuris** ([@kyuris8931](https://github.com/kyuris8931)), a solo developer based in Sidoarjo, Indonesia.

## ✨ Core Philosophy: "Growth to Win"

Unlike typical gamification apps, Gamicraft embodies several core philosophies:

* **🌱 Growth to Win:** Real-world progress (completing tasks, learning, exercising) is the primary key to enhancing your capabilities and potential within Gamicraft.
* **🔑 Productivity as Privilege:** Reframing challenging productive tasks from "chores" into valuable "privileges" or opportunities that can be "purchased" or accessed using in-game resources (e.g., Privilege Tickets).
* **🧩 High Modularity & Customization:** Gamicraft is not a single monolithic game, but a flexible framework allowing for the creation, addition, or modification of various distinct mini-game modules.
* **🎮 Your Game, Your Rules:** Empowering users (Kyuris) to choose their progression paths, the tasks they wish to gamify, and deeply customize their experience, even without coding skills (thanks to Tasker & KLWP's flexibility).
* **⏱️ Short Play Sessions:** Interactions with modules are designed to be brief (typically < 3 minutes) to easily integrate into daily routines.

## 🛠️ Core Technology Stack

Gamicraft runs on the **Android** platform and relies on the synergy between:

* **LifeUp:** The habit/productivity tracking app, serving as the primary data source for real-world activities (EXP, Coins, Attributes).
* **Tasker:** A powerful automation engine, acting as Gamicraft's core logic engine, processing data, executing game logic (often via JavaScriptlets), and triggering events.
* **KLWP (Kustom Live Wallpaper Maker):** An interactive live wallpaper creator, serving as Gamicraft's primary UI/UX layer for module visualization and user interaction.
* **JavaScript:** Used within Tasker (JavaScriptlets) for more complex logic operations.

## 🚀 Project Status: Active Development (Alpha/Conceptual)

Gamicraft is currently under active development by a solo developer. Core concepts and initial modules are being built and documented.

### 🌟 Playable / Functional Modules

These modules have early versions available that can be downloaded, set up, and tested (though they might still be in Alpha/Beta stages):

* **⚔️ Turn-Based Combat (TBC) `[Alpha]`**
    * Description: A turn-based battle module using KLWP. Features basic combat, Heroes with unique Techniques, SP/Gauge management, and Kyuris's adaptive skills.
    * ➡️ **[View Details & Setup](./modules/Turn-Based_Combat/README.md)** | **[Essential Setup Guide!](./modules/Turn-Based_Combat/SETUP.md)**
* **💎 IDLE Life Tokens `[Functional]`**
    * Description: A passive resource generation system ('Tokens') based on your LifeUp Attribute levels. Currently uses Tasker Widgets for its UI.
    * ➡️ **[View Details & Setup](./modules/IDLE_Life_Tokens/README.md)** | **[Essential Setup Guide!](./modules/IDLE_Life_Tokens/SETUP.md)**

### 💡 Conceptual / Documented Modules

These modules have concept designs and documentation, but may not yet have a playable implementation:

* **🏋️ Exercise Progression Module**
    * Description: Gamifies real-life physical exercises with a per-exercise leveling system, achievement card crafting, and rewards (EXP, Keys for other modules).
    * ➡️ **[Read the Concept](./modules/Exercise_Progression/README.md)** *(Setup Guide will be added upon implementation)*
* **⛏️ Minecraft Integration Module**
    * Description: A concept to bridge Gamicraft with Minecraft, allowing Minecraft resources to be used in Gamicraft and vice-versa, including passive systems like 'Trials of Bravery'.
    * ➡️ **[Read the Concept](./modules/Minecraft_Integration/README.md)** *(Setup Guide will be added upon implementation)*

*(Module list will be updated as development progresses)*

## 🏁 Getting Started / How to Use

Interested in trying Gamicraft? Here's the general approach:

1.  **Prerequisites:** You **need** an Android device with the following apps installed:
    * **LifeUp:** (Productivity data source - *may require purchase*)
    * **Tasker:** (Main engine - *may require purchase*)
    * **KLWP Pro:** (For visual modules like TBC - *requires purchasing the Pro key*)
    * *Note: Some modules might only require Tasker (like the current IDLE Life Tokens).*
2.  **Choose a Module:** Explore the [`/modules`](./modules/) folder in this repository.
3.  **Read the Docs:** **Crucial!** For each module you want to try:
    * Read the `README.md` file inside the module's folder to understand its concept and function.
    * Carefully follow the **step-by-step** instructions in the `SETUP.md` file (or Setup section in the README) to import Tasker profiles, KLWP presets, and perform necessary initial configurations.
4.  **Provide Feedback:** If you encounter bugs or have ideas, feel free to create an [Issue](https://github.com/kyuris8931/Gamicraft-Project/issues) or discuss it on Discord!

## 💬 Join the Community!

Gamicraft's journey is ongoing, and community input is highly valued!

* <img src="https://img.shields.io/badge/Discord-Join%20Us!-5865F2?style=flat-square&logo=discord" alt="Discord Badge"> Join the **[Gamicraft Discord Server](https://discord.gg/etaybrXr2z)** for:
    * Discussions, Q&A, and sharing ideas.
    * Informal development logs in the `#behind-the-curtain` channel.
    * Setup assistance.
* <img src="https://img.shields.io/badge/YouTube-Demos%20%26%20Tutorials-FF0000?style=flat-square&logo=youtube" alt="YouTube Badge"> Visit the **[Gamicraft YouTube Channel](https://www.youtube.com/@Gamicrafter)** for module demos and tutorials (when available).
* <img src="https://img.shields.io/badge/Twitch-Live%20Coding%20Streams-9146FF?style=flat-square&logo=twitch" alt="Twitch Badge"> Watch the development process live (occasionally!) on **[Kyuris_GC Twitch](https://www.twitch.tv/kyuris_gc)**.

## 🤝 Contribution

Gamicraft is currently developed by a solo developer. Direct code contributions might not be formally open yet. However, highly appreciated forms of contribution include:

* **Feedback & Bug Reporting:** Report issues you find via [GitHub Issues](https://github.com/kyuris8931/Gamicraft-Project/issues).
* **Ideas & Discussion:** Share feature ideas or discuss concepts on the [Discord Server](https://discord.gg/etaybrXr2z).
* **Testing:** Trying out available modules and providing feedback on your experience.

*(Formal contribution guidelines will be added if the project grows and is ready for code contributions)*

---

*Visual Style Note: Gamicraft aims for a distinct **blueprint theme** with white stroke objects and hatching shader details for a technical, design-oriented aesthetic.*
