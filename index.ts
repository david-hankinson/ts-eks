#!/usr/bin/node

import * as vpcModule from "./components/vpc"
import * as automation from "@pulumi/pulumi/automation";


export const nonprodDemoVpcArgs: vpcModule.VpcArgs = {
    description: "Typescript pulumi vpc module non-prod",
    
    instanceTenancy: "default",

    availabilityZones: ["ca-central-1a", "ca-central-1b", "ca-central-1d"],

    vpcCidr: "10.0.0.0/16",
    publicSubnetsCidrs: ["10.0.1.0/24", "10.0.2.0/24"],
    privateSubnetsCidrs: ["10.0.3.0/24", "10.0.4.0/24"],   

    vpcSecurityGroupName: "sg-non-prod",
    
    enableDnsHostnames: true,
    enableDnsSupport: true,

    tags: { "Name": "non-prod-vpc" }
};

export const prodDemoVpcArgs: vpcModule.VpcArgs = {
    description: "Typescript pulumi vpc module prod",

    instanceTenancy: "default",

    availabilityZones: ["ca-central-1a", "ca-central-1b", "ca-central-1d"],

    vpcCidr: "192.168.0.0/16",
    publicSubnetsCidrs: ["192.168.1.0/24", "192.168.2.0/24"],
    privateSubnetsCidrs: ["192.168.3.0/24", "192.168.4.0/24"],

    vpcSecurityGroupName: "sg-prod",
    
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

main().then(() => console.log("Done!"));
//main().catch(err => console.error(err));

