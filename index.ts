import { VpcArgs, AwsWebVpc } from "./components/vpc"
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { App } from "@aws-cdk/core";

// Helper function to load YAML config file
function loadConfig(filePath: string): any {
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        return yaml.load(fileContents);
    } catch (e) {
        console.error(`Error reading file from disk: ${e}`);
        throw e;
    }
}

// Load non-production config
const nonProdConfig = loadConfig('./Pulumi.non-prod.yml');

// Load production config
const prodConfig = loadConfig('./Pulumi.prod.yml');

const DemoVpcArgs: VpcArgs = {
    // AWS Account ID is inputed here
    //instanceTenancy: "default",
    instanceTenancy: nonProdConfig.instanceTenancy,

    vpcCidr: "10.0.0.0/16",
    publicSubnets: ["10.0.1.0/24", "10.0.2.0/24"],
    privateSubnets: ["10.0.3.0/24", "10.0.4.0/24"],
    securityGroups: ["sg-12345678"],
    internetGatewayName: ["igw-12345678"],
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { "Name": "demo-vpc" }
};


// Create a new VPC
// const demoAwsWebVpc = new AwsWebVpc("DemoWebVpc", DemoVpcArgs, { parent: this });

const app = new App();
new AwsWebVpc("demo-web-vpc", DemoVpcArgs);
app.synth();