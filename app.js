const express = require('express')
const app = express()
const mongoose = require('mongoose')
const PORT = process.env.PORT || 3000
const {MONGOURL} = require('./config/keys')
const cors = require('cors');

app.use(cors());

mongoose.connect(MONGOURL);

mongoose.connection.on('connected',()=>{
    console.log("conected to mongo")
})

mongoose.connection.on('error',(err)=>{
    console.log("err connecting",err)
})

require('./models/user')
require('./models/post')

app.use(express.json())
app.use(require('./routes/auth'))
app.use(require('./routes/post'))
app.use(require('./routes/user'))


app.listen(PORT,()=>{
    console.log("server is running on",PORT)
})
