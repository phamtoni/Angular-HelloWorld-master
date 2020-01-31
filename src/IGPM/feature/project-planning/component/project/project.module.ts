import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../../shared/shared.module";
import {ProjectInfoComponent} from "./project-info/project-info.component";
import {ProjectFilterComponent} from "./project-filter/project-filter.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ProjectActionsComponent} from "./project-actions/project-actions.component";
import {MatMenuModule} from "@angular/material/menu";
import {PopoverModule} from "../../../../shared/popover/popover.module";

@NgModule({
    declarations: [ProjectInfoComponent,ProjectFilterComponent, ProjectActionsComponent],
    exports: [ProjectInfoComponent,ProjectFilterComponent,ProjectActionsComponent],
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        MatMenuModule,
        PopoverModule,
    ]
})
export class ProjectModule { }
