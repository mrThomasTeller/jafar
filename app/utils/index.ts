import { memoize as memoize_ } from 'ramda';

export const log = <T>(x: T) => {
    console.log(x);
    return x;
};

export const memoize: {
    // <P1, P2, R>(fn: (p1: P1, p2: P2) => R): ((p1: P1) => R);
    // <P1, R>(fn: (p1: P1) => R): ((p1: P1) => R);
    <T extends Function>(fn: T): T;
} = memoize_ as any;