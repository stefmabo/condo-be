import { ApolloServer } from 'apollo-server'
import { resolvers, typeDefs } from './graphql'
import mongoose from 'mongoose'

const db = 'mongodb://smab:smab123@ds063124.mlab.com:63124/graphql'

const server = new ApolloServer({
  cors: true,
  typeDefs,
  resolvers,
  introspection: true,
})

mongoose
  .connect(
    db,
    {
      useCreateIndex: true,
      useNewUrlParser: true,
    },
  )
  .then(() =>
    server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
      console.log(`🚀 Server ready at ${url}`)
    }),
  )
  .catch(err => console.log(err))
