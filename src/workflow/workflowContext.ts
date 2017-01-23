import { VulcainInfo } from '../vulcainProxy';
import * as Path from 'path';
import { WorkflowArgument } from '../commands/abstractCommand';
var copy = require('copy-paste');

export class WorkflowContext {
    public meta;

    constructor(protected vorpal, public args: WorkflowArgument, vulcainInfo: VulcainInfo) {
        let ns = vulcainInfo.ns + ".";
        if (vulcainInfo.ns && vulcainInfo.name.startsWith(vulcainInfo.ns)) {
            vulcainInfo.name = vulcainInfo.name.substr(vulcainInfo.ns.length + 1);
        }

        this.meta = {
            teamName: vulcainInfo.team,
            env: vulcainInfo.env || "test",
            project: {
                namespace: vulcainInfo.ns || "vulcain",
                safeName: vulcainInfo.safeName,
                name: vulcainInfo.name,
                fullName: ns + vulcainInfo.name
            },
            hub: args.server
        };

        args.folder = Path.join(args.folder, this.meta.project.name);
        copy.copy(args.folder);
    }
}
