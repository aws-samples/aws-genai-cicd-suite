import os
import json
import boto3
# Initialize SageMaker Runtime client
smr_client = boto3.client('sagemaker-runtime')
    
def lambda_handler(event, context):
    
    # Get the endpoint name from environment variable or configuration
    endpoint_name = os.environ.get('SAGEMAKER_ENDPOINT_NAME')
    
    # Parse the input from the API Gateway event
    body = json.loads(event['body'])
    prompt = body.get('prompt', '')
    params = body.get('parameters', {
        "max_new_tokens": 256,
        "temperature": 0.1
    })
    
    try:
        # Invoke the SageMaker endpoint
        response = smr_client.invoke_endpoint(
            EndpointName=endpoint_name,
            Body=json.dumps({
                "inputs": prompt,
                "parameters": params
            }),
            ContentType="application/json"
        )
        
        # Parse and return the result
        result = json.loads(response['Body'].read().decode("utf8"))
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
