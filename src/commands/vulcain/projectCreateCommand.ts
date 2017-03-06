import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import { WorkflowContext } from '../../workflow/workflowContext';
import { VulcainInfo } from '../../vulcainProxy';
import * as shell from 'shelljs';
import { Engine } from '../../util/manifestEngine';

export class ProjectCreateCommand extends AbstractCommand {
    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "create  : Create a new project from template.";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('create <name>', desc)
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name)) {
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
                }
            })
            .option("--desc <description>", "Project description")
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .option("-p, --package", "Create as a package (library)")
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
        if (!args.template) {
            errors.push("You must provide a template. Use --template (or -t) option.");
        }
    }

    private async exec(vorpal, args, done) {
        try {
            let options = this.mergeOptionsWithCurrentConfig(args);

            this.vorpal.log();
            this.vorpal.log("Initializing new project : " + options.project);

            let requestData: VulcainInfo =
                {
                    name: options.project,
                    template: options.template,
                    description: options.description,
                    env: options.env,
                    templateRequired: true,
                    team: options.team,
                    isPackage: options.package,
                    action: "create"
                };

            let info = await this.vulcain.getProjectInformationsAsync(requestData);
            this.prepareFolder(options);

            let ctx = new WorkflowContext(this.vorpal, options, info);
            let templateEngine = new Engine(vorpal, ctx, this.useMock);

            this.clone(info.template, options.folder, "--depth 1");

            try {

                shell.cd(options.folder);

                this.vorpal.log("*** Processing Manifest - Updating source files...");
                try {
                    templateEngine.transform();
                }
                catch (e) {
                    this.vorpal.log("*** Error when updating source files - " + e);
                }

                try {
                    templateEngine.execScriptsAsync();
                }
                catch (err) {
                    // Not critical
                    this.vorpal.log("*** Error when running scripts : " + err);
                }

                shell.rm("-rf", ".git");                
                if (shell.exec('git init').code !== 0) {
                    throw new Error("Can not initialized a new git repository.");
                }
                if (info.projectUrl) {
                    if (shell.exec('git remote add origin ' + info.projectUrl).code !== 0) {
                        throw new Error("Can not initialized a new git repository.");
                    }
                    if (shell.exec('git checkout -b ' + info.branch).code !== 0) {
                        throw new Error("Can not initialized a new git repository.");
                    }
                }
                
                await this.vulcain.registerServiceAsync(info);
                this.vorpal.log("*** Project " + ctx.meta.project.fullName + " created successfully in " + options.folder);
                templateEngine.displayMessage("end");
            }
            catch (e) {
                this.vorpal.log("*** " + e);
                this.removeFolder(options);
                ctx = null;
            }
        }
        catch (e) {
            this.vorpal.log("*** " + e);
        }

        done();
    }
}