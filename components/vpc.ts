import * as aws from "@pulumi/aws";;
import { ComponentResource, ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";

export interface VpcArgs {
    // VPC Description
    description: string;
    
    // AWS Account ID is inputed here
    instanceTenancy?: string;
        
    // VPC CIDR
    vpcCidr: string
    publicSubnetsCidrs: string[];
    privateSubnetsCidrs: string[];
    
    // Availability Zones
    availabilityZones: string[];

    // Enable flow logs
    enableFlowLogs?: boolean;
    
    // Optional tags
    tags?: aws.Tags;

    // VPC Security Group Name
    vpcSecurityGroupName: string;
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
    privateRouteTable: aws.ec2.RouteTable = [];

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

    //public readonly vpcCidr: .Output<string>;
    //public readonly publicSubnetsCidrs: .Output<string>[] = [];
    //public readonly privateSubnetsCidrs: .Output<string>[] = [];
    //public readonly publicSubnets: { [key: string]: aws.ec2.Subnet } = {};
    //public readonly privateSubnets: { [key: string]: aws.ec2.Subnet } = {};
    

    //public readonly vpcSecurityGroupId: .Output<string>;
    //public readonly vpcSecurityGroupName: .Output<string>;
    
    //public readonly internetGatewayId: .Output<string>;
    //public readonly natGateways: { [key: string]: aws.ec2.NatGateway } = {};

    constructor(name: string, args: VpcArgs, opts?: ComponentResourceOptions) {
        super("custom:resource:VPC", name, args, opts);

        // Set the name of the VPC
        this.name = name;

        this.vpc = new aws.ec2.Vpc(name, {
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
        });

        // For each cidr in the publicSubnetsCidrs array, create a public subnet
        for (let i = 0; i < args.availabilityZones.length; i++) {
            const publicSubnet = new aws.ec2.Subnet(`${name}-public-subnet-${i}`, {
                vpcId: this.vpc.id,
                cidrBlock: args.vpcCidr,
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
        for (let i = 0; i < args.availabilityZones.length; i++) {
            const privateSubnet = new aws.ec2.Subnet(`${name}-private-subnet-${i}`, {
                vpcId: this.vpc.id,
                cidrBlock: args.vpcCidr,
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
        
        

      
                    

    // const instanceTenancy = args.instanceTenancy || "default";

    // const vpcName = `${name}-vpc`;
    // const cidrBlock = args.vpcCidr || "10.0.0.0/16";

    // const publicSubnetsCidrs = args.publicSubnetsCidrs
    // const privateSubnetsCidrs = args.privateSubnetsCidrs

    // // VPC
    // const vpc = new aws.ec2.Vpc(vpcName, {
    //     cidrBlock: cidrBlock,
    //     instanceTenancy: instanceTenancy,
    //     enableDnsHostnames: true,
    //     enableDnsSupport: true,
    //     tags: { "Name": vpcName },
    // }, { parent: this });

    // this.vpcId = vpc.id;
    
    // console.log("VPC Object: ", vpc); 

    // // Create public subnets
    // this.publicSubnets = {};
    // for (let i = 0; i < args.publicSubnetsCidrs.length; i++) {
    //     const subnetCidr = args.publicSubnetsCidrs[i];
    //     const subnetName = `${name}-public-subnet-${i + 1}`;
        
    //     // Create a new public subnet and add it to the publicSubnets object with a unique key
    //     this.publicSubnets[subnetName] = new aws.ec2.Subnet(subnetName, {
    //         vpcId: vpc.id,
    //         cidrBlock: subnetCidr,
    //         availabilityZone: aws.getAvailabilityZones().then(azs => azs.names[i]),
    //         mapPublicIpOnLaunch: true,
    //         tags: { "Name": subnetName },
    //     }, { parent: this });
    // }
    // // Create public subnets and NAT Gateways

    //     // Subnets, at least across two zones
    //     const allZones = aws.getAvailabilityZones({state: "available"});
    //     // Limiting to 2 zones for speed and to meet minimal requirements.
    //     const subnets: .Output<string>[] = [];
    //     const subnetNameBase = `${name}-subnet`;
    //     // Non-prod subnets
    //     for (let i = 0; i < 2; i++) {
    //         const az = allZones.then(it => it.zoneIds[i]);
    //         const subnetName = `${subnetNameBase}-nonprod-${i}`;
    //         const vpcSubnet = new aws.ec2.Subnet(subnetName, {
    //         assignIpv6AddressOnCreation: false,
    //         vpcId: vpc.id,
    //         mapPublicIpOnLaunch: true,
    //         cidrBlock: args.publicSubnetsCidrs[i],
    //         availabilityZoneId: az,
    //         tags: { "Name": subnetName },
    //         }, { parent: this });
    //         subnets.push(vpcSubnet.id);
    //     }

    //     // Prod subnets
    //     for (let i = 0; i < 2; i++) {
    //         const az = allZones.then(it => it.zoneIds[i]);
    //         const subnetName = `${subnetNameBase}-prod-${i}`;
    //         const vpcSubnet = new aws.ec2.Subnet(subnetName, {
    //         assignIpv6AddressOnCreation: false,
    //         vpcId: vpc.id,
    //         mapPublicIpOnLaunch: true,
    //         cidrBlock: args.privateSubnetsCidrs[i],
    //         availabilityZoneId: az,
    //         tags: { "Name": subnetName },
    //         }, { parent: this });
    //         subnets.push(vpcSubnet.id);
    //     }

    // // Return private subnet ids as a string
    // // const privateSubnetIdsString = .all(privateSubnetIds).apply(ids => ids.join(","));
    // const publicSubnetIdsString = .all(Object.values(this.publicSubnets).map(subnet => subnet.id)).apply(ids => ids.join(","));
    // // Internet Gateway
    // const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
    //     vpcId: vpc.id,
    //     tags: { "Name": `${name}-igw` },
    // }, { parent: this });

    // // Elastic IP

    // const eip = new aws.ec2.Eip(`${name}-eip`, {
    //     domain: "vpc",
    // }, { parent: this });

    // // NAT Gateways   
    // this.natGateways = {};
    // for (let i = 0; i < Object.keys(this.publicSubnets).length; i++) {
    //     // create a nat gateway for each public subnet
        
    //     const natGateway = new aws.ec2.NatGateway(`${name}-nat-gateway-${i + 1}`, {
    //         allocationId: eip.id,
    //         subnetId: publicSubnetIdsString.apply(ids => ids.split(",")[i]),
    //         tags: { "Name": `${name}-nat-gateway-${i + 1}` },
    //     }, { parent: this });
    //     this.natGateways[`${name}-nat-gateway-${i + 1}`] = natGateway;
    // }

    // // Public Route table
    // const publicRouteTable = new aws.ec2.RouteTable(`${name}-public-route-table`, {
    //     vpcId: vpc.id,
    //     routes: [{
    //         cidrBlock: "0.0.0.0/0",
    //         gatewayId: igw.id,
    //     }],
    //     tags: { "Name": `${name}-public-route-table` },
    // }, { parent: this });

    // // Private Route table
    // const privateRouteTable = new aws.ec2.RouteTable(`${name}-private-route-table`, {
    //     vpcId: vpc.id,
    //     tags: { "Name": `${name}-private-route-table` },
    // }, { parent: this });

    // // Public Route table association
    // for (const [index, subnet] of Object.entries(this.publicSubnets)) {
    //     const publicRouteTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-public-route-table-association-${index}`, {
    //         subnetId: subnet.id,
    //         routeTableId: publicRouteTable.id,
    //     }, { parent: this });
    // }

    // // Private Route table association
    // for (const [index, subnet] of Object.entries(this.privateSubnets)) {
    //     const privateRouteTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-private-route-table-association-${index}`, {
    //         subnetId: subnet.id,
    //         routeTableId: privateRouteTable.id,
    //     }, { parent: this });
    // }

    // Security Group

    this.vpcSecurityGroup = new aws.ec2.SecurityGroup(`${args.vpcSecurityGroupName}`, {
        name: "allow_tls",
        description: "Allow TLS inbound traffic and all outbound traffic",
        vpcId: this.vpc.id,
        tags: { "Name": `${name}-vpc-sg` },
    });

    // this.vpcId = vpc.id;
    // this.vpcCidr = vpc.cidrBlock;
    // //this.natGatewayId = natGateway.id;
    // this.vpcSecurityGroupName = vpcSecurityGroup.name;
    // this.vpcSecurityGroupId = vpcSecurityGroup.id;
    // // this.internetGatewayId = igw.id;

    }


}

