/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectOverviewComponent } from './project-overview.component';
import { SharedModule } from '../../shared/shared.module';
import {
    FormsModule,
    ReactiveFormsModule
} from '@angular/forms';
import { ProjectOverviewRoutingModule } from './project-overview-routing.module';
import { ProjectOverviewTableComponent } from './components/project-overview-table/project-overview-table.component';

@NgModule({
    imports: [
        CommonModule,
        ProjectOverviewRoutingModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    providers: [
    ],
    declarations: [
        ProjectOverviewComponent,
        ProjectOverviewTableComponent,
    ],
})
export class ProjectOverviewModule { }
