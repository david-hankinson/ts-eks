import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

type PolicyType = "default" | "locked" | "permissive";

// Create a class that encapsulates the functionality by subclassing
// pulumi.ComponentResource.
class OurBucketComponent extends pulumi.ComponentResource {
    public bucket: aws.s3.BucketV2;
    private bucketPolicy: aws.s3.BucketPolicy;

    private policies: { [K in PolicyType]: aws.iam.PolicyStatement } = {
        default: {
            Effect: "Allow",
            Principal: "*",
            Action: [
                "s3:GetObject"
            ],
        },
        locked: {
            Effect: "Allow",
            /* ... */
        },
        permissive: {
            Effect: "Allow",
            /* ... */
        },
    };

    private getBucketPolicy(policyType: PolicyType): aws.iam.PolicyDocument {
        return {
            Version: "2012-10-17",
            Statement: [{
                ...this.policies[policyType],
                Resource: [
                    pulumi.interpolate`${this.bucket.arn}/*`,
                ],
            }],
        }
    };

    constructor(name: string, args: { policyType: PolicyType }, opts?: pulumi.ComponentResourceOptions) {

        // By calling super(), we ensure any instantiation of this class
        // inherits from the ComponentResource class so we don't have to
        // declare all the same things all over again.
        super("pkg:index:OurBucketComponent", name, args, opts);

        this.bucket = new aws.s3.BucketV2(name, {}, { parent: this });

        this.bucketPolicy = new aws.s3.BucketPolicy(`${name}-policy`, {
            bucket: this.bucket.id,
            policy: this.getBucketPolicy(args.policyType),
        }, { parent: this });

        // We also need to register all the expected outputs for this
        // component resource that will get returned by default.
        this.registerOutputs({
            bucketName: this.bucket.id,
        });
    }
}

const bucket = new OurBucketComponent("laura-bucket-1", {
    policyType: "permissive",
});

export const bucketName = bucket.bucket.id;