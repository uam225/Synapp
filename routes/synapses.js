const express = require('express')
const router = express.Router()

const Synapse = require('../models/Synapse.js')
const verifyToken = require('../verifyToken')

//POST (Create a synapse)
router.post('/', verifyToken, async(req,res)=>{
    
    const synapseData = new Synapse({
        title:req.body.title,
        topic:req.body.topic,
        body:req.body.body,
        user:req.body.user,
        hashtag:req.body.hashtag,
        location:req.body.location,
        expirationTime:req.body.expiresIn
    })
    try {
        const synapseToSave = await synapseData.save();
        res.send(synapseToSave);
    } catch (err) {
        if (err.name === 'ValidationError') {
            let errors = {};

            for (field in err.errors) {
                errors[field] = err.errors[field].message;
            }

            return res.status(400).send(errors);
        }

        // Handle other types of errors
        res.status(500).send({ message: err.message });
    }
})

// GET1 (Read)
// GET all synapses
router.get('/', verifyToken, async(req, res) => {
    try {
        const synapses = await Synapse.find();
        const synapsesWithStatus = synapses.map(synapse => {
            const synapseObject = synapse.toObject();
            const statusInfo = synapse.getStatus();

            return {
                ...synapseObject,
                status: statusInfo.status,
                timeRemaining: statusInfo.timeRemaining
            };
        });

        res.json(synapsesWithStatus);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});


//Get expired posts
router.get('/expiredSynapses/', verifyToken, async (req, res) => {
    try {
        const expiredSynapses = await Synapse.find({ status: 'expired' })
            .sort({ date: -1 });

        if (expiredSynapses.length === 0) {
            return res.status(404).send('No expired posts found')
        }

        res.json(expiredSynapses)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

//Get synapses by id (Read)
router.get('/:synapseId', verifyToken, async(req,res)=>{
    try{
        const getSynapseById = await Synapse.findById(req.params.synapseId)
        res.send(getSynapseById)
    }catch(err){
        res.status(400).send({message:err})
    }
})

//PATCH
router.patch('/:synapseId', verifyToken, async(req,res)=>{
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
        res.status(400).send({message:err})
    }
})

//DELETE
router.delete('/:synapseId', verifyToken,  async(req,res)=>{
    try{
        const deleteById = await Synapse.deleteOne({_id:req.params.synapseId})
        res.send(deleteById)
    }catch(err){
        res.status(400).send({message:err})
        }
})

// Like
router.post('/likes/:synapseId', verifyToken, async (req, res) => {
    try {
        const synapse = await Synapse.findById(req.params.synapseId)
        if (!synapse) {
            return res.status(404).send('Synapse not found')
        }

        if(synapse.checkExpiration()){
            return res.status(404).send('This post has expired!')
        }

        if(!synapse.likes) {
            synapse.likes = [];
        }

        const index = synapse.likes.indexOf(req.user._id)
        if (index > -1) {
            synapse.likes.splice(index, 1)
        } else {
            synapse.likes.push(req.user._id)
        }

        await synapse.save()
        res.json(synapse)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

//Dislike
router.post('/dislikes/:synapseId', verifyToken, async (req, res) => {
    try {
        const synapse = await Synapse.findById(req.params.synapseId);
        if (!synapse) {
            return res.status(404).send('Synapse not found')
        }

        if(synapse.checkExpiration()){
            return res.status(404).send('This post has expired!')
        }

        const index = synapse.dislikes.indexOf(req.user._id)
        if (index > -1) {
            synapse.dislikes.splice(index, 1)
        } else {
            synapse.dislikes.push(req.user._id)
        }

        await synapse.save()
        res.json(synapse)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

//Comment
router.post('/comments/:synapseId', verifyToken, async (req, res) => {
    try {
        const synapse = await Synapse.findById(req.params.synapseId)
        if (!synapse) {
            return res.status(404).send('Synapse not found')
        }

        if(synapse.checkExpiration()){
            return res.status(404).send('This post has expired!')
        }
        
        //Initialise comment array
        if(!synapse.comments) {
            synapse.comments=[]
        }

        const newComment = {
            text: req.body.text,
            postedBy: req.user._id
        };

        synapse.comments.push(newComment)

        await synapse.save()
        res.json(synapse)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

//most active post
router.get('/mostActiveSynapse/:topic', verifyToken, async (req, res) => {
    try {
        const mostActiveSynapse = await Synapse.aggregate([
            // Match posts by topic
            { $match: { topic: req.params.topic } },
            // Add a field that represents the total activity (likes + dislikes)
            {
                $addFields: {
                    totalActivity: { $sum: [{ $size: "$likes" }, { $size: "$dislikes" }] }
                }
            },
            // Sort by total activity in descending order
            { $sort: { totalActivity: -1 } },
            // Limit to the first document (most active post)
            { $limit: 1 }
        ]);

        if (mostActiveSynapse.length === 0) {
            return res.status(404).send('No posts found for this topic')
        }

        res.json(mostActiveSynapse[0])
    } catch (err) {
        res.status(500).send(err.message)
    }
})

module.exports = router