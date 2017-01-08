import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import * as shell from 'shelljs';

export class ProjectRunCommand extends AbstractCommand {

    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "run     : Run a vulcain microservice from image";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('run <name>', desc)
            .autocomplete({ data: this.serviceAutoCompletion.bind(this) })
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name)) {
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
                }
            })
            .option("--image <image>", "Docker image")
            .option("--network <network>", "Docker overlay network")            
            .option("--version <version>", "Microservice version (default 1.0)")            
            .action(function (args, cb) {
                self.exec(this, args, () => {
                    if (self.executeCommandOnline) { process.exit(0); } else { cb(); }
                });
            });
    }

    protected checkArguments(args, errors) {
        if (!args.options.network) {
            args.options.network = "net-vulcain";
        }        
        if (!args.options.version) {
            args.options.version = "1.0";
        }
        if (!args.name) {
            errors.push("You must provide a service name. run --image <image> <service-name>");            
        }
        if (!args.options.image) {
            errors.push("You must provide a docker image with --image.");
        }
        
    }

    private createServiceName(serviceName: string, version: string) {
        return (serviceName + version).replace(/[\.-]/g, '').toLowerCase();
    }

    private exec(vorpal, args, done) {

        this.vorpal.log();
        this.vorpal.log("Running microservice " + args.name);

        let errors = [];        
        this.checkArguments(args, errors);        
        if (errors.length > 0) {
            for (var error in errors) {
                this.vorpal.log("  " + errors[error]);
            }
            done();
            return;
        }
        
        try {
            shell.exec("docker swarm init", {silent:true});
            shell.exec("docker network create -d overlay " + args.options.network, {silent:true});
            
            let cmd = `docker service create -p 8080 --name ${this.createServiceName(args.name, args.options.version)} --restart-condition on-failure --network ${args.options.network} \
            -e VULCAIN_ENV=dev -e VULCAIN_SERVICE_NAME=${args.name} -e VULCAIN_SERVICE_VERSION=${args.options.version} \
            -e VULCAIN_ENV_MODE=local ${args.options.image}`;
            let serviceId = (<any>shell.exec(cmd, { silent: true })).stdout;
            let inspect = (<any>shell.exec(`docker service inspect ${serviceId}`, { silent: true })).stdout;
            let publicPort = /\"PublishedPort\":\s(\d*)/.exec(inspect);
            if (publicPort.length > 1) {
                this.vorpal.log("Service running on port " + publicPort[1]);
            }
            else {
                this.vorpal.log("Micro service is running.");
            }    
        }
        catch (e) {
            this.vorpal.log("*** " + e);
        }
        done();
    }
}