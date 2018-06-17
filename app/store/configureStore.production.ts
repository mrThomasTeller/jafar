import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createBrowserHistory } from 'history';
import { routerMiddleware } from 'react-router-redux';
import rootReducer from 'reducers';
import appEnhancer from './appEnhancer';

const history = createBrowserHistory();
const router = routerMiddleware(history);
const enhancer = compose<any>(applyMiddleware(thunk, router), appEnhancer);

export = {
  history,
  configureStore(initialState: Object | void) {
    return createStore<any>(rootReducer, initialState, enhancer);
  }
};
