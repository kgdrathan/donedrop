/**
 * Represents a single block of content in the markdown file.
 * A block can be a list item (task or bullet) or just a line of text.
 * It also holds any child blocks that are indented below it.
 */
export class TaskBlock {
    originalText: string;
    children: TaskBlock[] = [];
    indentation: string;
    isTask: boolean;
    isCompleted: boolean;
    lineNumber: number;

    constructor(text: string, lineNumber: number) {
        this.originalText = text;
        this.lineNumber = lineNumber;
        this.indentation = this.getIndentation(text);

        // Regex for tasks: "- [ ]", "- [x]", "* [ ]", etc.
        const taskRegex = /^\s*[-*]\s+\[(.)\]/;
        const match = text.match(taskRegex);

        this.isTask = !!match;
        this.isCompleted = match ? match[1] !== ' ' : false;
    }

    private getIndentation(text: string): string {
        const match = text.match(/^\s*/);
        return match ? match[0] : '';
    }
}

/**
 * Pure logic class for sorting tasks in markdown text.
 */
export class TaskSorter {
    /**
     * Parses the markdown text, sorts the tasks recursively, and returns the new text.
     * @param text The full markdown content.
     * @returns The sorted markdown content.
     */
    static sort(text: string): string {
        if (!text) return "";

        const lines = text.split(/\r?\n/);
        const rootBlocks = this.parseBlocks(lines);

        this.sortBlocksRecursively(rootBlocks);

        return this.stringifyBlocks(rootBlocks);
    }

    /**
     * Parses lines into a tree of TaskBlocks based on indentation.
     */
    private static parseBlocks(lines: string[]): TaskBlock[] {
        const root: TaskBlock[] = [];
        const stack: { block: TaskBlock, level: number }[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip empty lines in structure but keep them attached to previous logic if needed,
            // for simplicity here, we treat them as separate blocks usually,
            // or we could attach them. Let's treat them as blocks.

            const block = new TaskBlock(line, i);
            const indentLevel = this.getIndentLevel(block.indentation);

            // Find parent
            while (stack.length > 0 && stack[stack.length - 1].level >= indentLevel) {
                stack.pop();
            }

            if (stack.length === 0) {
                root.push(block);
            } else {
                stack[stack.length - 1].block.children.push(block);
            }

            stack.push({ block, level: indentLevel });
        }

        return root;
    }

    /**
     * Recursively sorts children of each block.
     * Only sorts siblings that are tasks. Non-tasks stay relative to where they were,
     * but usually in a list, all siblings are list items.
     * If mixed, we only move completed tasks to the bottom of that specific group of tasks.
     */
    private static sortBlocksRecursively(blocks: TaskBlock[]) {
        // Sort the current level
        this.sortLevel(blocks);

        // Recurse
        for (const block of blocks) {
            if (block.children.length > 0) {
                this.sortBlocksRecursively(block.children);
            }
        }
    }

    /**
     * Sorts a single array of blocks (siblings).
     * Moves completed tasks to the bottom.
     * Preserves order of incomplete tasks and non-tasks.
     * Preserves relative order of completed tasks among themselves.
     */
    private static sortLevel(blocks: TaskBlock[]) {
        // We only want to reorder if it's a list context.
        // A simple approach: Stable sort.
        // -1: a comes first
        // 1: b comes first
        // 0: maintain order

        blocks.sort((a, b) => {
            // If neither is a task, keep order
            if (!a.isTask || !b.isTask) return 0;

            // If one is task and other is not?
            // Usually lists are homogeneous. If mixed, we might want to be careful.
            // Assumption: we are sorting tasks within a list.
            // If there's a non-task line in between tasks (like a comment or blank line),
            // this sort might move tasks across it.
            // For simplicity and standard usage:
            // Incomplete < Complete

            if (a.isCompleted === b.isCompleted) return 0; // Stable sort relies on JS engine stability (ES2019+)

            if (a.isCompleted) return 1; // a is done, so it goes after b
            if (b.isCompleted) return -1; // b is done, so it goes after a (a comes first)

            return 0;
        });
    }

    private static stringifyBlocks(blocks: TaskBlock[]): string {
        let result = "";
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            result += block.originalText;
            if (block.children.length > 0) {
                result += "\n" + this.stringifyBlocks(block.children);
            }
            // Add newline between siblings, but check for end of file handling
            // The split removed newlines, so we need to add them back.
            // However, recursion makes this tricky.
            // Better strategy: stringify returns string with embedded newlines for children,
            // but we need to join siblings with newlines.
            if (i < blocks.length - 1) {
                result += "\n";
            }
        }
        return result;
    }

    /**
     * Helper to estimate indentation level.
     * Tabs = 4 spaces (or 1 tab).
     */
    private static getIndentLevel(indent: string): number {
        let level = 0;
        for (const char of indent) {
            if (char === '\t') level += 4;
            else level += 1;
        }
        return level;
    }
}
