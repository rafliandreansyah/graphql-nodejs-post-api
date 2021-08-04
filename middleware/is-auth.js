const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization')
    if (!authHeader) {
        const error = new Error('No authenticated')
        error.statusCode = 401
        throw error
    }

    const token = authHeader.split(' ')[1]
    let decodeToken

    try{
        decodeToken = jwt.verify(token, 'supersecretkey')
    }catch(err){
        err.statusCode = 401
        throw err
    }
     
    if (!decodeToken){
        const error = new Error('No authenticated')
        error.statusCode = 401
        throw error
    }

    req.userId = decodeToken.userId
    next()

}