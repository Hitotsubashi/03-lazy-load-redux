var express = require('express')
var app = express()

const USERS = [
  {
    id:'0',
    name:'用户A',
    group_id:'0'
  }
]

const GROUPS=[
  {
    id:'0',
    name:'分组A'
  }
]

const PORT=8888

app.use(function(req,res,next){
  res.header("Access-Control-Allow-Origin", "*");
  next()
})


app.get('/users', function (req, res) {
  res.send({users:USERS})
})

app.get('/groups', function (req, res) {
  setTimeout(() => {
    res.send({groups:GROUPS})
  }, 1000);
})


app.listen(PORT)