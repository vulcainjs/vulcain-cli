import { VulcainInfo } from '../vulcainProxy';
import * as Path from 'path';
import { WorkflowArgument } from '../commands/abstractCommand';
var copy = require('copy-paste');

export class WorkflowContext {
    public meta;

    constructor(protected vorpal, public args: WorkflowArgument, vulcainInfo: VulcainInfo) {
        let ns = "";
        if (vulcainInfo.ns && vulcainInfo.name.startsWith(vulcainInfo.ns)) {
            vulcainInfo.name = vulcainInfo.name.substr(vulcainInfo.ns.length + 1);
            ns = vulcainInfo.name + ".";
        }

        this.meta = {
            teamName: vulcainInfo.team,
            env: vulcainInfo.env,
            project: {
                namespace: vulcainInfo.ns,
                safeName: vulcainInfo.safeName,
                name: vulcainInfo.name,
                fullName: ns + vulcainInfo.name
            },
            hub: vulcainInfo.hub
        };

        args.folder = Path.join(args.folder, this.meta.project.name);
        copy.copy(args.folder);
    }
}