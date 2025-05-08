# Gamicraft - Development & Repository Guide v2.0

Last Updated: May 8, 2025

Status: Draft Revision - Aligning with New Architectural Vision

## 1. Introduction

### 1.1. Purpose of this Guide

This document provides guidelines for managing the Gamicraft project, including its codebase, repository structure, documentation workflow, and development practices. Its goal is to ensure consistency, clarity, maintainability, and transparency throughout the project's lifecycle, supporting efficient solo development and laying a foundation for potential future collaboration, especially concerning "full code" modules. This guide reflects the new architectural vision centered around a Central JSON Data backbone, Tasker as an orchestrator, and "full code" (e.g., JavaScript-based) game modules.

### 1.2. Guiding Principles

- **Consistency:** Adhere to defined structures and conventions.
    
- **Clarity:** Make code, documentation, and processes easy to understand.
    
- **Maintainability:** Structure the project for ease of updates and bug fixing.
    
- **Transparency:** Utilize GitHub features to keep progress visible.
    
- **Collaboration-Readiness:** Design "full code" modules and documentation with AI and human collaboration in mind.
    
- **Modularity:** Ensure clear separation between the Gamicraft core (Tasker, Central JSON) and individual modules.
    

## 2. Repository Structure (Gamicraft-Project on GitHub)

The main repository is hosted on GitHub under the `Gamicraft-Project` (or your chosen name). The structure is organized to accommodate both core system elements and individual modules, including "full code" projects.

```
Gamicraft-Project/
│
├── .github/                     # GitHub-specific files (workflows, issue templates - Future Use)
│
├── documentation/               # Core project documentation
│   ├── internal/                # Internal design documents, architectural notes (ideally .md)
│   │   ├── Master_Document_v2.0.md
│   │   ├── Project_Status_Roadmap_v2.0.md
│   │   ├── Dev_Repo_Guide_v2.0.md  (This file)
│   │   └── ... (other internal docs like TBC_Full_Code_Architecture.md)
│   ├── public/                  # Public-facing documentation (guides, API specs - Future Use)
│   │   └── ...
│   └── Asset_Usage_Disclaimer.md # IMPORTANT: Defines asset usage rights/limits
│
├── core_system/                 # Files related to the Gamicraft core (managed by Tasker)
│   ├── tasker_profiles/         # Exported Tasker profiles (.prf.xml) for core orchestration
│   ├── central_data_schema/     # JSON schema definitions for the Central JSON Data (Future Use)
│   └── scripts/                 # Core JavaScriptlets or helper scripts run by Tasker
│
├── modules/                     # Main folder for all Gamicraft modules
│   ├── tbc_full_code/           # Example: Folder for the "Full Code" TBC module (PWA/WebView)
│   │   ├── src/                 # Source code (HTML, CSS, JavaScript)
│   │   ├── assets/              # Module-specific assets
│   │   ├── README.md            # Module overview, setup, how it interacts with Gamicraft core
│   │   └── package.json         # If it's a Node.js project (e.g., for PWA build tools)
│   │
│   ├── idle_tokens_tasker/      # Example: A simpler Tasker-based module
│   │   ├── Idle_Tokens.tsk.xml
│   │   └── README.md
│   │
│   └── ... (other modules)
│
├── .gitignore                   # Specifies intentionally untracked files
├── LICENSE                      # Project's software license (e.g., MIT)
└── README.md                    # Main repository README: Project overview, links
```

### 2.1. `/documentation/`

- Contains all key Gamicraft documentation.
    
- **`/internal/`:** For design documents, architectural notes, and evolving guides like this one. **Strongly recommend using Markdown (`.md`) format** for these files for better version control diffs and AI tool compatibility.
    
- **`/public/`:** (Future) For user guides, API documentation for module developers, etc.
    
- `Asset_Usage_Disclaimer.md`: Resides here, applicable to all assets in the repository.
    

### 2.2. `/core_system/`

- Houses elements central to Tasker's role as orchestrator.
    
- `tasker_profiles/`: For backing up and sharing the core Tasker profiles that manage the Central JSON and module communication.
    
- `central_data_schema/`: (Future) Defining the structure of your Central JSON can be very helpful.
    
- `scripts/`: JavaScriptlets or other scripts that Tasker uses for core Gamicraft logic (e.g., complex calculations on the Central JSON).
    

### 2.3. `/modules/`

- Each subfolder represents a Gamicraft module.
    
