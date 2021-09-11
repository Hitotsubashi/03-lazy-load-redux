import { createStore,applyMiddleware } from 'redux'
import reducer from './reducer'
import createSagaMiddleware from "redux-saga";
import {makeGroupProxy,watchGroupSaga} from './saga'

const sagaMiddleware = createSagaMiddleware();
const store = createStore(reducer,{groups:makeGroupProxy({})}, applyMiddleware(sagaMiddleware))
sagaMiddleware.run(watchGroupSaga);

export default store