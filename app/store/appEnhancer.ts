import { StoreEnhancer } from 'redux';
import { IRootState } from 'types/root';
import { pick } from 'lodash';
import R = require('ramda');

export default (createStore => {
    return (reducer, preloadedState) => {
        const dataStr = localStorage.getItem('state');
        if (dataStr) {
            const data = JSON.parse(dataStr);
            preloadedState = preloadedState || {} as any as IRootState;
            preloadedState = R.assoc('main', R.merge(preloadedState.main || {}, data), preloadedState);
        }
        const store = createStore(reducer, preloadedState);
        const dispatch = store.dispatch;
        store.dispatch = (action: any) => {
            let result = dispatch(action);
            const saveToStorage: (keyof IRootState['main'])[] = [
                'where',
                'from',
                'to',
                'regex',
                'nonPrintableSymbols',
                'caseSensitive',
                'wholeWords',
                'preserveCase'
            ];
            const data = pick((store.getState() as any as IRootState).main, saveToStorage);
            localStorage.setItem('state', JSON.stringify(data));
    
            return result;
        };
        return store;
    };
}) as StoreEnhancer<IRootState>;