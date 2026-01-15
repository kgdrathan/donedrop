import { Plugin, TFile, Editor, MarkdownView, MarkdownPostProcessorContext } from 'obsidian';
import { TaskSorter } from './src/sorter';

export default class DoneDropSorter extends Plugin {
    private timer: any;
    private readonly DEBOUNCE_DELAY = 1000;
    private readonly CHECKBOX_UPDATE_DELAY = 200;

    async onload() {
        console.log('Loading DoneDrop Sorter');

        this.registerEvent(this.app.vault.on('modify', this.onFileModify.bind(this)));
        this.registerEvent(this.app.workspace.on('editor-change', this.onEditorChange.bind(this)));
        this.registerMarkdownPostProcessor(this.onMarkdownPostProcess.bind(this));
    }

    onunload() {
        console.log('Unloading DoneDrop Sorter');
    }

    private async onFileModify(file: TFile) {
        if (file instanceof TFile && file.extension === 'md') {
            await this.handleSort(file);
        }
    }

    private onEditorChange(editor: Editor) {
        this.handleEditorChange(editor);
    }

    private onMarkdownPostProcess(element: HTMLElement, context: MarkdownPostProcessorContext) {
        const checkboxes = element.querySelectorAll('input.task-list-item-checkbox');
        if (!checkboxes.length) return;

        checkboxes.forEach((cb) => {
            cb.addEventListener('click', () => {
                setTimeout(() => {
                    const file = this.app.vault.getAbstractFileByPath(context.sourcePath);
                    if (file instanceof TFile && file.extension === 'md') {
                        this.handleSort(file);
                    }
                }, this.CHECKBOX_UPDATE_DELAY);
            });
        });
    }

    private async handleSort(file: TFile) {
        const sourceLeaf = this.findSourceLeaf(file);

        if (sourceLeaf) {
            const view = sourceLeaf.view as MarkdownView;
            this.handleEditorChange(view.editor);
        } else {
            await this.processFile(file);
        }
    }

    private findSourceLeaf(file: TFile) {
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        return leaves.find(leaf => {
            const view = leaf.view as MarkdownView;
            return view.file && view.file.path === file.path && view.getMode() === 'source';
        });
    }

    private handleEditorChange(editor: Editor) {
        if (this.timer) clearTimeout(this.timer);

        this.timer = setTimeout(() => {
            const content = editor.getValue();
            const sortedContent = TaskSorter.sort(content);

            if (content !== sortedContent) {
                const cursor = editor.getCursor();
                editor.setValue(sortedContent);
                editor.setCursor(cursor);
            }
        }, this.DEBOUNCE_DELAY);
    }

    private async processFile(file: TFile) {
        const content = await this.app.vault.read(file);
        const sortedContent = TaskSorter.sort(content);

        if (content !== sortedContent) {
            await this.app.vault.modify(file, sortedContent);
        }
    }
}

