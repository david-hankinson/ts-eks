#!/usr/bin/node

import * as vpcModule from "./components/vpc"
import * as automation from "@pulumi/pulumi/automation";


export const nonprodDemoVpcArgs: vpcModule.VpcArgs = {
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

export const prodDemoVpcArgs: vpcModule.VpcArgs = {
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

export async function main() {
    // Initialize a new workspace
    const projectName = "ts-modular-eks-iac"
    const stackNameNonProd = "non-prod";
    const stackNameProd = "prod";
    

    // Create or select non-prod stack
    const nonProdStack = await automation.LocalWorkspace.createOrSelectStack({
        stackName: stackNameNonProd,
        projectName: projectName,
        program: async () => {
            // Component resource definition goes here
            new vpcModule.AwsWebVpc("non-prod", nonprodDemoVpcArgs);
        }
    });

    // Create or select prod stack
    const prodStack = await automation.LocalWorkspace.createOrSelectStack({
        stackName: stackNameProd,
        projectName: projectName,
        program: async () => {
            // Your component resource definition goes here
            // Example:
            new vpcModule.AwsWebVpc("prod", prodDemoVpcArgs);;
        }
    });

    // Optionally, run an update for each stack
    await nonProdStack.up({ onOutput: console.log });
    await prodStack.up({ onOutput: console.log });

    console.log("Stacks have been updated.");
}

main().catch(err => console.error(err));

