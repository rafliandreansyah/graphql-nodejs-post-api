const { validationResult } = require('express-validator/check')

const Post = require('../model/post')
const User = require('../model/user')

const io = require('../socket')
const fileHelper = require('../utils/file-helper')

exports.getPosts = async (req, res, next) => {
    let page = req.query.page || 1
    let perPage = 2

    try{
        const totalItems = await Post.find().populate('creator').sort({createdAt: -1}).countDocuments()
        const posts = await Post.find().populate('creator').skip((page - 1) * perPage).limit(perPage)

        res.status(200).json({
            posts: posts,
            totalItems: totalItems
        })
    }catch(err){
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }
        
}

exports.createPost = async (req, res, next) => {
    const title = req.body.title
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect')
        error.statusCode = 422
        throw error
    }

    const content = req.body.content
    const image = req.file

    if (!req.file){
        const error = new Error('No image provided')
        error.statusCode = 422
        throw error
    }

    
    const post = new Post({
        title: title,
        content: content,
        imageUrl: image.path,
        creator: req.userId
    })
    try{
        await post.save()
        const user =  await User.findById(req.userId)
        user.posts.push(post)
        await user.save()
        
        //emit client socketio create post
        io.getIo().emit('posts', { action: 'create', post: {...post._doc, creator: { _id: req.userId, name: user.name }} })

        //sending status post
        res.status(201).json({
            message: "post created successfully",
            post: post,
            creator: {
                _id: user._id, name: user.name
            }
        })
    }catch(err){
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }
    
}

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId

    try{
        const postData = await Post.findById(postId)
        if (!postData) {
            const error = new Error('Post not found!')
            error.statusCode = 404
            throw error
        }
        res.status(200).json({
            message: 'get post success',
            post: postData
        })
    }catch(err){
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }
}

exports.updatePost = async (req, res, next) => {
    const postId = req.params.postId

    const errors = validationResult(req)

    if (!errors.isEmpty()){
        const error = new Error('Validation failed, entered data is incorrect')
        error.statusCode = 422
        throw error
    }

    const title = req.body.title
    const content = req.body.content
    let imageUrl = req.body.image

    if (req.file) {
        imageUrl = req.file.path
    }
    
    if (!imageUrl) {
        const error = new Error('No image pick.')
        error.statusCode = 422
        throw error
    }

    try {
        const post = await Post.findById(postId).populate('creator')
        if (!post) {
            const error = new Error('Post not found.')
            error.statusCode = 404
            throw error 
        }
        if (imageUrl !== post.imageUrl){
            fileHelper.deleteFile(post.imageUrl)
        }
        if (post.creator._id.toString() !== req.userId){
            const error = new Error('Not authorized!')
            error.statusCode = 403
            throw error
        }
        post.title = title
        post.content = content
        post.imageUrl = imageUrl
        const result = await post.save()

        //emit client socketio update post
        io.getIo().emit('posts', { action: 'update', post: result })

        res.status(200).json({
            message: 'Post Updated.',
            post: result
        })
    } catch(err){
        if (!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }
            
        

}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId
    try {
        const post = await Post.findById(postId)
            
        if (!post){
            const error = new Error('Post not found')
            error.statusCode = 404
            throw error
        }
        if (post.creator.toString() !== req.userId){
            const error = new Error('Not authorized!')
            error.statusCode = 403
            throw error
        }
        fileHelper.deleteFile(post.imageUrl)
        await Post.findByIdAndRemove(postId)

        const user = await User.findById(req.userId)
        user.posts.pull(postId)
        await user.save()
        io.getIo().emit('posts', { action: 'delete', post: postId })

        res.status(200).json({message: 'Post deleted.'})
    }catch(err) {
        if (!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }    
}