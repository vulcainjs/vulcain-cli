import { AbstractCommand } from './abstractCommand';
import { ProfileManager } from '../profileManager';
import { VulcainInfo } from '../vulcainProxy';
import { WorkflowContext } from '../workflow/workflowContext';
import { Engine } from '../util/manifestEngine';
import * as shell from 'shelljs';

export class ProjectTestCommand extends AbstractCommand {

    constructor(vorpal, profiles: ProfileManager, useMock?: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "test    : Create locally a new project from template. (Don't register it in vulcain))";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('test <name>', desc)
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name)) {
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
                }
            })
            .option("-t, --template <template>", "Template name used to initialize project", this.templateAutoCompletion.bind(this))
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .action(function (args, cb) {
                self.exec(this, args, cb);
            });
    }

    protected checkArguments(args, errors) {
        if (!args.template) {
            errors.push("You must provide a template. Use --template (or -t) option.");
        }
    }

    private async exec(vorpal, args, done) {
        try {
            let options = this.mergeOptionsWithCurrentConfig(args);

            this.vorpal.log();
            this.vorpal.log("Initializing test project : " + options.project);

            let requestData: VulcainInfo =
                {
                    name: options.project,
                    template: options.template,
                    description: options.description,
                    env: options.env || "test",
                    templateRequired: true,
                    team: options.team,
                    isPackage: options.package,
                    action: "create"
                };

            let info = await this.vulcain.getProjectInformationsAsync(requestData);
            this.prepareFolder(options, true);

            let ctx = new WorkflowContext(this.vorpal, options, info);
            let templateEngine = new Engine(vorpal, ctx, this.useMock);

            this.clone(info.template, options.folder, "--depth 1");

            try {

                if (shell.exec('git remote remove origin').code !== 0) {
                    throw new Error("Can not change remote origin");
                }

                try {

                    this.vorpal.log("*** Processing Manifest - Updating source files...");
                    try {
                        templateEngine.transform();
                    }
                    catch (e) {
                        this.vorpal.log("*** Error when updating source files - " + e);
                    }
                    templateEngine.execScriptsAsync();
                }
                catch (err) {
                    // Not critical
                    this.vorpal.log("*** Error when running scripts : " + err);
                }
            }
            catch (e) {
                this.vorpal.log("*** " + e);
                this.removeFolder(options);
                ctx = null;
            }

            this.vorpal.log("*** Project " + ctx.meta.project.fullName + " created successfully in " + options.folder);
        }
        catch (e) {
            this.vorpal.log("*** " + e);
        }

        done();
    }
}