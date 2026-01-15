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

        const taskRegex = /^\s*[-*]\s+\[(.)\]/;
        const match = text.match(taskRegex);

        this.isTask = !!match;
        this.isCompleted = match ? match[1] !== ' ' : false;
    }

    private getIndentation(text: string): string {
        return text.match(/^\s*/)?.[0] || '';
    }
}

export class TaskSorter {
    static sort(text: string): string {
        if (!text) return "";
        const lines = text.split(/\r?\n/);
        const rootBlocks = this.parseBlocks(lines);
        this.sortBlocksRecursively(rootBlocks);
        return this.stringifyBlocks(rootBlocks);
    }

    private static parseBlocks(lines: string[]): TaskBlock[] {
        const root: TaskBlock[] = [];
        const stack: { block: TaskBlock, level: number }[] = [];

        lines.forEach((line, i) => {
            const block = new TaskBlock(line, i);
            const indentLevel = this.getIndentLevel(block.indentation);

            while (stack.length && stack[stack.length - 1].level >= indentLevel) {
                stack.pop();
            }

            if (!stack.length) {
                root.push(block);
            } else {
                stack[stack.length - 1].block.children.push(block);
            }

            stack.push({ block, level: indentLevel });
        });

        return root;
    }

    private static sortBlocksRecursively(blocks: TaskBlock[]) {
        this.sortLevel(blocks);
        blocks.forEach(block => {
            if (block.children.length) {
                this.sortBlocksRecursively(block.children);
            }
        });
    }

    private static sortLevel(blocks: TaskBlock[]) {
        blocks.sort((a, b) => {
            if (!a.isTask || !b.isTask) return 0;
            if (a.isCompleted === b.isCompleted) return 0;
            return a.isCompleted ? 1 : -1;
        });
    }

    private static stringifyBlocks(blocks: TaskBlock[]): string {
        return blocks.map(block => {
            const childrenText = block.children.length ? "\n" + this.stringifyBlocks(block.children) : "";
            return block.originalText + childrenText;
        }).join("\n");
    }

    private static getIndentLevel(indent: string): number {
        return indent.split('').reduce((acc, char) => acc + (char === '\t' ? 4 : 1), 0);
    }
}
