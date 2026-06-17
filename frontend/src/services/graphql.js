import { ApolloClient, InMemoryCache, createHttpLink, gql } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/graphql' 
    : '/graphql',
});

// Link middleware to automatically attach local JWT tokens
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

// GraphQL Queries and Mutations
export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      role
      avatarColor
      createdAt
    }
  }
`;

export const GET_ROOMS = gql`
  query GetRooms {
    rooms {
      id
      roomName
      description
      language
      createdBy {
        id
        name
        avatarColor
      }
      members {
        id
        name
        avatarColor
      }
      createdAt
    }
  }
`;

export const GET_ROOM_BY_ID = gql`
  query GetRoomById($id: ID!) {
    room(id: $id) {
      id
      roomName
      description
      code
      language
      updatedAt
      lastUpdatedBy {
        id
        name
        avatarColor
      }
      createdBy {
        id
        name
        avatarColor
      }
      members {
        id
        name
        avatarColor
      }
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($roomId: ID!) {
    messages(roomId: $roomId) {
      id
      message
      timestamp
      sender {
        id
        name
        avatarColor
      }
    }
  }
`;

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalRoomsCreated
      personalRoomsCreated
      roomsJoinedCount
      activeCollaborators
      userRole
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
        avatarColor
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $role: String) {
    register(name: $name, email: $email, password: $password, role: $role) {
      token
      user {
        id
        name
        email
        role
        avatarColor
      }
    }
  }
`;

export const CREATE_ROOM_MUTATION = gql`
  mutation CreateRoom($roomName: String!, $description: String, $language: String) {
    createRoom(roomName: $roomName, description: $description, language: $language) {
      id
      roomName
      description
      language
      createdBy {
        id
        name
      }
    }
  }
`;

export const JOIN_ROOM_MUTATION = gql`
  mutation JoinRoom($roomId: ID!) {
    joinRoom(roomId: $roomId) {
      id
      roomName
      members {
        id
        name
      }
    }
  }
`;
