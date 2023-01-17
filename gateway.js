import path from 'path';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';

import { ApolloServer } from '@apollo/server';
import {
  ApolloGateway,
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
} from '@apollo/gateway';
import { startStandaloneServer } from '@apollo/server/standalone';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

const subgraphs = [
  {
    name: 'a',
    url: 'http://localhost:4001/graphql',
  },
  {
    name: 'b',
    url: 'http://localhost:4002/graphql',
  },
];

class MaybeOverrideSubgraph extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (request.query.includes('getBusiness') && Math.random() < 0.5) {
      // override the request to actually go to A
      request.http.url = 'http://localhost:4001/graphql';
    }
  }
}

export async function buildGateway(port) {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs,
    }),
    buildService({ name, url }) {
      return new MaybeOverrideSubgraph({ name, url });
    },
  });

  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    gateway,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  const dirname = path.dirname(import.meta.url).replace(/^file:\/\//, '');
  console.log('dirname', dirname);
  app.get('/', (req, res) => {
    res.sendFile(path.join(dirname, 'graphiql.html'));
  });

  app.use(
    '/graphql',
    cors(),
    bodyParser.json({ limit: '50mb' }),
    expressMiddleware(server)
  );

  await new Promise((resolve) => httpServer.listen({ port }, resolve));

  console.log(`Gateway running!`);
}
