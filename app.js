const express = require('express')
const app = express()

const mongoose = require('mongoose')

require('dotenv/config')

const bodyParser = require('body-parser')
app.use(bodyParser.json())

const synapseRoute = require('./routes/synapses')
const authRoute = require('./routes/auth')

app.use('/api/synapses', synapseRoute)
app.use('/api/users', authRoute)

app.get('/', (req,res)=>{
    res.send('Homepage')
})
mongoose.connect(process.env.DB_CONNECTOR).then(()=>{
    console.log('DB is connected...')
})

app.listen(3000, ()=>{
    console.log('Server is running...')
})