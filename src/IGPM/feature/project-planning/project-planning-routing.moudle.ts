/*
 *  Copyright 2019 (c) All rights by Robert Bosch GmbH.
 *  We reserve all rights of disposal such as copying and passing on to third parties.
 */

import { NgModule } from '@angular/core';
import {
    RouterModule,
    Routes
} from '@angular/router';
import { ProjectPlanningComponent } from './project-planning.component';
import { CanDeactivateGuard } from "../../shared/guard/can-deactivate.guard";

const routes: Routes = [
    {path: ':mcrProjectId', component: ProjectPlanningComponent, canDeactivate: [CanDeactivateGuard]},
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ProjectPlanningRoutingModule {
}

