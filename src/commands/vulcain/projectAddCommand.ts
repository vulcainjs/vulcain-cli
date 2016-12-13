import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import { VulcainInfo } from '../../vulcainProxy';
import { WorkflowContext } from '../../workflow/workflowContext';


export class ProjectAddCommand extends AbstractCommand {

    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "add     : Add local project to vulcain.";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('add <name>', desc)
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name)) {
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
                }
            })
            .option("--desc <description>", "Project description")
            .option("-p, --package", "Create as a package (library)")
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .option("-t, --template <template>", "Template name used to initialize project", this.templateAutoCompletion.bind(this))
            .action(function (args, cb) {
                self.exec(this, args, () => {
                    if (self.executeCommandOnline) { process.exit(0); } else { cb(); }
                });
            });
    }

    protected checkArguments(args, errors) {
        if (!args.team) {
            errors.push("No team are setting in current context.");
        }
    }

    private async exec(vorpal, args, done) {

        try {
            let options = this.mergeOptionsWithCurrentConfig(args);

            this.vorpal.log();
            this.vorpal.log("Adding project : " + options.project);

            let requestData: VulcainInfo =
                {
                    name: options.project,
                    template: options.template,
                    description: options.description,
                    env: options.env,
                    templateRequired: true,
                    team: options.team,
                    isPackage: options.package,
                    action: "add"
                };

            let info = await this.vulcain.getProjectInformationsAsync(requestData);
            let ctx = new WorkflowContext(this.vorpal, options, info);

            await this.vulcain.registerServiceAsync(options.folder, info);
            this.vorpal.log("*** Project " + ctx.meta.project.fullName + " added successfully.");
        }
        catch (e) {
            this.vorpal.log("*** " + e);
        }

        done();
    }
}

