const reducer = (state,action)=>{
  switch (action.type) {
    case 'SET_GROUPS':
      return {groups:action.groups}
    default:
      return state
  }
}

export default reducer