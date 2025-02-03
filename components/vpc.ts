import * as aws from "@pulumi/aws";;
import * as pulumi from "@pulumi/pulumi";

export interface VpcArgs {
    // AWS Account ID is inputed here
    instanceTenancy?: string;
    
    vpcCidr: string
    
    publicSubnetsCidrs: string[];
    privateSubnetsCidrs: string[];
    
    // make vpcSecurityGroups an object that has an iam policy in it
    vpcSecurityGroupId?: string;
    vpcSecurityGroupName?: string;
    internetGatewayId?: string;
    
    mapPublicIpOnLaunch?: boolean;
    enableDnsHostnames?: boolean;
    enableDnsSupport?: boolean;
    
    tags?: aws.Tags;
}

// Pulumi class that acts as a logical grouping of resources for a web VPC.
// Here, a member of the team with network skills can build a VPC that works for the organisation.
export class AwsWebVpc extends pulumi.ComponentResource {
    
    public readonly vpcId: pulumi.Output<string>;
    
    public readonly vpcCidr: pulumi.Output<string>;
    public readonly publicSubnetsCidrs: pulumi.Output<string>[] = [];
    public readonly privateSubnetsCidrs: pulumi.Output<string>[] = [];
    public readonly publicSubnets: { [key: string]: aws.ec2.Subnet } = {};
    public readonly privateSubnets: { [key: string]: aws.ec2.Subnet } = {};
    
    public readonly vpcSecurityGroupId: pulumi.Output<string>;
    public readonly vpcSecurityGroupName: pulumi.Output<string>;
    
    public readonly internetGatewayId: pulumi.Output<string>;
    public readonly natGateways: { [key: string]: aws.ec2.NatGateway } = {};

    constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:resource:VPC", name, args, opts);

    const instanceTenancy = args.instanceTenancy || "default";

    const vpcName = `${name}-vpc`;
    const cidrBlock = args.vpcCidr || "10.0.0.0/16";

    const publicSubnetsCidrs = args.publicSubnetsCidrs
    const privateSubnetsCidrs = args.privateSubnetsCidrs

    // VPC
    const vpc = new aws.ec2.Vpc(vpcName, {
        cidrBlock: cidrBlock,
        instanceTenancy: instanceTenancy,
        enableDnsHostnames: true,
        enableDnsSupport: true,
        tags: { "Name": vpcName },
    }, { parent: this });
    
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

        // Subnets, at least across two zones
        const allZones = aws.getAvailabilityZones({state: "available"});
        // Limiting to 2 zones for speed and to meet minimal requirements.
        const subnets: pulumi.Output<string>[] = [];
        const subnetNameBase = `${name}-subnet`;
        // Non-prod subnets
        for (let i = 0; i < 2; i++) {
            const az = allZones.then(it => it.zoneIds[i]);
            const subnetName = `${subnetNameBase}-nonprod-${i}`;
            const vpcSubnet = new aws.ec2.Subnet(subnetName, {
            assignIpv6AddressOnCreation: false,
            vpcId: vpc.id,
            mapPublicIpOnLaunch: true,
            cidrBlock: args.publicSubnetsCidrs[i],
            availabilityZoneId: az,
            tags: { "Name": subnetName },
            }, { parent: this });
            subnets.push(vpcSubnet.id);
        }

        // Prod subnets
        for (let i = 0; i < 2; i++) {
            const az = allZones.then(it => it.zoneIds[i]);
            const subnetName = `${subnetNameBase}-prod-${i}`;
            const vpcSubnet = new aws.ec2.Subnet(subnetName, {
            assignIpv6AddressOnCreation: false,
            vpcId: vpc.id,
            mapPublicIpOnLaunch: true,
            cidrBlock: args.privateSubnetsCidrs[i],
            availabilityZoneId: az,
            tags: { "Name": subnetName },
            }, { parent: this });
            subnets.push(vpcSubnet.id);
        }

    // Return private subnet ids as a string
    // const privateSubnetIdsString = pulumi.all(privateSubnetIds).apply(ids => ids.join(","));
    // const publicSubnetIdsString = pulumi.all(Object.values(this.publicSubnets).map(subnet => subnet.id)).apply(ids => ids.join(","));
    // Internet Gateway
    const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
        vpcId: vpc.id,
        tags: { "Name": `${name}-igw` },
    }, { parent: this });

    // Elastic IP
    const eip = new aws.ec2.Eip(`${name}-eip`, {
        domain: "vpc",
    }, { parent: this });

    // NAT Gateway
    // const natGateway = new aws.ec2.NatGateway(`${name}-nat-gateway`, {
    //     allocationId: `${name}-nat-gateway"`,
    //     subnetId: this.publicSubnets[`${name}-public-subnet-1`].arn,
    //     tags: { "Name": `${name}-nat-gateway` },
    // }, { parent: this });

    
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

    // Public Route table
    const publicRouteTable = new aws.ec2.RouteTable(`${name}-public-route-table`, {
        vpcId: vpc.id,
        routes: [{
            cidrBlock: "0.0.0.0/0",
            gatewayId: igw.id,
        }],
        tags: { "Name": `${name}-public-route-table` },
    }, { parent: this });

    // Private Route table
    const privateRouteTable = new aws.ec2.RouteTable(`${name}-private-route-table`, {
        vpcId: vpc.id,
        tags: { "Name": `${name}-private-route-table` },
    }, { parent: this });

    // Public Route table association
    for (const [index, subnet] of Object.entries(this.publicSubnets)) {
        const publicRouteTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-public-route-table-association-${index}`, {
            subnetId: subnet.id,
            routeTableId: publicRouteTable.id,
        }, { parent: this });
    }

    // Private Route table association
    for (const [index, subnet] of Object.entries(this.privateSubnets)) {
        const privateRouteTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-private-route-table-association-${index}`, {
            subnetId: subnet.id,
            routeTableId: privateRouteTable.id,
        }, { parent: this });
    }

    // Security Group
    const vpcSecurityGroup = new aws.ec2.SecurityGroup(`${args.vpcSecurityGroupName}`, {
        name: "allow_tls",
        description: "Allow TLS inbound traffic and all outbound traffic",
        vpcId: vpc.id,
        tags: { "Name": `${name}-vpc-sg` },
    });

    this.vpcId = vpc.id;
    this.vpcCidr = vpc.cidrBlock;
    //this.natGatewayId = natGateway.id;
    this.vpcSecurityGroupName = vpcSecurityGroup.name;
    this.vpcSecurityGroupId = vpcSecurityGroup.id;
    this.internetGatewayId = igw.id;

    }


}

