const bcrypt = require('bcryptjs')
const validator = require('validator')
const jwt = require('jsonwebtoken')

const User = require('../model/user')
const Post = require('../model/post')

const fileHelper = require('../utils/file-helper')

module.exports = {
    createUser: async({ userInput }, req) => {

        const errors = []

        if (!validator.isEmail(userInput.email)) {
            errors.push({message: 'Email not valid!'})
        }

        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
            errors.push({message: 'Password to short!'})
        }

        if (validator.isEmpty(userInput.name)) {
            errors.push({message: 'Name cannot be empty'})
        }

        if (errors.length > 0) {
            const error = new Error('invalid input')
            error.data = errors
            error.code = 422
            throw error
        }

        const checkUserExists = await User.findOne({ email: userInput.email })

        if (checkUserExists){
            const error = new Error('User exists already!')
            error.code = 442
            throw error
        }

        const passwordHash = await bcrypt.hash(userInput.password, 12)

        const user = new User({
            email: userInput.email,
            password: passwordHash,
            name: userInput.name
        })

        const createUser = await user.save()

        return {
            ...createUser._doc, _id: createUser._id.toString()
        }

    },
    login: async({email, password}, req) => {
        const user = await User.findOne({email: email})
        if(!user) {
            const error = new Error('email doesnt exists!')
            error.code = 404
            throw error
        }

        const isEqual = bcrypt.compare(password, user.password)
        if(!isEqual) {
            const error = new Error('wrong password. please try again')
            error.code = 401
            throw error
        }

        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        }, 'supersecretkey', { expiresIn: '1h' })

        return {
            token: token,
            userId: user._id.toString()
        }

    },
    createPost: async({postInput}, req) => {

        if (!req.isAuth){ 
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }

        const errors = []
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({message: 'Title is invalid'})
        }

        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({message: 'Content is invalid'})
        }

        if (errors.length > 0) {
            const error = new Error('Invalid Input')
            error.data = errors
            error.code = 422
            throw error
        }

        const user = await User.findById(req.userId)

        const post = new Post({
            title: postInput.title,
            imageUrl: postInput.imageUrl,
            content: postInput.content,
            creator: user
        })

        const postCreated = await post.save()

        user.posts.push(postCreated)
        await user.save()

        return {
            ...postCreated._doc, _id: postCreated._id.toString(), createdAt: postCreated.createdAt.toISOString(), updatedAt: postCreated.updatedAt.toISOString()
        }
    },
    posts: async({ page }, req) => {

        if (!req.isAuth) {
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }

        if (!page) {
            page = 1
        }
        perPage = 2
        const totalPost = await Post.find().countDocuments()
        const posts = await Post.find().sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).populate('creator')
        console.log(posts)

        return {
            posts: posts.map(p => {
                return{
                    ...p._doc, _id: p._id.toString(), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
                }
            }),
            totalPost: totalPost
        }
    },
    post: async({postId}, req) => {
        
        if (!req.isAuth) {
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }

        const post = await Post.findById(postId).populate('creator')

        if (!post) {
            const error = new Error('Post not found')
            error.code = 404
            throw error
        }

        console.log('post:', post)
        console.log('post document:', post._doc)

        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        }
    },
    updatePost: async({postId, updateInput}, req) => {

        if (!req.isAuth){
            const error = new Error('No authenticated')
            error.code = 401
            throw error
        }

        const post = await Post.findById(postId).populate('creator')

        const errors = []
        if (validator.isEmpty(updateInput.title) || !validator.isLength(updateInput.title, { min: 5 })) {
            errors.push({message: 'Title is invalid'})
        }

        if (validator.isEmpty(updateInput.content) || !validator.isLength(updateInput.content, { min: 5 })) {
            errors.push({message: 'Content is invalid'})
        }

        if (errors.length > 0) {
            const error = new Error('Invalid Input')
            error.data = errors
            error.code = 422
            throw error
        }

        if (!post) {
            const error = new Error('Post not found')
            error.code = 404
            throw error
        }

        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Not authorized')
            error.code = 403
            throw error
        }
        
        post.title = updateInput.title
        post.content = updateInput.content
        if (updateInput.imageUrl !== 'undefined') {
            post.imageUrl = updateInput.imageUrl
        }

        const updatedPost = await post.save()
        
        return {
            ...updatedPost._doc, _id: updatedPost._id.toString(), createdAt: updatedPost.createdAt.toISOString(), updatedAt: updatedPost.updatedAt.toISOString()
        }

    },
    deletePost: async({postId}, req) => {
        if (!req.isAuth){
            const error = new Error('No authenticated')
            error.code = 401
            throw error
        }

        const post = await Post.findById(postId)

        if (!post) {
            const error = new Error('Post not found')
            error.code = 404
            throw error
        }

        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not authorized')
            error.code = 403
            throw error
        }

        fileHelper.deleteFile(post.imageUrl)
        await Post.findByIdAndRemove(postId)

        const user = await User.findById(req.userId)
        user.posts.pull(postId)
        await user.save()

        return true
    }
}