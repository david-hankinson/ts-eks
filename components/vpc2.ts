import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface VpcArgs {
    instanceTenancy?: string;

    vpcCidr: string;
    publicSubnetsCidrs: string[];
    privateSubnetsCidrs: string[];

    vpcSecurityGroupName?: string;

    enableDnsHostnames?: boolean;
    enableDnsSupport?: boolean;

    tags?: aws.Tags;
}

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
    public readonly natGatewayId: pulumi.Output<string>;

    constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:VPC", name, args, opts);

        const instanceTenancy = args.instanceTenancy || "default";
        const vpcName = `${name}-vpc`;
        const cidrBlock = args.vpcCidr;

        const vpc = new aws.ec2.Vpc(vpcName, {
            cidrBlock: cidrBlock,
            instanceTenancy: instanceTenancy,
            enableDnsHostnames: args.enableDnsHostnames,
            enableDnsSupport: args.enableDnsSupport,
            tags: args.tags,
        }, { parent: this });

        for (let i = 0; i < args.publicSubnetsCidrs.length; i++) {
            const subnetCidr = args.publicSubnetsCidrs[i];
            const subnetName = `${name}-public-subnet-${i + 1}`;
            this.publicSubnets[subnetName] = new aws.ec2.Subnet(subnetName, {
                vpcId: vpc.id,
                cidrBlock: subnetCidr,
                availabilityZone: aws.getAvailabilityZones().then(azs => azs.names[0]),
                mapPublicIpOnLaunch: true,
                tags: { "Name": subnetName },
            }, { parent: this });
        }

        for (let i = 0; i < args.privateSubnetsCidrs.length; i++) {
            const subnetCidr = args.privateSubnetsCidrs[i];
            const subnetName = `${name}-private-subnet-${i + 1}`;
            this.privateSubnets[subnetName] = new aws.ec2.Subnet(subnetName, {
                vpcId: vpc.id,
                cidrBlock: subnetCidr,
                availabilityZone: aws.getAvailabilityZones().then(azs => azs.names[0]),
                mapPublicIpOnLaunch: false,
                tags: { "Name": subnetName },
            }, { parent: this });
        }

        const eip = new aws.ec2.Eip(`${name}-eip`, {
            vpc: true,
        }, { parent: this });

        const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
            vpcId: vpc.id,
            tags: { "Name": `${name}-igw` },
        }, { parent: this });

        const igwAttachment = new aws.ec2.InternetGatewayAttachment(`${name}-igw-attachment`, {
            vpcId: vpc.id,
            internetGatewayId: igw.id,
        }, { parent: this });

        const natGateway = new aws.ec2.NatGateway(`${name}-nat-gateway`, {
            allocationId: eip.id,
            subnetId: this.publicSubnets[Object.keys(this.publicSubnets)[0]].id,
            tags: { "Name": `${name}-nat-gateway` },
        }, { parent: this });

        const publicRouteTable = new aws.ec2.RouteTable(`${name}-public-route-table`, {
            vpcId: vpc.id,
            routes: [{
                cidrBlock: "0.0.0.0/0",
                gatewayId: igw.id,
            }],
            tags: { "Name": `${name}-public-route-table` },
        }, { parent: this });

        const privateRouteTable = new aws.ec2.RouteTable(`${name}-private-route-table`, {
            vpcId: vpc.id,
            tags: { "Name": `${name}-private-route-table` },
        }, { parent: this });

        for (const [index, subnet] of Object.entries(this.publicSubnets)) {
            new aws.ec2.RouteTableAssociation(`${name}-public-route-table-association-${index}`, {
                subnetId: subnet.id,
                routeTableId: publicRouteTable.id,
            }, { parent: this });
        }

        for (const [index, subnet] of Object.entries(this.privateSubnets)) {
            new aws.ec2.RouteTableAssociation(`${name}-private-route-table-association-${index}`, {
                subnetId: subnet.id,
                routeTableId: privateRouteTable.id,
            }, { parent: this });
        }

        const vpcSecurityGroup = new aws.ec2.SecurityGroup(`${args.vpcSecurityGroupName}`, {
            name: "allow_tls",
            description: "Allow TLS inbound traffic and all outbound traffic",
            vpcId: vpc.id,
            tags: { "Name": `${name}-vpc-sg` },
        });

        this.natGatewayId = natGateway.id;
        this.vpcSecurityGroupName = vpcSecurityGroup.name;
        this.vpcSecurityGroupId = vpcSecurityGroup.id;
        this.vpcId = vpc.id;
        this.vpcCidr = vpc.cidrBlock;
        this.internetGatewayId = igw.id;
        // myVPC.subnets["myVPC-subnet-1"].id
        // myVPC.subnets["myVPC-subnet-2"].id
     
    }
}