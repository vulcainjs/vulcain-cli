import { AbstractCommand } from '../abstractCommand';
import { ProfileManager } from '../../profileManager';
import * as shell from 'shelljs';
import * as fs from 'fs';
import * as ejs from 'ejs';
import * as Path from 'path';
import * as Url from 'url';

export class ProjectGenerateCommand extends AbstractCommand {

    private TEMPLATES_URL = "https://github.com/vulcainjs/vulcain-code-generation-templates.git";

    constructor(vorpal, profiles: ProfileManager, useMock: boolean, private executeCommandOnline: boolean) {
        super(vorpal, profiles, useMock);

        let desc = "generate: Generate a microservice proxy";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('generate', desc)
            .autocomplete({ data: this.serviceAutoCompletion.bind(this) })
            .option("--template <template>", "Template to use")
            .option("--uri <uri>", "Service discovery address (or url for http command)")
            .action(function (args, cb) {
                self.exec(this, args, () => {
                    if (self.executeCommandOnline) { process.exit(0); } else { cb(); }
                });
            });
    }

    protected checkArguments(args, errors) {
        if (!args.options.uri) {
            errors.push("You must provide an uri with --uri.");
        }
        else {
            let url = Url.parse(args.options.uri);
            if(url.pathname === "/") {
                url.pathname = "/api/_servicedescription";
            }
            args.options.uri = Url.format(url);
        }
        if(!args.options.template) {
            args.options.template = "microServiceProxy";
        }
    }

    private async exec(vorpal, args, done) {

        this.vorpal.log();

        this.vorpal.log("Generating code from template " + args.options.template);

        let currentFolder;
        try {
            let errors = [];
            this.checkArguments(args, errors);
            if (errors.length > 0) {
                for (var error in errors) {
                    this.vorpal.log("  " + errors[error]);
                }
                done();
                return;
            }

            // Cloning template
            currentFolder = shell.pwd().toString();
            shell.cd("~/.vulcain");
            this.vorpal.log("Cloning template from " + this.TEMPLATES_URL);
            if ((<any>shell.exec(`git clone --depth 1 ${this.TEMPLATES_URL} templates`, { silent: true })).code > 0) {
                shell.cd("templates");
                shell.exec("git pull origin", { silent: true });
                shell.cd('..');
            }

            let templateFolder = shell.pwd().toString() + "/templates/" + args.options.template;

            if (shell.test("-d", templateFolder)) {
                await this.generateCode(currentFolder, templateFolder, args.options.uri);
            } else {
                this.vorpal.log("Unknow template " + args.options.template);
            }
        }
        catch (e) {
            currentFolder && shell.cd(currentFolder);
            this.vorpal.log("*** " + e);
        }
        done();
    }

    private generateCode(currentFolder, templateFolder: string, uri: string) {
        return new Promise((resolve, reject) => {
            let tmp;
            try {
                // Copy context file in current project context
                tmp = Path.join(Path.dirname(module.filename), "tmp_context.js");
                shell.cp(templateFolder + "/context.js", tmp);
                let Context = require(tmp).Context;
                let ctx = new Context();
                ctx.discoveryAddress = uri;

                ctx.init({ discoveryAddress: uri })
                    .then((outputFile: string) => {
                        let template = fs.readFileSync(templateFolder + "/template.ejs", "utf8");
                        let txt = ejs.render(template, ctx);

                        outputFile = Path.join(currentFolder, outputFile);
                        shell.mkdir("-p", Path.dirname(outputFile));

                        fs.writeFile(outputFile, txt, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            this.vorpal.log("Code generated sucessfully in " + outputFile);
                            resolve(outputFile);
                        });
                    })
                    .catch(err => {
                        this.vorpal.log("Code generation error : " + err);
                        reject(err);
                    });
            } catch (e) {
                this.vorpal.log("Code generation error : " + e);
                reject(e);
            }
            finally {
                tmp && shell.rm(tmp);
            }
        });
    }
}