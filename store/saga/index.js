import { eventChannel, buffers } from 'redux-saga';

let trigger = null

const handler = {
  get: (target, property) => {
    if(!(typeof property==='string'&&/\d+/.test(property))) return target[property]
    if (!(property in target)) {
      if (trigger instanceof Function) {
        trigger({});
      }
      return '加载中';
    }
    return target[property];
  },
};

const makeGroupProxy = (target)=>{
  return new Proxy(target, handler);
}