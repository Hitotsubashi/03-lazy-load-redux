export const fetchUsers = ()=>{
  return fetch('http://localhost:8888/users').then(res=>res.json())
}

export const fetchGroups = ()=>{
  return fetch('http://localhost:8888/groups').then(res=>res.json())
}