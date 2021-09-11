var express = require('express')
var app = express()

const USERS = [
  {
    id:'0',
    name:'用户A',
    group_id:'0'
  },
  {
    id:'1',
    name:'用户B',
    group_id:'0'
  },
  {
    id:'2',
    name:'用户C',
    group_id:'1'
  }
]

const GROUPS={
  '0':'分组A',
  '1':'分组C'
}

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