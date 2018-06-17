import { combineReducers, Reducer } from 'redux';
import { routerReducer as routing } from 'react-router-redux';
import main from './main';

const rootReducer = combineReducers({
    main,
    routing: routing as Reducer<any>
});

export default rootReducer;
