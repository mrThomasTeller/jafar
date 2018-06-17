declare module 'walk' {
    export interface IWalker {
        on(type: 'file', callback: (root: string, fileStats: { name: string }, next: () => void) => void): void;
        on(type: 'end', callback: () => void): void;
    }

    export function walk(where: string): IWalker;
}