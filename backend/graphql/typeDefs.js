import { gql } from 'graphql-tag';

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    avatarColor: String!
    createdAt: String!
  }

  type Room {
    id: ID!
    roomName: String!
    description: String
    code: String!
    language: String!
    lastUpdatedBy: User
    createdBy: User!
    members: [User!]!
    createdAt: String!
    updatedAt: String
  }

  type Message {
    id: ID!
    sender: User!
    room: ID!
    message: String!
    timestamp: String!
  }

  type Notification {
    id: ID!
    user: ID!
    notificationMessage: String!
    status: String!
    timestamp: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type StatsPayload {
    totalRoomsCreated: Int!
    personalRoomsCreated: Int!
    roomsJoinedCount: Int!
    activeCollaborators: Int!
    userRole: String!
  }

  type Query {
    me: User
    rooms: [Room!]!
    room(id: ID!): Room
    messages(roomId: ID!): [Message!]!
    notifications: [Notification!]!
    dashboardStats: StatsPayload!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, role: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createRoom(roomName: String!, description: String, language: String): Room!
    joinRoom(roomId: ID!): Room!
    updateRoomCode(roomId: ID!, code: String!, language: String): Room!
  }
`;

export default typeDefs;
