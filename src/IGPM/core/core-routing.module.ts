/*
 * Copyright 2018. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CoreContainerComponent } from './core-container.component';

const routes: Routes = [
    {path: '', redirectTo: '/project-overview', pathMatch: 'full'},
    {
        path: 'project-overview', component: CoreContainerComponent, children: [
            {path: '', loadChildren: '../features/project-overview/project-overview.module#ProjectOverviewModule'},
            {path: 'project-planning', loadChildren: '../features/project-planning/project-planning.module#ProjectPlanningModule'},
        ]
    },
    {path: '**', redirectTo: ''}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class CoreRoutingModule { }
