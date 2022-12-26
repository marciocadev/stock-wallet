import { App, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { InsertStockStack } from './constructs/insertStockStack';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      partitionKey: {
        name: 'stock',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'type',
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: 'stock-wallet',
      stream: StreamViewType.NEW_IMAGE,
    });

    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'stock-wallet',
    });

    const validator = new RequestValidator(this, 'Validator', {
      requestValidatorName: 'validator',
      restApi: rest,
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    new InsertStockStack(this, 'InsertStockStack', {
      table: table,
      rest: rest,
      validator: validator,
      resource: rest.root.addResource('stock'),
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'stock-wallet-backend-dev', { env: devEnv });
// new MyStack(app, 'backend-prod', { env: prodEnv });

app.synth();