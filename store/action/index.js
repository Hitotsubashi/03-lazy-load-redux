import {fetchGroups} from '../../apis'

export const SET_GROUPS=(groups)=>({
  type:'SET_GROUPS',
  groups
})

export const MAKE_GROUPS_PROXY = (groups)=>(dispatch)=>{
  const groupProxy = new Proxy(groups,{
    get(target, property){
      if(!(typeof property==='string'&&/\d+/.test(property))) return target[property]
      if(!(property in target)){
        dispatch(REQUEST_GROUPS())
        return '加载中'
      }
      return target[property]
    }
  })
  dispatch(SET_GROUPS(groupProxy))
}

let loading = false
export const REQUEST_GROUPS = ()=>async (dispatch) => {
  if(loading) return
  loading = true
  const {groups} = await fetchGroups()
  loading = false
  dispatch(MAKE_GROUPS_PROXY(groups))
}