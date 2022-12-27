import 'source-map-support/register';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, UpdateItemCommandInput, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Context, DynamoDBStreamEvent } from 'aws-lambda';

const logger = new Logger({ serviceName: 'stocks', logLevel: 'INFO' });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: DynamoDBStreamEvent, context: Context) => {
  logger.addContext(context);

  for (let record of event.Records) {
    logger.info('record', { object: record });

    let item = unmarshall(record.dynamodb?.NewImage as any);
    logger.info('item', { object: item });

    let average = item.amount / item.quantity;
    let coin = item.coin;

    let input: UpdateItemCommandInput = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({ stock: item.stock, type: 'AVERAGE' }),
      UpdateExpression: 'SET #average = :average, #coin = :coin',
      ExpressionAttributeNames: {
        '#average': 'average',
        '#coin': 'coin',
      },
      ExpressionAttributeValues: marshall({
        ':average': average,
        ':coin': coin,
      }),
    };
    await dynamo.send(new UpdateItemCommand(input));
  }
};