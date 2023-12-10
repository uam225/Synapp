const mongoose = require('mongoose')


const validTopics = ['Politics', 'Health', 'Sport', 'Tech']

const synapseSchema = mongoose.Schema({
    title:{
        type:String,
        required: true
    },
    topic: {
        type: [String],
        required: true,
        validate: {
            validator: function(topicsArray){
                return topicsArray.every(topic => validTopics.includes(topic))
            },
            message: props => `${props.value} is not a valid topic.`
        }
    },
    body:{
        type:String,
        required:true
    },
    user:{
        type:String,
        required:true
    },
    hashtag:{
        type:String
    },
    location:{
        type:String
    },
    expirationTime:{
        type:Number,
        min:1,
        max:(1440)
    },
    likes: [{
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User'
    }],
    dislikes: [{
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User'
    }],
    comments: [{
        text: String,
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        postedAt : {
            type: Date,
            default: Date.now
        }  
    }],
    date: {
        type:Date,
        default:Date.now
    }
})
synapseSchema.methods.getStatus = function() {
    const timeElapsed = (Date.now() - this.date.getTime()) / (1000 * 60) // Time elapsed in minutes
    const expirationTime = this.expirationTime || 24 * 60; // 24 hours in minutes as default

    const isExpired = timeElapsed > expirationTime
    const timeRemaining = isExpired ? 0 : expirationTime - timeElapsed

    return {
        status: isExpired ? 'expired' : 'live',
        timeRemaining: timeRemaining // Time remaining until expiration in minutes
    }
}

module.exports = mongoose.model('synapses', synapseSchema)