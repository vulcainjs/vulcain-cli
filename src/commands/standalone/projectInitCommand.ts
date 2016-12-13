import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import { VulcainInfo } from '../../vulcainProxy';
import { Engine } from '../../util/manifestEngine';
import { WorkflowContext } from '../../workflow/workflowContext';
import { WorkflowArgument } from '../../commands/abstractCommand';

export class ProjectInitCommand extends AbstractCommand {

    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "init    : Initialize a new vulcain project (to use outside vulcain platform)";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('init <name>', desc)
            .autocomplete({ data: this.serviceAutoCompletion.bind(this) })
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name)) {
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
                }
            })
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .action(function (args, cb) {
                self.exec(this, args, () => {
                    if (self.executeCommandOnline) { process.exit(0); } else { cb(); }
                });
            });
    }

    protected checkArguments(args, errors) {
    }

    private exec(vorpal, args, done) {
        let options: WorkflowArgument = {
            project: args.name,
            description: "",
            template: "https://github.com/vulcainjs/vulcain-template-microservice.git",
            package: false,
            folder: null,
            profile: "",
            team: "vulcain"
        };

        let ctx: WorkflowContext;

        this.vorpal.log();
        this.vorpal.log("Initializing project : " + options.project);

        try {
            let info: VulcainInfo = {
                env: "",
                name: options.project,
                ns: "",
                team: options.team,
                template: options.template,
                safeName: options.project,
                templateRequired: false,
                isPackage: false,
                action: "clone"
            };

            this.prepareFolder(options);
            ctx = new WorkflowContext(this.vorpal, options, info);

            try {
                // Cloning
                this.clone(options.template, options.folder);
            }
            catch (e) {
                this.vorpal.log("*** " + e);
                ctx = null;
            }

            if (ctx) {
                // Executing scripts
                let templateEngine = new Engine(vorpal, ctx, this.useMock);
                try {
                    templateEngine.transform();
                }
                catch (e) {
                    this.vorpal.log("*** Error when updating source files - " + e);
                }
                templateEngine.execScriptsAsync();

                this.vorpal.log("*** Project " + ctx.meta.project.fullName + " initialized successfully in " + options.folder);
            }
        }
        catch (e) {
            if (ctx) {
                this.removeFolder(options);
            }
            this.vorpal.log("*** " + e);
        }
        done();
    }
}