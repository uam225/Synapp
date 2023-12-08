const express = require('express')
const router = express.Router()

const Synapse = require('../models/Synapse.js')
const verifyToken = require('../verifyToken')
const { getRounds } = require('bcryptjs')

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

// GET all synapses
router.get('/', verifyToken, async(req, res) => {
    try {
        const synapses = await Synapse.find();
                
        if (!synapses || synapses.length === 0) {
            return res.status(404).send({ message: 'Synapses not found' });
        }

        const synapsesWithDetails = synapses.map(synapse => {
            const synapseObject = synapse.toObject();
            const statusInfo = synapse.getStatus();
            // Convert time remaining to hours and minutes
            const hours = Math.floor(statusInfo.timeRemaining / 60);
            const minutes = Math.floor(statusInfo.timeRemaining % 60);
            const timeRemainingFormatted = `${hours}h:${minutes}m`;

            return {
                _id: synapseObject._id,
                title: synapseObject.title,
                topic: synapseObject.topic,
                timestamp: synapseObject.date,
                timeRemaining: timeRemainingFormatted,
                body: synapseObject.body,
                expirationTime: synapseObject.expirationTime,
                status: statusInfo.status,
                owner: synapseObject.user,
                likes: synapseObject.likes.length,
                dislikes: synapseObject.dislikes.length,
                comments: synapseObject.comments,
            };
        });

        res.json(synapsesWithDetails);
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

// GET one synapse (by ID)
router.get('/:synapseId', verifyToken, async(req, res) => {
    try {
        const synapse = await Synapse.findById(req.params.synapseId)
                
        if (!synapse) {
            return res.status(404).send({ message: 'Synapse not found' });
        }

        const synapseObject = synapse.toObject();
        const statusInfo = synapse.getStatus();
        // Convert time remaining to hours and minutes
        const hours = Math.floor(statusInfo.timeRemaining / 60);
        const minutes = Math.floor(statusInfo.timeRemaining % 60);
        const timeRemainingFormatted = `${hours}h:${minutes}m`;

        const response = {
            _id: synapseObject._id,
            title: synapseObject.title,
            topic: synapseObject.topic,
            timestamp: synapseObject.date,
            timeRemaining: timeRemainingFormatted, 
            body: synapseObject.body,
            expirationTime: synapseObject.expirationTime,
            status: statusInfo.status,
            owner: synapseObject.user,
            likes: synapseObject.likes.length,
            dislikes: synapseObject.dislikes.length,
            comments: synapseObject.comments,
        };

        res.json(response);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});


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

//React
router.post('/react/:synapseId', verifyToken, async (req, res) => {
    try {
        const synapse = await Synapse.findById(req.params.synapseId)
        if (!synapse) {
            return res.status(404).send('Synapse not found')
        }

        // Check if the post has expired
        const timeElapsed = (Date.now() - synapse.date.getTime()) / (1000 * 60) // Time elapsed in minutes
        const expirationTime = synapse.expirationTime || 24 * 60; // Use default 24 hours if not set
        if (timeElapsed > expirationTime) {
            return res.status(400).send('This post has expired and cannot be reacted to')
        }

        const userId = req.user._id
        const reaction = req.body.reaction; // 'like', 'dislike'

        // Remove existing like/dislike (if any)
        synapse.likes = synapse.likes.filter(id => id.toString() !== userId.toString())
        synapse.dislikes = synapse.dislikes.filter(id => id.toString() !== userId.toString())

        // Apply new reaction
        if (reaction === 'like') {
            synapse.likes.push(userId);
        } else if (reaction === 'dislike') {
            synapse.dislikes.push(userId)
        }

        await synapse.save();

        res.json({
            message: `Reaction updated to '${reaction}'`
        });
    } catch (err) {
        res.status(500).send(err.message)
    }
})


//Comment
router.post('/comments/:synapseId', verifyToken, async (req, res) => {
    try {
        const synapse = await Synapse.findById(req.params.synapseId);
        if (!synapse) {
            return res.status(404).send('Synapse not found');
        }

        // Check if the post has expired
        const timeElapsed = (Date.now() - synapse.date.getTime()) / (1000 * 60); // Time elapsed in minutes
        const expirationTime = synapse.expirationTime || 24 * 60; // Use default 24 hours if not set
        if (timeElapsed > expirationTime) {
            return res.status(400).send('This post has expired and cannot be commented on');
        }

        // Add the new comment
        const newComment = {
            text: req.body.text,
            postedBy: req.user._id
        };

        synapse.comments.push(newComment);
        await synapse.save();

        res.json({
            message: 'Comment added successfully',
            comment: newComment
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


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