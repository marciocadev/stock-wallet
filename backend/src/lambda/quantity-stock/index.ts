import 'source-map-support/register';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, UpdateItemCommandInput, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBStreamEvent, Context } from 'aws-lambda';

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
    let c = item.coin;

    let input: UpdateItemCommandInput = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({ stock: key.stock, type: 'TOTAL' }),
      // UpdateExpression: `ADD #amount :t, #quantity :q`,
      UpdateExpression: `SET #amount = if_not_exists(#amount, :z) + :t,
        #quantity = if_not_exists(#quantity, :z) + :q,
        #coin = :c`,
      ExpressionAttributeNames: {
        '#amount': 'amount',
        '#quantity': 'quantity',
        '#coin': 'coin',
      },
      ExpressionAttributeValues: marshall({
        ':z': 0,
        ':t': t,
        ':q': q,
        ':c': c,
      }),
      ReturnValues: 'ALL_NEW',
    };

    logger.info('input', { object: input });

    const result = await dynamo.send(new UpdateItemCommand(input));
    logger.info('result', { object: result });

    const body = unmarshall(result.Attributes as any);

    return {
      statusCode: 200,
      body: JSON.stringify(body),
    };
  }
};