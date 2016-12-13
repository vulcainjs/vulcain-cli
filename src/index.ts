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
import { ProjectCreateCommand } from './commands/vulcain/projectCreateCommand';
import { ProjectCloneCommand } from './commands/vulcain/projectCloneCommand';
import { ProjectAddCommand } from './commands/vulcain/projectAddCommand';
import { ProjectTestCommand } from './commands/vulcain/projectTestCommand';
import { ConfigCommand } from './commands/configCommand';
import { ProfileManager } from './profileManager';
import { ProjectInitCommand } from './commands/standalone/projectInitCommand';
import { ProjectRunCommand } from './commands/standalone/projectRunCommand';
import { ProjectGenerateCommand } from './commands/standalone/projectGenerateCommand';

const vorpal = require('vorpal')();
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');
 
const useMock = (process.env["USE_MOCK"] && parseInt(process.env["USE_MOCK"])) || 0; // 1 test, 2 force testing standalone
const executeCommandOnline = process.argv.length > 2;

vorpal
    .delimiter("vulcain > ");

console.log();
console.log("Vulcain command - Version: 1.1.3");
console.log("================================");
console.log();
console.log("Available commands : ");

updateNotifier({ pkg }).notify({defer:false});

var profiles = new ProfileManager(vorpal);
if (profiles.currentConfig().server && useMock < 2) {
    new ProjectCreateCommand(vorpal, profiles, !!useMock, executeCommandOnline);
    new ProjectCloneCommand(vorpal, profiles, !!useMock, executeCommandOnline);
    new ProjectAddCommand(vorpal, profiles, !!useMock, executeCommandOnline);
    new ProjectTestCommand(vorpal, profiles, !!useMock, executeCommandOnline);
}
else {
    new ProjectInitCommand(vorpal, profiles, !!useMock, executeCommandOnline);
    new ProjectRunCommand(vorpal, profiles, !!useMock, executeCommandOnline);
    new ProjectGenerateCommand(vorpal, profiles, !!useMock, executeCommandOnline);
}

new ConfigCommand(vorpal, profiles, !!useMock, executeCommandOnline);
console.log();

let ui = vorpal.show();
if (executeCommandOnline) {
    ui.parse(process.argv);
}