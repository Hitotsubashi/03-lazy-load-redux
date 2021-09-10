import { createStore,applyMiddleware } from 'redux'
import reducer from './reducer'
import thunk from 'redux-thunk'
import {MAKE_GROUPS_PROXY} from './action'

const store = createStore(reducer,{groups:{}}, applyMiddleware(thunk))
store.dispatch(MAKE_GROUPS_PROXY({}))

export default store