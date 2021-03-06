const  { buildSchema } = require('graphql')

module.exports = buildSchema(`

    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        email: String!
        name: String!
        password: String!
        posts: [Post!]
        status: String!
    }

    type AuthData {
        token: String!
        userId: String!
    }

    type PostData {
        posts: [Post!]!
        totalPost: Int!
    }

    input UserInput {
        email: String!
        password: String!
        name: String!
    }

    input PostInput {
        title: String!
        imageUrl: String!
        content: String!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts(page: Int!): PostData!
        post(postId: ID!): Post!
    }

    type RootMutation {
        createUser(userInput: UserInput!): User!
        createPost(postInput: PostInput!): Post! 
        updatePost(postId: ID!, updateInput: PostInput!): Post!
        deletePost(postId: ID!): Boolean
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`)