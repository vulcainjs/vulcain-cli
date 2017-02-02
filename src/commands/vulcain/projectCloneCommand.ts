import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import { VulcainInfo } from '../../vulcainProxy';
import { Engine } from '../../util/manifestEngine';
import { WorkflowContext } from '../../workflow/workflowContext';
import * as URL from 'url';

export class ProjectCloneCommand extends AbstractCommand {

    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "clone   : Clone an existing vulcain project";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('clone <name>', desc)
            .autocomplete({ data: this.serviceAutoCompletion.bind(this) })
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name)) {
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
                }
            })
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))
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

    private exec(vorpal, args, done) {
        let options = this.mergeOptionsWithCurrentConfig(args);
        let ctx: WorkflowContext;

        this.vorpal.log();
        this.vorpal.log("Cloning project : " + options.project);

        return vorpal.prompt([
            { type: "input", name: "userName", message: "Enter a valid user name to connect to your version control server (optional) : " },
            { type: "password", name: "password", message: "Enter password : " }
        ])
            .then(async (answers) => {

                try {
                    // Get project infos from vulcain
                    // init templateengine
                    // Prepare folder
                    // clone
                    // exec script
                    // remove folder
                    let requestData: VulcainInfo =
                        {
                            name: options.project,
                            template: options.template,
                            description: options.description,
                            env: options.env,
                            templateRequired: true,
                            team: options.team,
                            isPackage: options.package,
                            action: "clone"
                        };

                    // Get info for cloning project
                    let info = await this.vulcain.getProjectInformationsAsync(requestData);
                    if (!info.projectUrl) {
                        this.vorpal.log("*** Project has nothing to clone (Scm is not defined?).");
                        done();
                        return;
                    }
                    
                    // Create target folder
                    this.prepareFolder(options);

                    ctx = new WorkflowContext(this.vorpal, options, info);

                    try {
                        // Cloning
                        var url = URL.parse(info.projectUrl);
                        if (answers.userName && answers.password) {
                            url.auth = answers.userName + ":" + answers.password;
                        }
                        this.clone(URL.format(url), options.folder);
                    }
                    catch (e) {
                        this.vorpal.log("*** " + e);
                        ctx = null;
                    }

                    if (ctx) {
                        // Executing scripts
                        let templateEngine = new Engine(vorpal, ctx, this.useMock);
                        templateEngine.execScriptsAsync("clone");

                        this.vorpal.log("*** Project " + ctx.meta.project.fullName + " cloned successfully.");
                    }
                }
                catch (e) {
                    if (ctx) {
                        this.removeFolder(options);
                    }
                    this.vorpal.log("*** " + e);
                }
                done();
            })
            .catch(() => {
                done();
            });
    }
}