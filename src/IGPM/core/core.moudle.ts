/*
 * Copyright 2018 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {CoreRoutingModule} from './core-routing.module';
import {SharedModule} from '../shared/shared.module';
import {CoreComponent} from './core.component';
import {StoreModule} from '@ngrx/store';
import {BreadcrumbModule, SidebarModule} from '@igpm/core';
import {CoreContainerComponent} from './core-container.component';
import {MAT_MOMENT_DATE_ADAPTER_OPTIONS} from "@angular/material-moment-adapter";
import {ScrollDispatcherService} from "../shared/scroll-dispatcher/scroll-dispatcher.service";


@NgModule({
    imports: [
        CommonModule,
        CoreRoutingModule,
        StoreModule.forRoot({}),
        SharedModule.forRoot(),
        SidebarModule.forRoot(),
        BreadcrumbModule.forRoot(),
    ],
    exports: [
        CoreComponent
    ],
    declarations: [
        CoreComponent,
        CoreContainerComponent
    ],
    providers: [
        ScrollDispatcherService
        { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true }},
    ]
})
export class CSSCoreModule {
}
