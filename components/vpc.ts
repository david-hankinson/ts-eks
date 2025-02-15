import * as aws from "@pulumi/aws";;
import { ComponentResource, ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";

export interface VpcArgs {
    // VPC Description
    description: string;

    // AWS Account ID is inputed here
    instanceTenancy?: string;

    // Availability Zones
    availabilityZones: string[];

    // VPC CIDR
    vpcCidr: string
    publicSubnetsCidrs: string[];
    
    privateSubnetsCidrs: string[];

    // VPC Security Group Name
    vpcSecurityGroupName: string;

    // Enable DNS Hostnames and support
    enableDnsHostnames?: boolean;
    enableDnsSupport?: boolean;

    // Optional tags
    tags?: aws.Tags;
}

//  class that acts as a logical grouping of resources for a web VPC.
// Here, a member of the team with network skills can build a VPC that works for the organisation.
export class AwsWebVpc extends ComponentResource {

    private name: string;

    //public readonly vpcId: Output<string>;
    vpc: aws.ec2.Vpc;

    internetGateway: aws.ec2.InternetGateway;
    publicSubnets: aws.ec2.Subnet[] = [];
    vpcSecurityGroup: aws.ec2.SecurityGroup;
    publicRouteTable: aws.ec2.RouteTable;

    privateSubnets: aws.ec2.Subnet[] = [];
    privateRouteTables: aws.ec2.RouteTable[] = [];

    natGateways: aws.ec2.NatGateway[] = [];
    natElasitcIp: aws.ec2.Eip[] = [];

    public privateSubnetIds(): Output<string>[] {
        return this.privateSubnets.map(subnet => subnet.id);
    }

    public publicSubnetIds(): Output<string>[] {
        return this.publicSubnets.map(subnet => subnet.id);
    }

    public vpcId(): Output<string> {
        return this.vpc.id;
    }

    public internetGatewayId(): Output<string> {
        return this.internetGateway.id;
    }

    constructor(name: string, args: VpcArgs, opts?: ComponentResourceOptions) {
        super("custom:resource:VPC", name, args, opts);

        // Set the name of the VPC
        this.name = name;

        this.vpc = new aws.ec2.Vpc(`${name}-vpc`, {
            cidrBlock: args.vpcCidr,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            tags: {
                ...args.tags,
                "Description": `${args.description}`,
            },
        });

        this.internetGateway = new aws.ec2.InternetGateway(`${name}-igw`, {
            vpcId: this.vpc.id,
            tags: {
                ...args.tags,
                "Name": `${name}-igw`,
            },
        }, { parent: this.vpc });

        // For each cidr in the publicSubnetsCidrs array, create a public subnet
        for (let i = 0; i < args.publicSubnetsCidrs.length; i++) {
            const publicSubnet = new aws.ec2.Subnet(`${name}-public-subnet-${i}`, {
                vpcId: this.vpc.id,
                cidrBlock: args.publicSubnetsCidrs[i],
                availabilityZone: args.availabilityZones[i],
                mapPublicIpOnLaunch: true,
                tags: {
                    ...args.tags,
                    "Name": `${name}-public-subnet-${i}`,
                },
            });
            this.publicSubnets.push(publicSubnet);
        }

        // For each cidr in the privateSubnetsCidrs array, create a private subnet
        for (let i = 0; i < args.privateSubnetsCidrs.length; i++) {
            const privateSubnet = new aws.ec2.Subnet(`${name}-private-subnet-${i}`, {
                vpcId: this.vpc.id,
                cidrBlock: args.privateSubnetsCidrs[i],
                availabilityZone: args.availabilityZones[i],
                mapPublicIpOnLaunch: false,
                tags: {
                    ...args.tags,
                    "Name": `${name}-private-subnet-${i}`,
                },
            });
            this.privateSubnets.push(privateSubnet);
        }

        // Adopt the default route table for the VPC, and adapt it for use with public subnets
        {
            this.publicRouteTable = <aws.ec2.RouteTable>new aws.ec2.DefaultRouteTable(`${name}-public-rt`, {
                defaultRouteTableId: this.vpc.defaultRouteTableId,
                tags: {
                    ...args.tags,
                    Name: `${args.description} Public Route Table`,
                },
            }, { parent: this.vpc });

            new aws.ec2.Route(`${name}-route-public-sn-to-ig`, {
                routeTableId: this.publicRouteTable.id,
                destinationCidrBlock: "0.0.0.0/0",
                gatewayId: this.internetGateway.id,
            }, { parent: this.publicRouteTable });

            this.publicSubnets.map((subnet, index) => {
                return new aws.ec2.RouteTableAssociation(`${name}-public-rta-${index + 1}`, {
                    subnetId: subnet.id,
                    routeTableId: this.publicRouteTable.id,
                }, { parent: this.publicRouteTable });
            });
        }

        // Create a NAT Gateway and appropriate route table for each private subnet
        for (let i = 0; i < this.privateSubnets.length; i++) {
            const privateSubnet = this.privateSubnets[i];
            const publicSubnet = this.publicSubnets[i];

            this.natElasitcIp.push(new aws.ec2.Eip(`${name}-eip-${i}`, {
                vpc: true,
                tags: {
                    ...args.tags,
                    Name: `${name}-eip-${i}`,
                },
            }, { parent: privateSubnet }));

            this.natGateways.push(new aws.ec2.NatGateway(`${name}-nat-${i}`, {
                allocationId: this.natElasitcIp[i].id,
                subnetId: publicSubnet.id,
                tags: {
                    ...args.tags,
                    Name: `${name}-nat-${i}`,
                },
            }, { parent: privateSubnet }));

            this.privateRouteTables.push(new aws.ec2.RouteTable(`${name}-private-rt-${i}`, {
                vpcId: this.vpc.id,
                tags: {
                    ...args.tags,
                    Name: `${args.description} Private Route Table ${i}`,
                },
            }, { parent: privateSubnet }));

            new aws.ec2.Route(`${name}-route-private-sn-to-nat-${i + 1}`, {
                routeTableId: this.privateRouteTables[i].id,
                destinationCidrBlock: "0.0.0.0/0",
                natGatewayId: this.natGateways[i].id,
            }, { parent: this.privateRouteTables[i] });

            new aws.ec2.RouteTableAssociation(`${name}-private-rta-${i + 1}`, {
                subnetId: privateSubnet.id,
                routeTableId: this.privateRouteTables[i].id,
            }, { parent: this.privateRouteTables[i] });
        }

        this.vpcSecurityGroup = new aws.ec2.SecurityGroup(`${args.vpcSecurityGroupName}`, {
            name: "allow_tls",
            description: "Allow TLS inbound traffic and all outbound traffic",
            vpcId: this.vpc.id,
            tags: { "Name": `${name}-vpc-sg` },
        });
    }
}

