/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectOverviewComponent } from './project-overview.component';

const ROUTES: Routes = [
    { path: '', component: ProjectOverviewComponent },
];

@NgModule({
    imports: [ RouterModule.forChild(ROUTES) ],
    exports: [ RouterModule ]
})
export class ProjectOverviewRoutingModule { }
