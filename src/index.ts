#!/usr/bin/env node
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//
//    Copyright (c) Zenasoft
//
import { ProjectCreateCommand } from './commands/projectCreateCommand';
import { ProjectCloneCommand } from './commands/projectCloneCommand';
import { ProjectAddCommand } from './commands/projectAddCommand';
import { ProjectTestCommand } from './commands/projectTestCommand';
import { ConfigCommand } from './commands/configCommand';
import { ProfileManager } from './profileManager';
import { ProjectInitCommand } from './commands/projectInitCommand';
const vorpal = require('vorpal')();

const useMock = (process.env["USE_MOCK"] && parseInt(process.env["USE_MOCK"])) || 0; // 1 test, 2 force testing standalone

vorpal
    .delimiter("vulcain > ");

console.log();
console.log("Vulcain command - Version: 1.1.1");
console.log("================================");
console.log();
console.log("Available commands : ");

var profiles = new ProfileManager(vorpal);
if (profiles.currentConfig().server && useMock < 2) {
    new ProjectCreateCommand(vorpal, profiles, !!useMock);
    new ProjectCloneCommand(vorpal, profiles, !!useMock);
    new ProjectAddCommand(vorpal, profiles, !!useMock);
    new ProjectTestCommand(vorpal, profiles, !!useMock);
}
else {
    new ProjectInitCommand(vorpal, profiles, !!useMock);
}

new ConfigCommand(vorpal, profiles, !!useMock);
console.log();

let ui = vorpal.show();
if (process.argv.length > 2) {
    ui.parse(process.argv);
    process.exit(0);
}