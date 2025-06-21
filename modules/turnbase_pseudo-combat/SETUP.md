# Gamicraft TBC - Setup Guide
# Turn-Based Combat (TBC) Module Setup Guide

Welcome to the Turn-Based Combat (TBC) module! This guide will help you set up the module on your Android device.

⚠️ **Disclaimer:** This is an early alpha version. Bugs or incomplete features may occur. Your feedback is crucial for improving this project!

---

## ⚙️ Prerequisites

Ensure the following apps are installed on your Android device:

- [**Tasker**](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm): Core automation engine for game logic.
- [**AutoTools**](https://play.google.com/store/apps/details?id=com.joaomgcd.autotools): Tasker plugin for the web interface and communication.
- [**LifeUp**](https://play.google.com/store/apps/details?id=net.sarasarasa.lifeup) (Optional): Integrates with the Gamicraft ecosystem.

---

## 🛠️ Installation Steps

### **Step 1: Place Module Files**

1. Download and extract the `.zip` file from the GitHub Release page.
2. Navigate to your internal storage root using a file manager.
3. Create the folder: `/storage/emulated/0/gamicraft/modules/`
4. Copy the `turn_base_pseudo-combat` folder into the `modules` directory.

**Final Path:** `/storage/emulated/0/gamicraft/modules/turn_base_pseudo-combat/`

✅ **Verify:** Ensure sub-folders like `/app/` and `/data/` exist in this directory.

---

### **Step 2: Import Tasker Project**

1. Open Tasker.
2. Long-press the **"Home" icon** (or any Project tab) at the bottom.
3. Tap **"Import Project"** from the menu.
4. Navigate to `/storage/emulated/0/gamicraft/modules/turn_base_pseudo-combat/`.
5. Select `Turn_Base_Combat.prj.xml`.

✅ **Verify:** A new Project tab named "Turn Base Combat" should appear in Tasker.

---

### **Step 3: Launch the Module**

1. Open the "Tasks" tab in Tasker.
2. Find the Task **"TBC: Initiate"**.
3. Tap the "Play" button to start the game.

The Turn-Based Combat web screen should now launch!

---

## 💡 Optional: Import Gamicraft Items in LifeUp

For a full experience, import pre-made items from the Gamicraft creator profile in LifeUp:

1. Open LifeUp and go to the **"World"** tab.
2. Search for `Kyuris` and select the profile.
3. Navigate to the **"Shop"** tab and import the displayed items.

_(Detailed guide with screenshots coming soon.)_

---

## ❓ Troubleshooting

- **Blank Web Screen or "File Not Found" Error:**
    - Verify the folder structure in **Step 1**.
    - Check the "Source" field in the "AutoTools Web Screen" action of the **"TBC: Initiate"** task.

- **Tasker "Permission Denied" Error:**
    - Ensure Tasker has storage access permissions in your Android App settings.

---

## 💬 Feedback & Community

- [**Join our Discord Server**](https://discord.gg/XKSGMq9U) for discussions and support.
- [**Report Bugs or Request Features**](https://github.com/kyuris8931/gamicraft-project/issues) on GitHub.

---
