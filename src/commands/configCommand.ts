import { AbstractCommand } from './abstractCommand';
import { ProfileManager } from '../profileManager';

export class ConfigCommand extends AbstractCommand {
    constructor(vorpal, profiles: ProfileManager, useMock?: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "config  : Initialize default options";
        this.vorpal.log("  - " + desc);

        let self = this;
        vorpal.command('config', desc)
            .option("--profile, -p <profile>", "Profile name (Default = default)")
            .option("--server, -H <server>", "Vulcain server address")
            .option("--token <token>", "Vulcain token")
            .option("--template <template>", "Default template", this.templateAutoCompletion.bind(this))
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))
            .action(function (args, cb) {
                self.exec(args.options);
                cb();
            });

        this.vorpal.log();

        this.profiles.displayProfiles();
        this.profiles.showCurrentConfig();
    }

    private exec(args) {
        this.profiles.mergeConfig(args);
        this.profiles.showCurrentConfig();
    }
}