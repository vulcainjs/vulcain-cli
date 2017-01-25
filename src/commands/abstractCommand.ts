import * as Path from 'path';
import * as shell from 'shelljs';
import { ProfileManager, IConfig } from '../profileManager';
import { VulcainProxy, VulcainProxyMock } from '../vulcainProxy';
var fsAutocomplete = require('vorpal-autocomplete-fs');

export interface WorkflowArgument extends IConfig {
    project: string;
    folder: string;
    description: string;
    package: boolean;
}

export abstract class AbstractCommand {
    protected vulcain: VulcainProxy;
    private initialFolder: string;

    constructor(protected vorpal, protected profiles: ProfileManager, protected useMock: boolean) {
        this.vulcain = useMock ? new VulcainProxyMock(vorpal, profiles) : new VulcainProxy(vorpal, profiles);
        this.initialFolder = shell.pwd();
    }

    protected fileAutoComplete() {
        return fsAutocomplete({ directory: true });
    }

    protected serviceAutoCompletion(input, callback) {
        this.vulcain.getServiceNames(input, callback);
    }

    protected templateAutoCompletion(input, callback) {
        this.vulcain.getTemplateNames(input, callback);
    }

    protected teamAutoCompletion(input, callback) {
        this.vulcain.getTeamNames(input, callback);
    }
    
    protected checkArguments(args, errors) {
        if (!args.server) {
            errors.push("Server address is required. Use --server or -H option.");
        }
        if (!args.token) {
            errors.push("Token is required. Use --token option.");
        }
    }

    protected mergeOptionsWithCurrentConfig(commandOptions): WorkflowArgument {
        // Reset folder
        shell.cd(this.initialFolder);
        
        let errors = [];
        let config = this.profiles.currentConfig();

        let args: WorkflowArgument = commandOptions.options;
        args.project = commandOptions.name;
        args.defaultFolder = config.defaultFolder;
        
        // Merge config
        if (!args.server) {
            args.server = config.server;
        }
        if (args.server) {
            if (!/^https?/i.test(args.server)) {
                args.server = "http://" + args.server;
            }
        }
        else {
            errors.push("Server is not defined.");
        }
        if (!args.token && config.token) {
            args.token = config.token;
        }
        if (!args.token) {
            errors.push("Token is not defined.");
        }
        if (!args.team) {
            args.team = config.team;
        }
        if (!args.folder) {
            args.folder = config.folder;
        }
        if (!args.env) {
            args.env = config.env;
        }
        if (!args.template) {
            args.template = config.template;
        }
            
        this.checkArguments(args, errors);

        if (errors.length > 0) {
            for (var error in errors) {
                this.vorpal.log("  " + errors[error]);
            }
            throw new Error("command canceled.");
        }

        this.profiles.showCurrentConfig();
        
        return args;
    }
    
    protected prepareFolder(options: WorkflowArgument, test = false) {
        if (!options.folder) {
            let env = options.defaultFolder || process.env["VULCAIN_FOLDER"]
                || process.env["VULCAIN_PROJECT"]; // TODO remove
            if (!env) {
                options.folder = process.cwd();
            }
            else {
                env = env.replace(/["']/g, "").trim();
                if (test) {
                    options.folder = Path.join(env, "_tests");
                }
                else {
                    options.folder = Path.join(env, options.team);
                }
            }
        }
        else if (options.folder === ".") {
            options.folder = process.cwd();
        }

        try {
            shell.mkdir("-p", options.folder);
        }
        catch (err) {
            throw new Error("*** Cannot create target folder : " + err);
        }

        return options;
    }

    protected removeFolder(options: WorkflowArgument) {
        this.vorpal.log("** Removing project directory...");
        try {
            shell.cd("-");
            shell.rm('-rf', options.folder);
        }
        catch (e) { }
    }

    clone(url: string, folder: string, extra = "") {

        if (shell.test('-e', folder)) {
            throw new Error("destination path " + folder + " already exists");
        }
        
        this.vorpal.log("*** Cloning repository into " + folder + "...");
        //   copy.copy(folder);
            
        if (shell.exec(`git clone ${extra} ${url} ${folder}`).code !== 0) {
            throw new Error("Cloning process aborted.");
        }
        
        shell.cd(folder);
    }
}