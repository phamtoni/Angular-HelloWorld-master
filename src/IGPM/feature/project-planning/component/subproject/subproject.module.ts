import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from "@angular/common";
import { SubprojectStateModule } from "../../+state/subproject";
import {SharedModule} from "../../../../shared/shared.module";
import {Qg4ListComponent} from "./components/qg4-list/qg4-list.component";

@NgModule({
    imports: [
        FormsModule,
        CommonModule,
        SubprojectStateModule,
        ReactiveFormsModule,
        SharedModule
    ],
    exports: [Qg4ListComponent],
    declarations: [Qg4ListComponent],
    providers:[],
})
export class SubprojectModule {
}
