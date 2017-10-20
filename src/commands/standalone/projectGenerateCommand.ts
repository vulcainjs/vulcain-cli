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

        let desc = "generate: Generate code from template";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('generate <address>', desc)
            .autocomplete({ data: this.serviceAutoCompletion.bind(this) })
            .option("--template <template>", "Template to use (default=microServiceProxy)")
            .option("--template-source <templateSource>", "Force a new git repository containing templates")            
            .option("--folder <folder>", "Generation folder (default=current folder")
            .action(function (args, cb) {
                self.exec(this, args, () => {
                    if (self.executeCommandOnline) { process.exit(0); } else { cb(); }
                });
            });
    }

    protected checkArguments(args, errors) {
        if (!args.address) {
            errors.push("You must provide a service address.");
        }
        else {
            if (!args.address.startsWith("http")) {
                args.address = "http://" + args.address;
            }
            let url = Url.parse(args.address);
            if (url.pathname === "/") {
                url.pathname = "/api/_servicedescription";
            }
            args.address = Url.format(url);
        }
        if (!args.options.template) {
            args.options.template = "microServiceProxy";
        }
    }

    private async exec(vorpal, args, done) {

        this.vorpal.log();

        
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

            this.vorpal.log("Generating code from template " + args.options.template);

            // Cloning template
            currentFolder = shell.pwd().toString();
            var silentState = shell.config.silent;
            shell.config.silent = true;
            try {
                shell.cd("~/.vulcain");
                if (shell.error()) {
                    shell.mkdir("~/.vulcain");
                    shell.cd("~/.vulcain");
                }
            }
            finally {
                shell.config.silent = silentState;
            }

            const templatesUrl = args.options.templateSource || this.TEMPLATES_URL;
            this.vorpal.log("Cloning templates from " + templatesUrl);
            if ((<any>shell.exec(`git clone --depth 1 ${templatesUrl} templates`, { silent: true })).code > 0) {
                shell.cd("templates");
                shell.exec("git pull origin", { silent: true });
                shell.cd('..');
            }

            let templateFolder = "~/.vulcain/templates/" + args.options.template;
            if (shell.test("-d", templateFolder)) {
                shell.cd(templateFolder);
                const folder = args.options.folder ? Path.normalize(Path.join(currentFolder, args.options.folder)) : currentFolder;
                await this.generateCode(folder, args.address);
            } else {
                this.vorpal.log("Unknow template " + args.options.template);
            }
        }
        catch (e) {
            this.vorpal.log("*** " + e);
        }
        finally {
            currentFolder && shell.cd(currentFolder);
        }
        done();
    }

    private generateCode(currentFolder, uri: string) {
        return new Promise((resolve, reject) => {
            let tmp;
            try {
                // Copy context file in current project context
                tmp = Path.join(Path.dirname(module.filename), "tmp_context.js");
                shell.cp("-n", "context.js", tmp);
                let Context = require(tmp).Context;
                let ctx = new Context();
                ctx.discoveryAddress = uri;

                ctx.init({ discoveryAddress: uri })
                    .then((outputFile: string) => {
                        let template = fs.readFileSync( "template.ejs", "utf8");
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