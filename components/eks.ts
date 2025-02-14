import * as aws from "@pulumi/aws";
import { ComponentResource, ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { AwsWebVpc } from "../components/vpc";
// export the interface

export interface AsgArgs {
    // Import vpc
    vpcId: AwsWebVpc["vpcId"]; 

    publicSubnets: Input<String>;

    // Ec2 Description
    description: string;

   
    // AWS Account ID is inputed here
    instanceTenancy? string;

    // Availability Zones
    availabilityZones: string[];
    // 
    instanceType: string;

    ami: string;

    securityGroups: string

    tags?: aws.Tags
}

// export the class
    
    // variables eg. vpc: aws.ec2.Vpc

    // pulumi outputs
    
    // constructor

        // 
