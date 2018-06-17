export interface IFormState {
    from: string;
    to: string;
    where: string;
    regex: boolean;
    nonPrintableSymbols: boolean;
    caseSensitive: boolean;
    wholeWords: boolean;
    preserveCase: boolean;
}

export interface ISearchStatus {
    occurrencesCount?: number;
    filesCount?: number;
    oldContent: boolean;
    progress?: number | null;
    matches: { file: string, content: string }[];
    work?: boolean;
    action?: 'find' | 'replace';
}

export interface IState extends IFormState, ISearchStatus {
}