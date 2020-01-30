/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectOverviewComponent } from './project-overview.component';
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {ProjectOverviewTableComponent} from "./components/project-overview-table/project-overview-table.component";
import {GenericAgGridComponent} from "../../shared/ag-grid-table/components";
import {AgGridNg2} from "ag-grid-angular";
import {ProjectOverviewService} from "../../shared/business-domain/project-overview";
import {MockDataService} from "../../../mock/mock-services/mockDataService.service";

describe('ProjectOverviewComponent', () => {
    let component: ProjectOverviewComponent;
    let fixture: ComponentFixture<ProjectOverviewComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            declarations: [
                ProjectOverviewTableComponent,
                GenericAgGridComponent,
                ProjectOverviewComponent,
                AgGridNg2
            ],
            providers: [
                {provide: ProjectOverviewService, useClass: ProjectOverviewService},
                MockDataService]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ProjectOverviewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
