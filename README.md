# React-Style cloud Infrastructure as code with Pulumi TypeScript

Would it be useful to you if you could deploy your AWS infrastructure as effortlessly as you build React components?

With this Pulumi TypeScript project, you can do just that. 

Like a React application, the project includes a components directory with modules like VPC, ALB, and EC2 to build a Kubernetes cluster on AWS. 

Being modular, you can pass it different inputs and get different outputs.

Each instance of a module has it's own persisence, but modules do need to be instantiated in a particular order. You need a network before you can build a server.

Additionaly, you can group a number of instances of a module into 'prod' and 'non-prod' environments.  

