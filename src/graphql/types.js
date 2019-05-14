import { gql } from 'apollo-server'
import { SPACE, STATUS } from '../const'

export default gql`
  enum Status {
    ${STATUS.join(SPACE)}
  }

  type Query {
    visits(entryDate: String, status: Status, search: String): [Visit]
    visit(id: String!): Visit
    notificationToken: String
  }

  type Mutation {
    addVisit(
      id: String
      fullName: String!
      personId: String!
      carPlate: String
      entryDate: String
      exitDate: String
      houseToVisit: String!
      details: String
      goAlongWith: Int
    ): Visit
    deleteVisit(id: String): Visit
    authorizeVisit(id: String): Visit
    addNotificationToken(notificationToken: String): Boolean
  }

  type Subscription {
    visitAdded: Visit
    visitEdited: Visit
    visitDeleted: Visit
    visitAuthorized: Visit
  }

  type Visit {
    id: String
    fullName: String!
    personId: String!
    carPlate: String
    entryDate: String
    exitDate: String
    houseToVisit: String
    status: String
    details: String
    goAlongWith: Int
  }
`
