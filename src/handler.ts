import 'reflect-metadata';
import { Context, APIGatewayProxyEvent, Callback, APIGatewayProxyResult } from 'aws-lambda';
import { ApolloServer } from 'apollo-server-lambda';

import * as TypeORM from 'typeorm';
import * as TypeGraphQL from 'type-graphql';

import { Container } from 'typedi';

import { RecipeResolver } from "./resolvers/recipe-resolver";
import { RateResolver } from "./resolvers/rate-resolver";
import { Recipe } from "./entities/recipe";
import { Rate } from "./entities/rate";
import { User } from "./entities/user";

export interface UserContext {
  user: User;
}

// register 3rd party IOC container
TypeGraphQL.useContainer(Container);
TypeORM.useContainer(Container);

async function bootstrap(event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) {
  try {
    await TypeORM.getConnection();
  } catch (err) {
    await TypeORM.createConnection({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Recipe, Rate, User],
      synchronize: true,
      logger: 'advanced-console',
      logging: 'all',
      dropSchema: true,
      cache: true,
    });
  }

  // build TypeGraphQL executable schema
  (global as any).schema = (global as any).schema || await TypeGraphQL.buildSchema({
    resolvers: [RecipeResolver, RateResolver],
    validate: false,
  });
  const schema = (global as any).schema;

  const server = new ApolloServer({ schema });
  server.createHandler()(event, context, callback);
}

export function graphql(event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) {
  bootstrap(event, context, callback);
}
