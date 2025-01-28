import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";


export interface VpcArgs {
    // AWS Account ID is inputed here
    instanceTenancy?: string;
    
    vpcCidr: string
    
    publicSubnets: string[];
    privateSubnets: string[];
    
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
    public readonly subnetIds: pulumi.Output<string>[] = [];
    public readonly vpcSecurityGroupIds: pulumi.Output<string>[] = [];
    public readonly internetGatewayId: pulumi.Output<string>;
    public readonly routeTableId: pulumi.Output<string>;
    public readonly routeTableAssociationIds: pulumi.Output<string>[] = [];

    constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:resource:VPC", name, args, opts);

    const vpcName = `${name}-vpc`;

    const cidrBlock = args.vpcCidr || "10.0.0.0/16";
    const instanceTenancy = args.instanceTenancy || "default";
    const enableDnsHostnames = args.enableDnsHostnames || true;
    const enableDnsSupport = args.enableDnsSupport || true;

    // Create the VPC
    const vpc = new aws.ec2.Vpc(vpcName, {
        cidrBlock: cidrBlock,
        instanceTenancy: instanceTenancy,
        enableDnsHostnames: enableDnsHostnames,
        enableDnsSupport: enableDnsSupport,
        tags: { "Name": vpcName },
    }, { parent: this });

    const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
        vpcId: vpc.id,
        tags: { "Name": `${name}-igw` },
    }, { parent: this });

    this.vpcId = vpc.id;
    this.vpcCidr = vpc.cidrBlock;
    this.internetGatewayId = igw.id;

    }


}

