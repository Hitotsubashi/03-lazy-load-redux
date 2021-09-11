import api from '@/service/index';
import type { Effect } from 'dva';
import type { Reducer } from 'redux';
import { eventChannel, buffers } from 'redux-saga';

export interface DeployGroupState {
  groups: TargetGroup;
}

export interface DeployGroupModel {
  state: DeployGroupState;
  effects: {
    queryGroups: Effect;
    watchGroup: Effect;
  };
  reducers: {
    setGroups: Reducer<DeployGroupState>;
  };
}

interface TriggerFn {
  (input?: any): void;
}

let trigger: null | TriggerFn = null;
type TargetGroup = Record<string, string>;

const handler: ProxyHandler<TargetGroup> = {
  get: (obj: TargetGroup, prop: any) => {
    if (['string', 'number'].includes(typeof prop) && /^\d+$/.test(prop) && !(prop in obj)) {
      if (trigger instanceof Function) {
        trigger({});
      }
      return '加载中';
    }
    return obj[prop];
  },
};

const makeProxyGroup = (target: TargetGroup = {}): TargetGroup => {
  return new Proxy(target, handler);
};

const makeRefreshGroupChannel = () => {
  return eventChannel((emitter) => {
    trigger = emitter;
    return () => {};
  }, buffers.dropping(1));
};

const fetchGroups = async () => {
  const { res, err } = await api.group.getGroups();
  if (err) return null;
  if (res?.code === 0) {
    return res.data;
  }
  return null;
};

const group: DeployGroupModel = {
  state: {
    groups: makeProxyGroup(),
  },
  effects: {
    *queryGroups({ payload }, { call, put }) {
      const result = yield call(fetchGroups, payload);
      if (result) {
        yield put({
          type: 'setGroups',
          payload: result,
        });
      }
    },
    *watchGroup(action, { call, take, put }) {
      const chan = yield call(makeRefreshGroupChannel);
      try {
        while (yield take(chan)) {
          const result = yield call(fetchGroups);
          if (result) {
            yield put({
              type: 'setGroups',
              payload: result,
            });
            // dva依赖的redux-saga版本中没有delay方法，垃圾
            yield new Promise((resolve) => setTimeout(resolve, 10 * 1000));
          }
        }
      } finally {
        // eslint-disable-next-line no-console
        console.warn('watchGroup end.');
      }
    },
  },
  reducers: {
    setGroups(state, { payload }) {
      const { groups } = payload;
      return {
        ...state,
        groups: makeProxyGroup(groups),
      };
    },
  },
};

export default group;
