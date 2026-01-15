# DoneDrop Sorter

An Obsidian plugin that automatically moves completed tasks to the bottom of their lists.

## Features

- **Auto-sort**: Completed tasks (`- [x]`) are moved to the bottom of their indentation level.
- **Recursive**: Handles nested sub-tasks correctly.
- **Interactive**: Works in both Live Preview (Editor) and Reading Mode.

## Architecture Flow

The following diagram illustrates how the plugin handles events from different sources (Editor, Reading Mode, File System) and processes them using the core sorting logic.

```mermaid
graph TD
    %% Styling
    classDef obsidian fill:#2c3e50,stroke:#ecf0f1,stroke-width:2px,color:#ecf0f1;
    classDef plugin fill:#8e44ad,stroke:#9b59b6,stroke-width:2px,color:#fff;
    classDef logic fill:#27ae60,stroke:#2ecc71,stroke-width:2px,color:#fff;
    classDef data fill:#e67e22,stroke:#d35400,stroke-width:2px,color:#fff;

    subgraph Obsidian["Obsidian Environment"]
        UserEditor["User Types (Live Preview)"]:::obsidian
        UserReading["User Clicks Checkbox (Reading Mode)"]:::obsidian
        VaultModify["File Modified (Sync/External)"]:::obsidian
    end

    subgraph Main["Plugin Controller (main.ts)"]
        OnEditorChange["onEditorChange(editor)"]:::plugin
        OnPostProcess["onMarkdownPostProcess(html)"]:::plugin
        OnFileModify["onFileModify(file)"]:::plugin

        HandleSort{"handleSort(file)"}:::plugin
        ApplyEditor["Apply via Editor API\n(Preserves Cursor)"]:::plugin
        ApplyVault["Apply via Vault API\n(Direct Write)"]:::plugin
    end

    subgraph Core["Core Logic (src/sorter.ts)"]
        Sorter["TaskSorter.sort(text)"]:::logic
        Parser["parseBlocks()"]:::logic
        TreeSort["sortBlocksRecursively()"]:::logic
        Stringifier["stringifyBlocks()"]:::logic

        BlockTree["TaskBlock Tree"]:::data
    end

    %% Live Preview Flow
    UserEditor --> |Event: editor-change| OnEditorChange
    OnEditorChange --> |Debounce 1s| Sorter

    %% Reading Mode Flow
    UserReading --> |DOM Click Event| OnPostProcess
    OnPostProcess --> |Delay 200ms| HandleSort

    %% File System Flow
    VaultModify --> |Event: modify| OnFileModify
    OnFileModify --> HandleSort

    %% Handling Logic
    HandleSort --> |Check Open Editors| IsOpen{Is Open in Source Mode?}:::plugin
    IsOpen -- Yes --> ApplyEditor
    IsOpen -- No --> ApplyVault

    %% Core Sorting Process
    Sorter --> Parser
    Parser --> |Create| BlockTree
    BlockTree --> TreeSort
    TreeSort --> |Sort Children| TreeSort
    TreeSort --> Stringifier
    Stringifier --> |Return Sorted Text| Sorter

    %% Application
    Sorter --> ApplyEditor
    Sorter --> ApplyVault

    ApplyEditor --> |Update View| UserEditor
    ApplyVault --> |Update File| VaultModify
```

## Development

1. Run `npm install` to install dependencies.
2. Run `npm run dev` to start compilation in watch mode.
3. Reload Obsidian to see changes.

## Build

Run `npm run build` to create `main.js`.

## Code Overview

- **`src/sorter.ts`**: **The Brain**. Contains the core logic for parsing Markdown text into a block tree, recursively sorting tasks (incomplete > complete), and rebuilding the string. Pure TypeScript, no Obsidian dependencies.
- **`main.ts`**: **The Glue**. Handles Obsidian API events (`editor-change` for typing, `vault.modify` for external/preview changes), debouncing, and applying the sorted text back to the editor.
- **`esbuild.config.mjs`**: **The Bundler**. Configures `esbuild` to bundle the TypeScript code into a single `main.js` file for Obsidian.
- **`manifest.json`**: Plugin metadata (id, version, name) required by Obsidian.
