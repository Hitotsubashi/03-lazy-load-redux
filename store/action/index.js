import {fetchGroups} from '../../apis'

export const SET_GROUPS=(groups)=>({
  type:'SET_GROUPS',
  groups
})

export const MAKE_GROUPS_PROXY = (groups)=>(dispatch)=>{
  const groupProxy = new Proxy(groups,{
    get(target, property){
      console.log('target',property);
      console.log('property',property);
      if(!target[property]){
        dispatch(REQUEST_GROUPS())
        return '加载中'
      }
      return target[property]
    }
  })
  dispatch(SET_GROUPS(groupProxy))
}

export const REQUEST_GROUPS = ()=>async (dispatch) => { 
  const {groups} = await fetchGroups()
  dispatch(MAKE_GROUPS_PROXY(groups))
}