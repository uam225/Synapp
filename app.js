const express = require('express')
const app = express()
const mongoose = require('mongoose')
require('dotenv/config')
const bodyParser = require('body-parser')

const synapseRoute = require('./routes/synapses')

app.use(bodyParser.json())
app.use('/synapses', synapseRoute)

app.get('/', (req,res)=>{
    res.send('Homepage')
})
mongoose.connect(process.env.DB_CONNECTOR).then(()=>{
    console.log('DB is connected...')
})

app.listen(3001, ()=>{
    console.log('Server is running...')
})