This guide will walk you through setting up the Turn-Based Combat (TBC) module on your Android device.

**Disclaimer:** This is an early alpha version. You may encounter bugs or incomplete features. Your feedback is highly valuable!

### Prerequisites

1. **Android Device**
    
2. **Tasker:** The automation app that runs the game's logic.
    
3. **AutoTools:** A Tasker plugin used to display the web interface and enable communication.
    

### Installation Steps

#### 1. File Placement

First, you need to place the module files in the correct directory on your device's internal storage.

1. Create the following main directory if it doesn't exist: `/storage/emulated/0/gamicraft/modules/`
    
2. Place the entire `turnbase_pseudo-combat` folder inside it. The final structure should look like this: `/storage/emulated/0/gamicraft/modules/turnbase_pseudo-combat/`
    
3. The folder has two key subdirectories:
    
    - `.../app/`: This contains all the client-side files for the web interface (`index.html`, `style.css`, `js/` folder, etc.).
        
    - `.../data/`: This contains all server-side files, including assets (images, sounds), and the core JSON state files.
        

#### 2. Import Tasker Profile

The module comes with a pre-configured Tasker Profile to get you started quickly.

1. Open Tasker.
    
2. Long-press on the "Profiles" tab at the top.
    
3. Select "Import Profile".
    
4. Navigate to the module's data folder: `.../turnbase_pseudo-combat/data/`
    
5. Select the Tasker Profile file (e.g., `TBC_Gamicraft.prf.xml`).
    
6. The profile, along with its associated Tasks, will be imported into Tasker.
    

#### 3. Verify Configuration

1. After importing, open the main Task that launches the TBC module (e.g., "Launch TBC").
    
2. Find the "AutoTools Web Screen" action.
    
3. Check the "Source" field. Make sure it correctly points to the `index.html` file: `/storage/emulated/0/gamicraft/modules/turnbase_pseudo-combat/app/index.html`
    
4. Adjust the path if necessary.
    

#### 4. Launch the Module

You're all set! Simply run the "Launch TBC" Task from within Tasker to start the game.