import * as fs from 'fs-extra';
import * as path from 'path';
import { walk } from 'walk';
import { escapeRegExp, merge } from 'lodash';
import { ISearchStatus, IState } from 'types/main';

export type IWorkerData =
    {
        type: 'work';
        state: IState;
        replace: boolean;
    } | {
        type: 'stop';
    } | {
        type: 'cancel';
    };

export interface IWorkerResponse {
    state: Partial<ISearchStatus>;
    end: boolean;
}

let canWork = false;
let working = false;
let onEndWork: (() => void)[] = [];
let toCancel: { [name: string]: string | undefined };

onmessage = e => {
    const { state, replace, type } = JSON.parse(e.data);
    if (type === 'work' || type === 'cancel') {
        const startWork = () => {
            onEndWork = onEndWork.filter(x => x !== startWork);
            canWork = true;
            if (type === 'work') {
                work(state, replace);
            }
            else {
                cancel();
            }
        };

        if (working) {
            onEndWork.push(startWork);
            canWork = false;
        }
        else {
            startWork();
        }
    }
    else if (type === 'stop') {
        canWork = false;
    }
};

const cancel = async () => {
    await Promise.all(Object.keys(toCancel).map(file => {
        if (walker) {
            walker.cache[file] = toCancel[file];
        }
        return fs.writeFile(file, toCancel[file]);
    }));
    setState({ oldContent: false }, true);
}

const work = async (state: IState, replace: boolean) => {
    const { from, to, where, regex, caseSensitive, wholeWords, preserveCase } = state;

    let occurrencesCount = 0;
    let filesCount = 0;
    let oldContent = {};
    // let processed = 0;
    working = true;

    await cachingWalker(where, () => canWork, async (file, content) => {
        let matches: ISearchStatus['matches'] = [];
        oldContent = merge({}, oldContent, { [file]: content });
        let reText = regex ? from : escapeRegExp(from);
        if (wholeWords) {
            reText = '\\b' + reText + '\\b';
        }
        const needle = new RegExp(reText, 'g' + (caseSensitive ? '' : 'i'));
        let curReplacesCount = 0;

        const newContent = content.replace(needle, (content, ...data) => {
            ++curReplacesCount;
            matches = matches.concat({ file: path.relative(where, file), content });
            let replacement = to.replace(/\$(d+)/g, (match, index) => index in data ? data[index] : match);
            if (preserveCase) {
                replacement = preserveCaseByPattern(content, replacement);
            }
            return replacement;
        });
        toCancel = oldContent;
        setState({ matches, oldContent: true });

        let returnContent: string | undefined;

        if (curReplacesCount > 0) {
            occurrencesCount += curReplacesCount;
            ++filesCount;
            setState({ occurrencesCount, filesCount });
            if (replace) {
                returnContent = newContent;
            }
        }

        // ++processed;
        setState({ progress: null });

        return { content: returnContent };
    });

    setState({ work: false }, true);
    working = false;
    onEndWork.forEach(x => x());
};

type IWalkerIteration = (file: string, content: string) => Promise<{ canContinue?: boolean, content?: string }>;

const createWalker = (where: string): IWalker => {
    let finished = false;
    const cache: { [prop: string]: string | undefined } = {};
    let curIteration: IWalkerIteration | undefined;
    let lastNext: (() => void) | undefined;
    let curResolve: (() => void) | undefined;

    const walker = walk(where);

    walker.on('file', async (root, fileStats, next) => {
        const file = path.join(root, fileStats.name);
        const content = (await fs.readFile(file)).toString();
        cache[file] = content;
        lastNext = next;

        if (curIteration) {
            const result = await curIteration(file, content);
            if (result.content) {
                cache[file] = result.content;
            }
            if (result.canContinue !== false) next();
            else curResolve!();
        }
    });

    walker.on('end', () => {
        finished = true;
        curResolve!();
    });

    const fn = (iteration: IWalkerIteration) =>
        new Promise<void>(async resolve => {
            curIteration = iteration;
            curResolve = resolve;

            for (let file in cache) {
                const result = await curIteration(file, cache[file]!);
                if (result.content) {
                    cache[file] = result.content;
                }
                if (result.canContinue === false) {
                    resolve();
                    return;
                }
            }

            if (!lastNext) {
                finished = true;
                resolve();
            }
            else if (finished) resolve();
            else lastNext();
        });

    return Object.assign(fn, { cache });
};

type IWalker = ((iteration: IWalkerIteration) => Promise<void>) & { cache: { [prop: string]: string | undefined } };

let walkerKey = '';
let walker: IWalker | undefined;

/**
 * @param {string} where 
 * @param {() => boolean} [canWalk]
 * @param {(file: string, content: string) => Promise<boolean | void>} callback 
 * @returns Promise<void>
 */
const cachingWalker = async (
    where: string,
    canWalk: (() => boolean) | undefined,
    callback: (file: string, content: string) => Promise<{ content?: string } | undefined>
) => {
    if (walkerKey !== where) {
        walkerKey = where;
        walker = createWalker(where);
    }

    const iteration: IWalkerIteration = (file, content) => new Promise(async resolve => {
        let result = await callback(file, content);
        result = Object.assign({}, result);
        if (result && typeof result.content === 'string') {
            await fs.writeFile(file, result.content);
        }
        await new Promise(r => setTimeout(r, 0));

        if (!canWalk || canWalk()) resolve(Object.assign({}, result, { canContinue: true }));
        else resolve(Object.assign({}, result, { canContinue: false }));
    });

    await walker!(iteration);
};

const setState = (state: Partial<ISearchStatus>, end = false) => {
    (postMessage as any)(JSON.stringify({ state, end } as IWorkerResponse));
};

const preserveCaseByPattern = (pattern: string, source: string) => {
    const sourceArr = source.split('');
    const lcPattern = pattern.toLowerCase();
    for (let i = 0; i < source.length; ++i) {
        if (i < pattern.length) {
            sourceArr[i] = pattern[i] === lcPattern[i] ? sourceArr[i].toLowerCase() : sourceArr[i].toUpperCase();
        }
        else {
            break;
        }
    }
    return sourceArr.join('');
};