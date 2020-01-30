/*
 *  Copyright 2019 (c) All rights by Robert Bosch GmbH.
 *  We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {ProjectPlanningRoutingModule} from './project-planning-routing.module';
import {ProjectNavigationComponent} from './components/navigation/project-navigation.component';
import {ProjectComponent} from './components/project/project.component';
import {SharedModule} from 'src/app/shared/shared.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ProjectPlanningStateModule} from './+state/project-planning-state.module';
import {ProjectPlanningSandboxService} from './project-planning-sandbox.service';
import {ProjectPlanningComponent} from './project-planning.component';
import {PlanningTableComponent} from './components/planning-table/planning-table.component';
import {ProjectModule} from "./components/project/project.module";
import {CssMasterDataComponent} from "./components/subproject/components/css-master-data/css-master-data.component";
import {McrMasterDataComponent} from "./components/subproject/components/mcr-master-data/mcr-master-data.component";
import {ValueTableComponent} from "./components/subproject/components/value-table/value-table.component";
import {SubprojectModule} from "./components/subproject/subproject.module";
import {SubprojectComponent} from "./components/subproject/subproject.component";
import {SubprojectLastChangeComponent} from "./components/subproject/components/subproject-last-change/subproject-last-change.component";
import {ReadWriteHelper} from "../../shared";
import {SubprojectSanboxService} from "./components/subproject/subproject-sanbox.service";
import {ApprovalSandboxService} from "./components/approval/approval-sandbox.service";
import {ApprovalComponent} from "./components/approval/approval.component";
import {PopoverModule} from "../../shared/popover/popover.module";
import {ProjectSandboxService} from "./components/project/project-sandbox.service";


@NgModule({
    imports: [
        CommonModule,
        ProjectPlanningRoutingModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        ProjectPlanningStateModule,
        ProjectModule,
        SubprojectModule,
        PopoverModule
    ],
    providers: [
        ProjectPlanningSandboxService,
        ProjectSandboxService,
        SubprojectSanboxService,
        ApprovalSandboxService,
        ReadWriteHelper
    ],
    entryComponents: [
        ApprovalComponent
    ] ,
    declarations: [ProjectNavigationComponent,
        ProjectComponent,
        ProjectPlanningComponent,
        PlanningTableComponent,
        SubprojectComponent,
        CssMasterDataComponent,
        McrMasterDataComponent,
        ValueTableComponent,
        SubprojectLastChangeComponent,
        ApprovalComponent
    ]
})
export class ProjectPlanningModule { }
