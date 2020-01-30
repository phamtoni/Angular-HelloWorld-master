import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ProjectOverviewTableComponent} from './project-overview-table.component';
import {GenericAgGridComponent} from "../../../../shared/ag-grid-table/components";
import {AgGridNg2} from "ag-grid-angular";
import {ProjectOverviewService} from "../../../../shared/business-domain/project-overview";
import {MockDataService} from "../../../../../mock/mock-services/mockDataService.service";
import {HttpClientTestingModule} from "@angular/common/http/testing";

describe('ProjectOverviewTableComponent', () => {
    let component: ProjectOverviewTableComponent;
    let fixture: ComponentFixture<ProjectOverviewTableComponent>;

    let projectOverviewService: ProjectOverviewService;
    let mockData : MockDataService;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            declarations: [
                ProjectOverviewTableComponent,
                GenericAgGridComponent,
                AgGridNg2
            ],
            providers: [
                {provide: ProjectOverviewService, useClass: ProjectOverviewService},
                MockDataService]
        })
            .compileComponents();

        projectOverviewService = TestBed.get(ProjectOverviewService);
        mockData = TestBed.get(MockDataService);

        spyOn(projectOverviewService, 'count').and.returnValue(mockData.getProjectOverviewCount());
        spyOn(projectOverviewService, 'find').and.returnValue(mockData.getProjectOverview());
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ProjectOverviewTableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
