const express = require('express')
const router = express.Router()

const Synapse = require('../models/Synapse')

//POST (Create Data)
router.post('/', async(req,res)=>{
    
    const synapseData = new Synapse({
        title:req.body.title,
        topic:req.body.topic,
        body:req.body.body,
        user:req.body.user,
        hashtag:req.body.hashtag,
        location:req.body.location
    })
    try{
        const synapseToSave = await synapseData.save()
        res.send(synapseToSave)
    }catch(err){
        res.send({message:err})
    }
})

// GET1 (Read)
router.get('/', async(req,res)=>{
    try{
        const getSynapse = await Synapse.find()
        res.send(getSynapse)
    }catch(err){
        res.send({message:err})
    }
})

//GET2 (Read)
router.get('/:synapseId', async(req,res)=>{
    try{
        const getSynapseById = await Synapse.findById(req.params.synapseId)
        res.send(getSynapseById)
    }catch(err){
        res.send({message:err})
    }
})

//PATCH
router.patch('/:synapseId', async(req,res)=>{
    try{
        const updatebyId = await Synapse.updateOne(
            {_id:req.params.synapseId},
            {$set:{
                title:req.body.title,
                topic:req.body.topic,
                body:req.body.body,
                user:req.body.user,
                hashtag:req.body.hashtag,
                location:req.body.location
                }
            })
        res.send(updatebyId)
    }catch(err){
        res.send({message:err})
    }
})

//DELETE
router.delete('/:synapseId', async(req,res)=>{
    try{
        const deleteById = await Synapse.deleteOne({_id:req.params.synapseId})
        res.send(deleteById)
    }catch(err){
        res.send({message:err})
        }
})
module.exports = router