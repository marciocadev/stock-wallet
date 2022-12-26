import { Aws, Duration, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { AwsIntegration, IntegrationOptions, JsonSchema, JsonSchemaType, JsonSchemaVersion, Model, RequestValidator, Resource, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { FilterCriteria, FilterRule, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { LambdaDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';

export interface InsertStockStackProps extends NestedStackProps {
  table: Table;
  rest: RestApi;
  validator: RequestValidator;
  resource: Resource;
};

export class InsertStockStack extends NestedStack {
  constructor(scope: Construct, id: string, props: InsertStockStackProps) {
    super(scope, id, props);

    const { table, rest, validator, resource } = props;

    const meanPriceLmb = new NodejsFunction(this, 'MeanPrice', {
      functionName: 'mean-price',
      entry: join(__dirname, '../lambda/mean-price/index.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });
    table.grantWriteData(meanPriceLmb);

    const quantityLmb = new NodejsFunction(this, 'SumQuantityStock', {
      functionName: 'sum-quantity-stock',
      entry: join(__dirname, '../lambda/quantity-stock/index.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
      onSuccess: new LambdaDestination(meanPriceLmb),
    });
    quantityLmb.addEventSource(new DynamoEventSource(table, {
      startingPosition: StartingPosition.LATEST,
      filters: [
        FilterCriteria.filter({
          eventName: FilterRule.isEqual('INSERT'),
          dynamodb: {
            Keys: {
              type: {
                S: FilterRule.beginsWith("BUY#")
              },
            },
          },
        }),
        FilterCriteria.filter({
          eventName: FilterRule.isEqual('INSERT'),
          dynamodb: {
            Keys: {
              type: {
                S: FilterRule.beginsWith("SELL#")
              },
            },
          },
        }),
      ]
    }));
    table.grantWriteData(quantityLmb);

    const gatewayDynamoRole = new Role(this, 'GatewayDynamoRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    table.grantWriteData(gatewayDynamoRole);

    const requestSchemaPost: JsonSchema = {
      title: 'PostInsertStock',
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT7,
      properties: {
        stock: { type: JsonSchemaType.STRING },
        type: { type: JsonSchemaType.STRING },
        quantity: { type: JsonSchemaType.INTEGER },
        amount: { type: JsonSchemaType.NUMBER },
        date: { type: JsonSchemaType.STRING },
      },
      required: ['stock', 'operation', 'quantity', 'amount'],
    };

    const model: Model = new Model(this, 'PostModel', {
      restApi: rest,
      schema: requestSchemaPost,
      contentType: 'application/json',
    });

    const integrationOpt: IntegrationOptions = {
      credentialsRole: gatewayDynamoRole,
      requestTemplates: {
        'application/json': `
          #set($total = $input.path('quantity')*$input.path('amount'))
          #if($input.path('operation').toUpperCase() == "BUY")
          #set($type = "BUY#$context.requestId")
          #else
          #set($type = "SELL#$context.requestId")
          #end
          {
            "TableName":"${table.tableName}",
            "Item": {
              "stock":{"S":"$input.path('$.stock').toUpperCase()"},
              "type":{"S":"$type"},
              "quantity":{"N":"$input.path('$.quantity')"},
              "amount":{"N":"$input.path('$.amount')"},
              "date":{"S":"$input.path('$.date')"},
              "total":{"N":"$total"}
            }
          }
        `,
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': '$context.requestId',
          },
        },
        {
          statusCode: '400',
          responseTemplates: {
            'application/json': JSON.stringify({
              state: 'error',
              message: "$util.escapeJavaScript($input.path('$.errorMessage'))"
            }),
          },
        },
      ],
    };

    const integration = new AwsIntegration({
      service: 'dynamodb',
      region: `${Aws.REGION}`,
      action: 'PutItem',
      options: integrationOpt,
    });

    resource.addMethod('POST', integration, {
      methodResponses: [{ statusCode: '200' }],
      requestValidator: validator,
      requestModels: {
        'application/json': model,
      },
    });
  }
}