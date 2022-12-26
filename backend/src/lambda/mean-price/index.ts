import 'source-map-support/register';
import { Context } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommandInput, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'stocks', logLevel: 'INFO' });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: any, context: Context) => {
  logger.addContext(context);

  let total = unmarshall(event);
  let mean = total.amount / total.quantity;

  let input: UpdateItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Key: marshall({ stock: total.stock, type: 'MEANPRICE' }),
    UpdateExpression: 'SET value = :mean',
    ExpressionAttributeValues: marshall({ ':mean': mean }),
  }
  await dynamo.send(new UpdateItemCommand(input));
}