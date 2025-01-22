import { VpcArgs, AwsWebVpc } from "./components/vpc";
import { App } from "@aws-cdk/core";


const DemoVpcArgs: VpcArgs = {
    // AWS Account ID is inputed here
    instanceTenancy: "default",

  
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