- **"Full Code" Modules (e.g., `/tbc_full_code/`):**
    
    - These are treated as mini-projects within the main repository or could even be separate repositories linked as submodules if they become very large.
        
    - Should contain their own `README.md` explaining their purpose, setup (if any beyond launching via Tasker), and how they interface with the Gamicraft core (e.g., expected JSON format for data exchange with Tasker).
        
    - Source code (`/src/`), assets, and any build configurations (`package.json`) reside here.
        
- **Tasker/KLWP Modules (e.g., `/idle_tokens_tasker/`):**
    
    - Contain exported Tasker files (`.tsk.xml`, `.prf.xml`) or KLWP files (`.klwp`).
        
    - Must have a `README.md` explaining setup and functionality.
        

### 2.4. Root Files

- `README.md`: Main project entry point.
    
- `LICENSE`: Defines usage rights.
    
- `.gitignore`: Prevents committing unnecessary files.
    

## 3. Version Control (Git & GitHub)

### 3.1. Branching Strategy (Solo Dev Adaptation)

- **`main` Branch:** Latest stable, released/publicly available version. Avoid direct commits.
    
- **Feature Branches:** Create branches for new features, module development (e.g., `feat/tbc-pwa-core-logic`, `docs/update-master-doc`), bug fixes.
    
- **Pull Requests (PRs):** Use PRs to merge feature branches into `main`, even for solo development. This provides a review point and history.
    

### 3.2. Commit Messages

- Use [Conventional Commits](https://www.conventionalcommits.org/ "null") standard (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
    

## 4. Task Management (GitHub Projects)

- Utilize GitHub Projects (Kanban board) for visual task tracking of both development and documentation efforts.
    
- Align tasks with the `Project Status & Roadmap` document.
    

## 5. Documentation Workflow (Revised)

### 5.1. Internal Documentation

- **Primary Format:** Markdown (`.md`). This is crucial for effective version control (readable diffs) and for AI tools that can access and analyze repository content.
    
- **Location:** `/documentation/internal/` in the GitHub repository.
    
- **Content:** Master Document, Roadmap, Architectural Designs, this Guide, etc.
    
- **AI-Assisted Drafting:** Leverage AI to help draft, summarize, or refine these `.md` documents, with Kyuris performing the final review and edits.
    

### 5.2. Module-Specific Documentation

- Each module in `/modules/` must have its own `README.md` detailing:
    
    - Purpose and core mechanics.
        
    - Setup instructions (if any beyond Tasker launching it).
        
    - For "full code" modules: How it communicates with Tasker (e.g., expected JSON data structures, Intents used).
        

### 5.3. Keeping Docs Updated

- Documentation is part of development. Update relevant `.md` files in the same PR as code changes.
    

## 6. Coding & Asset Guidelines (Revised)

### 6.1. Language Focus (Expanded)

- **Gamicraft Core (Tasker):** Tasker profiles/tasks/scenes (.xml exports), JavaScriptlets within Tasker for core logic and data manipulation of the Central JSON.
    
- **"Full Code" Modules:** Primarily JavaScript (for PWAs/WebViews using HTML, CSS, JS). Other languages could be used if a module warrants it and can interface with Tasker.
    
- **KLWP:** For ambient display, using KLWP formulas.
    

### 6.2. "Full Code" Module Development

- **Structure:** Organize code logically within the module's folder (e.g., `src/` for source, `assets/`).
    
- **Modularity:** Design modules to be as self-contained as possible regarding their internal gameplay logic.
    
- **Interface with Tasker:** Clearly define and document the communication interface (e.g., JSON schema for data sent/received, Tasker Intent names, JavaScriptInterface methods if using WebView).
    
- **Code Comments:** Essential for all code, especially JavaScript in "full code" modules and JavaScriptlets in Tasker. Explain logic, functions, data structures.
    
- **Error Handling:** Implement robust error handling within modules and in their communication with Tasker.
    

### 6.3. Central JSON Data

- Maintain a clear (and ideally schema-defined in the future) structure for the Central JSON data.
    
- Tasker is the primary guardian of this data. Modules should not attempt to modify it directly but report changes to Tasker.
    

### 6.4. Asset Management

- Store module-specific assets within the respective `/modules/<ModuleName>/assets/` subfolder.
    
- Ensure the `Asset_Usage_Disclaimer.md` is up-to-date and accurately reflects all asset sources and licenses.
    

## 7. Contribution Guide (Future - For "Full Code" Modules)

- While currently solo, the shift to "full code" modules opens up easier future collaboration.
    
- A formal `Contribution_Guide.md` will be developed if/when the project seeks external contributions. It will cover:
    
    - How to set up a development environment for a module.
        
    - Coding standards for the specific module language (e.g., JavaScript).
        
    - How to test changes.
        
    - The PR process for submitting changes to a module.
        
    - Guidelines for documenting module code and interfaces.