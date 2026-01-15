import { Plugin, WorkspaceLeaf, TFile, Editor } from 'obsidian';
import { TaskSorter } from './src/sorter';

export default class DoneDropSorter extends Plugin {
    // Debounce timer
    private timer: any;

    async onload() {
        console.log('Loading DoneDrop Sorter');

        // Handle Reading Mode changes (and other non-editor modifications)
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    // Check if this file is currently open in an editor
                    // If it is, we let the editor-change event handle it to avoid conflicts
                    const isOpened = this.app.workspace.getLeavesOfType('markdown').some(leaf => {
                        const view = leaf.view as any;
                        return view.file && view.file.path === file.path && view.getMode() === 'source';
                    });

                    if (!isOpened) {
                        await this.processFile(file);
                    }
                }
            })
        );

        // Handle Live Preview / Source Mode changes
        this.registerEvent(
            this.app.workspace.on('editor-change', (editor: Editor) => {
                this.handleEditorChange(editor);
            })
        );
    }

    onunload() {
        console.log('Unloading DoneDrop Sorter');
    }

    /**
     * Handles updates in the editor (Live Preview / Source).
     * Debounced to prevent interfering with rapid typing.
     */
    private handleEditorChange(editor: Editor) {
        if (this.timer) clearTimeout(this.timer);

        this.timer = setTimeout(() => {
            const content = editor.getValue();
            const sortedContent = TaskSorter.sort(content);

            if (content !== sortedContent) {
                // Safety check: Don't move things if the user is currently typing on a task line?
                // For now, we trust the debounce.
                // Using setLine or replaceRange would be better for preserving cursor,
                // but simpler to replace all for "Simple & Modular" first pass.
                // To minimize disruption, we only replace if different.

                const cursor = editor.getCursor();

                // We preserve scroll and cursor as best as we can by using the editor API,
                // but if the line under the cursor moves, the cursor might end up on a different line content.
                // Obsidian's Editor doesn't track "line identity", only line number.

                editor.setValue(sortedContent);
                editor.setCursor(cursor);
            }
        }, 1000); // 1 second debounce
    }

    /**
     * Processes a file directly (Reading Mode).
     */
    private async processFile(file: TFile) {
        const content = await this.app.vault.read(file);
        const sortedContent = TaskSorter.sort(content);

        if (content !== sortedContent) {
            await this.app.vault.modify(file, sortedContent);
        }
    }
}
