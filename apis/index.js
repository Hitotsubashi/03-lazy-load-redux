export const fetchUsers = ()=>{
  return fetch('http://localhost:8888/users').then(res=>res.json())
}

const loading = false
export const fetchGroups = ()=>{
  if(loading) return
  loading = true
  return fetch('http://localhost:8888/groups').then(res=>{
    loading = false
    return res.json()
  })
}