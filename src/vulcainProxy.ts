import { ProfileManager, IConfig } from './profileManager';
const rest = require('unirest');

export interface VulcainInfo {
    env: string;
    name: string;
    ns?: string;
    team?: string;
    template?: string;
    description?: string;
    projectUrl?: string;
    branch?: string;
    safeName?: string;
    configToken?: string;
    configServer?: string;
    templateRequired: boolean;
    isPackage: boolean;
    jobUrl?: string;
    hub?: string;
    action: "create" | "clone" | "add" | "test";
}

export class VulcainProxy {

    get currentConfig(): IConfig {
        return this.profiles.currentConfig();
    }

    constructor(protected vorpal, protected profiles: ProfileManager) {
    }

    public async getProjectInformationsAsync(requestData: VulcainInfo) {
        var options = this.currentConfig;

        this.vorpal.log("*** Getting project informations from vulcain at " + options.server + "...");

        var request = rest.post(options.server + "/api/")
            .header('Accept', 'application/json')
            .header('Authorization', "ApiKey " + options.token)
            .type("json")
            .timeout(5000)
            .send({ action: "registerService", schema: "Service", params: requestData });

        let body: any = await this.sendRequest(request);
        return <VulcainInfo>body.value;
    }

    public async registerServiceAsync(dir: string, requestData: VulcainInfo): Promise<boolean> {
        var options = this.currentConfig;

        this.vorpal.log("*** Registering project in vulcain...");
        var request = rest.post(options.server + "/api/Service.commitService")
            .header('Accept', 'application/json')
            .header('Authorization', "ApiKey " + options.token)
            .type("json")
            .send({ params: requestData });

            await this.sendRequest(request);
            this.vorpal.log("*** Project registered with success.");
            return true;
    }

    public getServiceNames(input: string, callback) {
        let request = this.createRequest(["Service.all"], { team: this.currentConfig.team, name: input });
        if (!request) {
            return [];
        }
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.value) || [];
            callback(templates.map(t => t.name));
        });
    }

    public getTeamNames(input, callback) {
        let request = this.createRequest(["Team.names"], { startsWith: input });
        if (!request) {
            return [];
        }
        request.end((response) => {
            var teams = (response.ok && response.body && response.body.value) || [];
            callback(teams);
        });
    }

    public getTemplateNames(input: string, callback) {
        let request = this.createRequest(["Template.getnames"], { startsWith: input, kind: "Project" });
        if (!request) {
            return [];
        }
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.value) || [];
            callback(templates);
        });
    }

    private createRequest(paths: Array<string>, query) {
        var options = this.currentConfig;
        if (!options.server || !options.token) {
            this.vorpal.log("You must define a server address and a token with the config command.");
            return null;
        }

        let q = "";
        let sep = "?";
        for (var p in query) {
            if (!query.hasOwnProperty(p) || !query[p]) {
                continue;
            }
            q += sep + p + "=" + query[p];
            sep = "&";
        }
        const url = options.server + "/api/" + paths.join("/") + q;
        return rest.get(url)
            .header('Accept', 'application/json')
            .header('Authorization', "ApiKey " + options.token);
    }

    private sendRequest(request) {
        return new Promise((resolve, reject) => {
            request.end((response) => {
                let body;
                try { body = response.body; } catch (e) { }
                if (!response.ok) {
                    if (body && body.error) {
                        reject(new Error(body.error.message));
                    }
                    else {
                        reject( new Error((response.error && response.error.message) || response.status));
                    }
                }
                else  {
                    resolve(body);
                }
            });
        });
    }
}

export class VulcainProxyMock extends VulcainProxy {

    public async registerServiceAsync(dir: string, requestData: VulcainInfo): Promise<boolean> {

        this.vorpal.log("*** Registering project in vulcain...");
        return true;
    }
}