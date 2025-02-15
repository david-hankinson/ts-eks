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

    asg = aws.autoscaling.Group;

    ns = k8s.core.v1.Namespace;

    appLabels: { [key: string]: string };

    // lc: aws.ec2.LaunchConfiguration;

    deployment: k8s.apps.v1.Deployment;


    constructor(name: string, args: AsgArgs, opts?: ComponentResourceOptions) {
        super("custom:component:AwsWebEc2", name, {}, opts);

        // Set the name of the EKS cluster
        this.name = name;
    
        this.eks = new eks.Cluster(`${name}-eks-cluster`, {
            vpcId: args.vpcId,
            subnetIds: args.publicSubnets,
            authenticationMode: eks.AuthenticationMode.Api,
            desiredCapacity: 2,
            minSize: 1,
            maxSize: 2,
            storageClasses: "gp2",
        });

        this.ns = new k8s.core.v1.Namespace(`${name}-eks-ns`, {});

        this.appLabels = { appClass: name };

        this.deployment = new k8s.apps.v1.Deployment(`${name}-deployment`, {
            metadata: {
                namespace: this.ns.name,
                labels: this.appLabels,
            },
            spec: {
                replicas: 1,
                selector: { matchLabels: this.appLabels },
                template: {
                    metadata: {
                        labels: this.appLabels,
                    },
                    spec: {
                        containers: [
                            {
                                name: name,
                                image: "nginx:latest",
                                ports: [{ name: "http", containerPort: 80 }],
                            },
                        ],
                    },
                },
            },
        },
    );

    }
}
