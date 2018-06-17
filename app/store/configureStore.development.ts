import { createStore, applyMiddleware, compose, Reducer } from 'redux';
import thunk from 'redux-thunk';
import { createHashHistory } from 'history';
import { routerMiddleware, push } from 'react-router-redux';
import { createLogger } from 'redux-logger';
import rootReducer from 'reducers';

import * as mainActions from 'actions/main';
import appEnhancer from './appEnhancer';

declare const window: Window & {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?(a: any): void;
};

declare const module: NodeModule & {
    hot?: {
        accept(...args: any[]): any;
    }
};

const actionCreators = Object.assign({},
    mainActions,
    { push }
);

const logger = (<any>createLogger)({
    level: 'info',
    collapsed: true
});

const history = createHashHistory();
const router = routerMiddleware(history);

// If Redux DevTools Extension is installed use it, otherwise use Redux compose
/* eslint-disable no-underscore-dangle */
const composeEnhancers: typeof compose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        // Options: http://zalmoxisus.github.io/redux-devtools-extension/API/Arguments.html
        actionCreators
    }) as any :
    compose;
/* eslint-enable no-underscore-dangle */
const enhancer = composeEnhancers<any>(
    applyMiddleware(thunk, router, logger),
    appEnhancer
);

export = {
    history,
    configureStore(initialState: Object | void) {
        const store = createStore(rootReducer as Reducer<any>, initialState, enhancer);

        if (module.hot) {
            module.hot.accept('reducers', () =>
                store.replaceReducer(require('reducers')) // eslint-disable-line global-require
            );
        }

        return store;
    }
};
