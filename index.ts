#!/usr/bin/node
import * as vpcModule from "./components/vpc"
import * as eksModule from "./components/eks"
import * as automation from "@pulumi/pulumi/automation";
import { config } from "process";

/**
 * Non-prod configuration
 */
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

export const nonProdEksArgs: eksModule.AsgArgs = {
    // Ec2 Description
    description: "Helloworld non-prod eks cluster",

    vpcId: "",
    publicSubnets: ["subnet-12345678", "subnet-23456789"],
    privateSubnets: ["subnet-34567890", "subnet-45678901"]
}


/**
 * Prod configuration
 */

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

export async function buildNonProd() {
    // Initialize a new workspace
    const projectName = "ts-modular-eks-iac"
    const stackName = "non-prod";
    
    // Create or select non-prod stack
    const nonProdVpc = await automation.LocalWorkspace.createOrSelectStack({
        stackName: stackName,
        projectName: projectName,
        program: async () => {
            // Component resource definition goes here
            new vpcModule.AwsWebVpc("non-prod", nonprodDemoVpcArgs);
        }
    });

    // Up the VPC stack
    await nonProdVpc.up({});

    // Get outputs from VPC stack
    const nonProdVpcOutputs = await nonProdVpc.outputs();

    const nonProdEks = await automation.LocalWorkspace.createOrSelectStack({
        stackName: stackName,
         projectName: projectName,

         program: async () => {
        // Component resource definition goes here
             new eksModule.AwsWebEc2("non-prod", nonProdEksArgs);
             config: vpcId: nonProdVpcOutputs.vpcId
         },
//        config: {
//             "vpcId": { value: nonProdVpcOutputs.vpcId }
//         }
    })

    await nonProdEks.up({});
    
    const nonProdEksOutputs = await nonProdEks.outputs();

//     const nonProdEks = await automation.LocalWorkspace.createOrSelectStack({
//         stackName: stackName,
//         projectName: projectName,

//         program: async () => {
//         // Component resource definition goes here
//             new eksModule.AwsWebEc2("non-prod", nonProdEksArgs);
//         },
//         config: {
//             "vpcId": { value: nonProdVpcOutputs.vpcId }
//         }
// });

    // // Create or select prod stack
    // const prodStack = await automation.LocalWorkspace.createOrSelectStack({
    //     stackName: stackNameProd,
    //     projectName: projectName,
    //     program: async () => {
    //         // Your component resource definition goes here
    //         // Example:
    //         new vpcModule.AwsWebVpc("prod", prodDemoVpcArgs);;
    //     }
    // });
    console.log("Stacks have been updated.");
}

buildNonProd().then(() => console.log("Done!"));
//main().catch(err => console.error(err));

