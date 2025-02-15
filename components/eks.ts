import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import { ComponentResource, ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";
import { AwsWebVpc } from "../components/vpc";

export interface AsgArgs {
    // Ec2 Description
    description: string;

    // Import vpc
    vpcId: Input<String>;

    // Import public subnets
    publicSubnets: Input<String>;

    // Import private subnets
    privateSubnets: Input<String>;
    
    // // Launch Configuration Name
    // launchConfigurationName: string;

    // // Launch configuration 
    // launchConfiguration: aws.ec2.LaunchConfiguration;

    // AWS Account ID is inputed here
    instanceTenancy?: string;

    // Availability Zones
    availabilityZones: string[];
    
    // // Instance Type
    // instanceType: string;

    // // Ami Id
    // ami: string;

    // // ec2 security groups
    // ec2SecurityGroups: string[];
    
    tags?: aws.Tags
}


// export the class
export class AwsWebEc2 extends ComponentResource {

    private name: string;

    vpc: AwsWebVpc["vpcId"];

    privateSubnets: AwsWebVpc["privateSubnetIds"];

    publicSubnets: AwsWebVpc["publicSubnetIds"];

    eks: aws.eks.Cluster;

    // asg: aws.autoscaling.Group;

    // lc: aws.ec2.LaunchConfiguration;


    constructor(name: string, args: AsgArgs, opts?: ComponentResourceOptions) {
        super("custom:component:AwsWebEc2", name, {}, opts);

        this.name = name;
    
        this.eks = new eks.Cluster(name, {
            vpcId: args.vpcId,
            subnetIds: args.publicSubnets,
            authenticationMode: eks.AuthenticationMode.Api,
            desiredCapacity: 2,
            minSize: 1,
            maxSize: 2,
            storageClasses: "gp2",
        });

        


// o 
    
    // variables eg. vpc: aws.ec2.Vpc

    // pulumi outputs
    
    // constructor

        // 
