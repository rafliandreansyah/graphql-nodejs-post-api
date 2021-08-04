const  { buildSchema } = require('graphql')

module.exports = buildSchema(`

    type TestData {
        value: String!,
        room: Int!
    }

    type RootQuery {
        hello: TestData
    }

    schema {
        query: RootQuery
    }
`)