import { eventChannel, buffers } from 'redux-saga';
import {fetchGroups} from '../../apis'
import {call,take,put} from 'redux-saga/effects'

let trigger = null

export const makeGroupProxy = (target={})=>{
  return new Proxy(target, {
    get: (target, property) => {
      if(!(typeof property==='string'&&/\d+/.test(property))) return target[property]
      if (!(property in target)) {
        if (trigger instanceof Function) {
          trigger({});
        }
        return '加载中';
      }
      return target[property];
    }
  });
}

const makeRefreshGroupChannel = () => {
  return eventChannel((emitter) => {
    trigger = emitter;
    return () => {};
  }, buffers.dropping(0));
};

export function* watchGroupSaga(){
  const chan = yield call(makeRefreshGroupChannel);
  try {
    while (yield take(chan)) {
      const {groups} = yield call(fetchGroups);
      if (groups) {
        yield put({
          type: 'SET_GROUPS',
          groups: makeGroupProxy(groups),
        });
      }
    }
  } finally {
    console.warn('watchGroup end.');
  }
}