import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import * as shell from 'shelljs';

export class ProjectPublishCommand extends AbstractCommand {

    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "publish : Publish service (demo mode only)";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('publish <version>', desc)
            .validate(args => {
                if (!/^[0-9]*$/.test(args.version)) {
                    return "Incorrect version. Must be a simple number.";
                }
            })
            .action(function (args, cb) {
                self.exec(this, args, () => {
                    if (self.executeCommandOnline) { process.exit(0); } else { cb(); }
                });
            });
    }

    private exec(vorpal, args, done) {

        this.vorpal.log();
        this.vorpal.log("Publishing microservice " + args.name);

        let profile = this.profiles.currentConfig();
        if (profile.profile !== "demo" || profile.token !== "ab690d50-e85d-11e6-b767-8f41c48a4483") {
            this.vorpal.log("  This command works only on the vulcain demo profile.");
            done();
            return;
        }

        if (!shell.test("-f", "Dockerfile")) {
            this.vorpal.log("  Run this command in the microservice project folder.");
            done();
            return;
        }

        try {
            let cmd = ["./build.sh", profile.server.substr("http://".length), profile.token, profile.team, "1.0." + args.version];
            if (shell.exec(cmd.join(' '))) {
                this.vorpal.log("Micro service is published.");
            }
            else {
                this.vorpal.log("Publication has failed.");
            }
        }
        catch (e) {
            this.vorpal.log("*** " + e);
        }
        done();
    }
}