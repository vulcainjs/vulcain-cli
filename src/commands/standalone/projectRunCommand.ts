import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import * as shell from 'shelljs';

export class ProjectRunCommand extends AbstractCommand {

    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "run     : Run a vulcain microservice from an image (standalone mode)";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('run <image>', desc)
            .autocomplete({ data: this.serviceAutoCompletion.bind(this) })
            .option("--name <name>", "Service name (default=image name)")
            .option("--port <port>", "Service port")
            // .option("--network <network>", "Docker overlay network")
            .option("--version <version>", "Microservice version (default 1.0)")
            .action(function (args, cb) {
                self.exec(this, args, () => {
                    if (self.executeCommandOnline) { process.exit(0); } else { cb(); }
                });
            });
    }

    protected checkArguments(args, errors) {
        //    if (!args.options.network) {
        //        args.options.network = "net-vulcain";
        //    }
        if (!args.options.version) {
            args.options.version = "1.0";
        }
        if (!args.image) {
            errors.push("Docker image is required.");
        }
        else if (!args.options.name) {
            try {
                let img = <string>args.image;
                let pos = img.lastIndexOf('/');
                if (pos >= 0) {
                    img = img.substr(pos + 1);
                }
                let parts = img.split(':');
                args.options.name = parts[0];
            }
            catch (e) {
                errors.push("You must provide a service name with --name.");
            }
        }
    }

    private createServiceName(serviceName: string, version: string) {
        return (serviceName + version).replace(/[\.-]/g, '').toLowerCase();
    }

    private exec(vorpal, args, done) {

        this.vorpal.log();

        let errors = [];
        this.checkArguments(args, errors);
        if (errors.length > 0) {
            for (var error in errors) {
                this.vorpal.log("  " + errors[error]);
            }
            done();
            return;
        }

        this.vorpal.log("Running microservice " + args.options.name);

        try {
            // this.vorpal.log("Initialize swarm with overlay network " + args.options.network);
            // shell.exec("docker swarm init", { silent: true });
            // shell.exec("docker network create -d overlay " + args.options.network, { silent: true });

            this.vorpal.log("Starting service...");

            const port = args.options.port ? args.options.port + ':8080' : '8080';
            //            let cmd = `docker service create -p ${port} --name ${this.createServiceName(args.options.name, args.options.version)} --restart-condition on-failure --network ${args.options.network} \
            //            -e VULCAIN_ENV=dev -e VULCAIN_SERVICE_NAME=${args.options.name} -e VULCAIN_SERVICE_VERSION=${args.options.version} \
            //            -e VULCAIN_ENV_MODE=local -e VULCAIN_TENANT=vulcain ${args.image}`;

            let cmd = `docker run -d -p ${port} --name ${this.createServiceName(args.options.name, args.options.version)} --restart on-failure \
            -e VULCAIN_ENV=dev -e VULCAIN_SERVICE_NAME=${args.options.name} -e VULCAIN_SERVICE_VERSION=${args.options.version} \
            -e VULCAIN_ENV_MODE=local ${args.image}`;

            let serviceId = (<any>shell.exec(cmd, { silent: false })).stdout;
            //            let inspect = (<any>shell.exec(`docker service inspect ${serviceId}`, { silent: true })).stdout;
            //            let publicPort = /\"PublishedPort\":\s(\d*)/.exec(inspect);

            let inspect = (<any>shell.exec(`docker inspect ${serviceId}`, { silent: true })).stdout;
            let publicPort = JSON.parse(inspect)[0].NetworkSettings.Ports['8080/tcp'][0].HostPort;
            if (publicPort.length > 1) {
                //                this.vorpal.log("Service running on port " + publicPort[1]);
                this.vorpal.log("Service running on port " + publicPort);
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