import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface IConfig {
    team?: string;
    profile: string;
    server?: string;
    token?: string;
    template?: string;
    defaultFolder?: string;
    env?: string;
    folder?: string;
}

interface IProfiles {
    defaultProfile: string;
    data: { [name: string]: IConfig };
}

export class ProfileManager {

    private config: IProfiles;
    private configFilePath: string;
    private homedir: string;
    private configDir: string;
    private currentProfile: string;

    constructor(protected vorpal) {
        this.homedir = os.homedir();
        this.configDir = path.join(this.homedir, ".vulcain");
        this.configFilePath = path.join(this.configDir, "configs.json");

        this.config = { defaultProfile: null, data: {} };

        if (fs.existsSync(this.configFilePath)) {
            try {
                this.config = JSON.parse(fs.readFileSync(this.configFilePath, { encoding: "utf8" }));
            }
            catch (e) { }
        }

        this.currentProfile = this.config.defaultProfile || "default";
    }

    public currentConfig(): IConfig {
        return this.config.data[this.currentProfile] || { profile: this.currentProfile };
    }

    displayProfiles() {
        var first = true;
        for (var p in this.config.data) {
            if (!this.config.data.hasOwnProperty(p)) {
                continue;
            }
            if (first) {
                this.vorpal.log("Profile list :");
                first = false;
            }
            this.vorpal.log(" - " + p + (this.currentProfile === p ? " (current)" : ""));
        }

        this.vorpal.log();
    }

    public mergeConfig(args) {

        var hasChanges = args.profile !== this.config.defaultProfile;

        this.config.defaultProfile = this.currentProfile = (args.profile || this.currentProfile);

        var config = this.config.data[this.currentProfile];
        if (!config) {
            config = this.config.data[this.currentProfile] = <any>{ profile: this.currentProfile };
        }

        if (args.server) {
            if (!/^https?/i.test(args.server)) {
                args.server = "http://" + args.server;
            }
            config.server = args.server;
            hasChanges = true;
        }

        if (args.token) {
            config.token = args.token;
            hasChanges = true;
        }

        if (args.template) {
            config.template = args.template;
            hasChanges = true;
        }

        if (args.folder) {
            config.defaultFolder = args.folder;
            hasChanges = true;
        }

        if (args.env) {
            config.env = args.env;
            hasChanges = true;
        }

        if (args.team) {
            config.team = args.team;
            hasChanges = true;
        }

        if (hasChanges) {
            this.saveOptions();
        }

        this.displayProfiles();
    }

    public showCurrentConfig() {
        var config = this.config.data[this.currentProfile];
        if (!config) {
            return;
        }

        this.vorpal.log(`Settings for current profile '${config.profile}' : `);
        if (config.server) {
            this.vorpal.log("  - server  : " + config.server);
        }

        if (config.token) {
            this.vorpal.log(`  - token   : ${config.token.substr(0, 8)}...`);
        }

        if (config.template) {
            this.vorpal.log("  - template: " + config.template);
        }

        if (config.defaultFolder) {
            this.vorpal.log("  - folder  : " + config.defaultFolder);
        }
        else if (process.env["VULCAIN_PROJECT"]) {
            this.vorpal.log("  - folder  : " + process.env["VULCAIN_PROJECT"]);
        }

        if (config.env) {
            this.vorpal.log("  - env     : " + config.env);
        }

        if (config.team) {
            this.vorpal.log("  - team    : " + config.team);
        }

        this.vorpal.log();
    }

    private saveOptions() {
        
        if (!fs.existsSync(this.homedir)) {
            fs.mkdirSync(this.homedir);
        }

        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir);
        }

        fs.writeFileSync(this.configFilePath, JSON.stringify(this.config), { encoding: "utf8" });
    }

}