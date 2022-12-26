import 'source-map-support/register';
import { DynamoDBStreamEvent, Context } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommandInput, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'stocks', logLevel: 'INFO' });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: DynamoDBStreamEvent, context: Context) => {
  logger.addContext(context);

  for (let record of event.Records) {
    logger.info('record', { object: record });

    let key = unmarshall(record.dynamodb?.Keys as any);
    let item = unmarshall(record.dynamodb?.NewImage as any);

    logger.info('item', { object: item });

    let t = item.type.startsWith('BUY#') ? item.total : (item.total * -1);
    let q = item.type.startsWith('BUY#') ? item.quantity : (item.quantity * -1);

    let input: UpdateItemCommandInput = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({ stock: key.stock, type: 'TOTAL' }),
      UpdateExpression: `ADD #amount :t, #quantity :q`,
      ExpressionAttributeNames: {
        '#amount': 'amount',
        '#quantity': 'quantity',
      },
      ExpressionAttributeValues: marshall({
        ':t': t,
        ':q': q,
      }),
      ReturnValues: 'ALL_NEW',
    };

    logger.info('input', { object: input });

    const result = await dynamo.send(new UpdateItemCommand(input));
    logger.info('result', { object: result });

    return result.Attributes;
  }
}