import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";


export interface VpcArgs {
    // AWS Account ID is inputed here
    instanceTenancy?: string;
    
    vpcCidr: string
    
    publicSubnetsCidrs: string[];
    privateSubnetsCidrs: string[];
    
    securityGroups?: string[];
    
    internetGatewayName?: string[];
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

    // public readonly vpcSecurityGroupIds: pulumi.Output<string>[] = [];
    public readonly internetGatewayId: pulumi.Output<string>;
    // public readonly routeTableId: pulumi.Output<string>;
    // public readonly routeTableAssociationIds: pulumi.Output<string>[] = [];

    // Output the public and private subnet IDs from const publicSubnets as a pulumi.Output<string>[]
    

    constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:resource:VPC", name, args, opts);

    const instanceTenancy = args.instanceTenancy || "default";

    const vpcName = `${name}-vpc`;
    const cidrBlock = args.vpcCidr || "10.0.0.0/16";

    const publicSubnetsCidrs = args.publicSubnetsCidrs
    const privateSubnetsCidrs = args.publicSubnetsCidrs

    const enableDnsHostnames = args.enableDnsHostnames || true;
    const enableDnsSupport = args.enableDnsSupport || true;

    // VPC
    const vpc = new aws.ec2.Vpc(vpcName, {
        cidrBlock: cidrBlock,
        instanceTenancy: instanceTenancy,
        enableDnsHostnames: enableDnsHostnames,
        enableDnsSupport: enableDnsSupport,
        tags: { "Name": vpcName },
    }, { parent: this });

    // Internet gateway
    const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
        vpcId: vpc.id,
        tags: { "Name": `${name}-igw` },
    }, { parent: this });

    // Public subnets
    publicSubnetsCidrs.map((publicSubnetsCidrs, index) => {
        const publicSubnets = new aws.ec2.Subnet(`${name}-public-subnet-${index}`, {
            vpcId: vpc.id,
            cidrBlock: publicSubnetsCidrs,
            availabilityZone: aws.getAvailabilityZones().then(azs => azs.names[index]),
            // public ip = true
            mapPublicIpOnLaunch: true,
            tags: { "Name": `${name}-public-subnet-${index}` },
        }, { parent: this });
        return publicSubnets;
    });

    // Private subnets
    privateSubnetsCidrs.map((privateSubnetsCidrs, index) => {
        const privateSubnets = new aws.ec2.Subnet(`${name}-private-subnet-${index}`, {
            vpcId: vpc.id,
            cidrBlock: privateSubnetsCidrs,
            availabilityZone: aws.getAvailabilityZones().then(azs => azs.names[index]),
            // public ip = false
            mapPublicIpOnLaunch: false,
            tags: { "Name": `${name}-private-subnet-${index}` },
        }, { parent: this });
        return privateSubnets;
    });

    // Elastic IP
    const eip = new aws.ec2.Eip(`${name}-eip`, {
        vpc: true,
    }, { parent: this });

    // NAT Gateway
    const natGateway = new aws.ec2.NatGateway(`${name}-nat-gateway`, {
        allocationId: eip.id,
        subnetId: publicSubnetsCidrs[0],
        tags: { "Name": `${name}-nat-gateway` },
    }, { parent: this });

    // Public Route table
    const publicRouteTable = new aws.ec2.RouteTable(`${name}-public-route-table`, {
        vpcId: vpc.id,
        routes: [{
            cidrBlock: vpc.cidrBlock,
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
    publicSubnetsCidrs.map((publicSubnetsCidrs, index) => {
        const publicRouteTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-public-route-table-association-${index}`, {
            subnetId: publicSubnetsCidrs,
            routeTableId: publicRouteTable.id,
        }, { parent: this });
        return publicRouteTableAssociation;
    });

    // Private Route table association

    privateSubnetsCidrs.map((privateSubnetsCidrs, index) => {
        const privateRouteTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-private-route-table-association-${index}`, {
            subnetId: privateSubnetsCidrs,
            routeTableId: privateRouteTable.id,
        }, { parent: this });
        return privateRouteTableAssociation;
    });
    



    this.vpcId = vpc.id;
    this.vpcCidr = vpc.cidrBlock;
    this.internetGatewayId = igw.id;

    }


}

