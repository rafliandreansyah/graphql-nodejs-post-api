const path = require('path')

const express = require('express')

const mongoose = require('mongoose')
const multer = require('multer')
const { graphqlHTTP } = require('express-graphql')

const app = express()

const graphqlSchema = require('./graphql/schema')
const graphqlResolver = require('./graphql/resolvers')

const auth = require('./middleware/auth')

const MONGO_URL = 'mongodb+srv://rafliandrean_:mancity113@cluster0.g1eir.mongodb.net/message?retryWrites=true'

const fileImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images')
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname)
    }
})

const fileImageFilter = (req, file, cb) => {
    if(file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
        cb(null, true)
    }
    else{
        cb(null, false)
    }
}

//middleware Parse json
app.use(express.json()) //parser json

//middleware for upload images
app.use(multer({storage: fileImageStorage, fileFilter: fileImageFilter}).single('image'))

// static path
app.use('/images', express.static(path.join(__dirname, 'images')))

// Allow cors
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS'){
        return res.sendStatus(200)
    }
    next()
})

app.use(auth)

app.use('/graphql', graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
        if (!err.originalError) {
            return err
        }
        const data = err.originalError.data
        const message = err.originalError.message || 'An error occured'
        const status = err.originalError.code || 500

        return {
            message: message, data: data, status: status
        }
    }
}))

//Global handling error
app.use((error, req, res, next) => {
    console.log(error)
    const status = error.statusCode || 500
    const message = error.message
    const data = error.data
    res.status(status).json({
        message: message,
        data: data
    })
})

//mongo connect to database
mongoose.connect(MONGO_URL)
    .then(result => {
        app.listen(8080)
    })
    .catch(err => console.log(err))