const { validationResult } = require('express-validator/check')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const User = require('../model/user')

exports.signUp = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        const error = new Error('Validation failed')
        error.statusCode = 422
        error.data = errors.array()
        throw error
    }

    const email = req.body.email
    const password = req.body.password
    const name = req.body.name

    try{
        const passwordHash = await bcrypt.hash(password, 12)
        const user = new User({
            email: email,
            password: passwordHash,
            name: name
        })
        const result = await user.save()
        res.status(201).json({
            message: 'User created',
            userId: result._id
        })
    }catch(err){
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }  
}

exports.postLogin = async (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    try{
        const user = await User.findOne({email: email})
        if (!user){
            const error = new Error('User with this email not found.')
            error.statusCode = 401
            throw error
        }
        const isEqual = await bcrypt.compare(password, user.password)
        if (!isEqual) {
            const error = new Error('Wrong Password')
            error.statusCode = 401
            throw error
        }
        const token = jwt.sign({
            email: user.email,
            userId: user._id.toString()
        }, 'supersecretkey', { expiresIn: '1h' })
        res.status(200).json({
            token: token,
            userId: user._id.toString()
        })
    }catch(err){
        if(!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
    
}


exports.getStatus = async (req, res, next) => {
    try{
        const user = await User.findById(req.userId)
        if (!user) {
            const error = new Error('User not found!')
            error.statusCode = 404
            throw error
        }
        res.status(200).json({
            status: user.status
        })
    }catch(err){
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.updateStatus = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        const error = new Error('Validation error')
        error.statusCode = 422
        throw error
    }
    const userId = req.userId
    const status = req.body.status

    try{
        const result = await User.findByIdAndUpdate(userId , {status: status})
        if (!result) {
            const error = new Error('User not found!')
            error.statusCode = 404
            throw error
        }
        res.status(200).json({
            message: 'Status updated',
            result: result    
        })
    }catch(err){
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
    
}