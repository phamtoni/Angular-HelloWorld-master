/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';

import {ProjectPlanningComponent} from './project-planning.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {SubprojectStateModule} from "./+state/subproject";
import {SharedModule} from "../../shared/shared.module";
import {Store, StoreModule} from "@ngrx/store";
import {CoverageSpecialSalesMaterialModule} from "../../shared/material";
import {ProjectPlanningStateModule} from "./+state/project-planning-state.module";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {SubprojectComponent} from "./components/subproject/subproject.component";
import {PopoverDirective} from "../../shared/popover/popover.directive";
import {McrMasterDataComponent} from "./components/subproject/components/mcr-master-data/mcr-master-data.component";
import {Qg4ListComponent} from "./components/subproject/components/qg4-list/qg4-list.component";
import {CssMasterDataComponent} from "./components/subproject/components/css-master-data/css-master-data.component";
import {ValueTableComponent} from "./components/subproject/components/value-table/value-table.component";
import {SubprojectLastChangeComponent} from "./components/subproject/components/subproject-last-change/subproject-last-change.component";
import {ProjectFilterComponent} from "./components/project/project-filter/project-filter.component";
import {PlanningTableComponent} from "./components/planning-table/planning-table.component";
import {ReadWriteHelper} from "../../shared/utils";
import {
    ActualDataService,
    ApprovalDialogData,
    ApprovalResponse,
    ApprovalService,
    ComparisonVersions,
    CurrencyService,
    DefaultActualDataService,
    DefaultApprovalService,
    DefaultCSSPlanningService,
    DefaultCurrencyService,
    DefaultSubprojectService, ProjectErrorEvent,
    ProjectPlanningComparisonVersionChangeEvent,
    ProjectPlanningContractualAgreeOTPChangeEvent, ProjectPlanningCurrencyChangeEvent,
    ProjectPlanningDiscardEvent,
    ProjectPlanningOTPRateChangeEvent,
    ProjectPlanningSaveEvent,
    ProjectPlanningService, SubprojectData, SubprojectErrorEvent,
    SubprojectService,
    SubProjectVersion
} from "../../shared/business-domain";
import {DataPickerService, DefaultDataPickerService} from "../../shared/data-picker";
import {SubprojectSanboxService} from "./components/subproject/subproject-sanbox.service";
import {MockDataService} from "../../../mock/mock-services/mockDataService.service";
import {LoadingIndicatorService} from "../../shared/loading-indicator";
import {MessageDialogService} from "../../shared/dialog";
import {SnackBarService} from "../../shared/notification";
import {ProjectSandboxService} from "./components/project/project-sandbox.service";
import {ProjectPlanningSandboxService} from "./project-planning-sandbox.service";
import {of} from "rxjs";
import {ScrollDispatcherService} from "../../shared/scroll-dispatcher";
import {BreadcrumbService} from "@igpm/core";
import {ProjectNavigationComponent} from "./components/navigation/project-navigation.component";
import {ProjectComponent} from "./components/project/project.component";
import {ProjectInfoComponent} from "./components/project/project-info/project-info.component";
import {ProjectActionsComponent} from "./components/project/project-actions/project-actions.component";
import {MatMenu, MatMenuTrigger} from "@angular/material";
import {ActivatedRoute, Router} from "@angular/router";
import {CoreComponent} from "../../core/core.component";
import {DebugElement, ElementRef} from "@angular/core";
import {RouterTestingModule} from "@angular/router/testing";
import {CanDeactivateGuard} from "../../shared/guard/can-deactivate.guard";
import {ApprovalComponent} from "./components/approval/approval.component";
import {ErrorHandlerService, DefaultErrorHandlerService} from "../../shared/error-handler";

describe('ProjectPlanningComponent', () => {
    let component: ProjectPlanningComponent;
    let fixture: ComponentFixture<ProjectPlanningComponent>;
    let nativeEl: any;
    let debugElement: DebugElement;

    let readWriteHelper: ReadWriteHelper;
    let projectPlanningSandboxService: ProjectPlanningSandboxService;
    let projectPlanningService: ProjectPlanningService;
    let projectSandboxService: ProjectSandboxService;
    let subprojectService: SubprojectService;
    let actualDataService: ActualDataService;
    let subprojectSanboxService: SubprojectSanboxService;
    let approvalService: ApprovalService;
    let currencyService: CurrencyService;
    let store: Store<any>;
    let mockData: MockDataService;
    let scrollDispatcherService: ScrollDispatcherService;
    let messageDialogService: MessageDialogService;

    let getProjectDataSpy: any;
    let getProjectDataFromStore : any;
    let getProjectNagivationItemsSpy: any;
    let getActualDataSpy: any;
    let getActualDataSumSpy : any;
    let getApprovalPermissionsSpy: any;
    let getProjectSubprojectsSpy: any;
    let getExchangeRatesSpy: any;
    let router: Router;
    let fakeActivatedRoute = {
        snapshot: { data: {} }
    } as ActivatedRoute;
    fakeActivatedRoute.params = of({"mcrProjectId":"BM-00006037"});

    beforeEach(async(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

        TestBed.configureTestingModule({
            imports: [
                FormsModule,
                CommonModule,
                SubprojectStateModule,
                ReactiveFormsModule,
                SharedModule,
                StoreModule.forRoot({}),
                RouterTestingModule.withRoutes( [ {path: ':mcrProjectId', component: ProjectPlanningComponent, canDeactivate: [CanDeactivateGuard]}]),
                CoverageSpecialSalesMaterialModule,
                ProjectPlanningStateModule,
                BrowserAnimationsModule
            ],
            declarations: [ SubprojectComponent,
                PopoverDirective,
                McrMasterDataComponent,
                Qg4ListComponent,
                CssMasterDataComponent,
                ValueTableComponent,
                SubprojectLastChangeComponent,
                ProjectFilterComponent,
                PlanningTableComponent,
                ProjectPlanningComponent,
                ProjectNavigationComponent,
                ProjectComponent,
                ProjectInfoComponent,
                ProjectActionsComponent,
                MatMenu,
                MatMenuTrigger,
                CoreComponent
            ],
            providers: [
                ReadWriteHelper,
                {provide: SubprojectService, useClass: DefaultSubprojectService},
                {provide: ProjectPlanningService, useClass: DefaultCSSPlanningService},
                {provide: DataPickerService, useClass: DefaultDataPickerService},
                {provide: CurrencyService, useClass: DefaultCurrencyService},
                {provide: ApprovalService, useClass: DefaultApprovalService},
                {provide: ActualDataService, useClass: DefaultActualDataService},
                {provide: ErrorHandlerService, useClass: DefaultErrorHandlerService},
                LoadingIndicatorService,
                SubprojectSanboxService,
                MessageDialogService,
                SnackBarService,
                LoadingIndicatorService,
                ProjectSandboxService,
                ProjectPlanningSandboxService,
                MockDataService,
                ScrollDispatcherService,
                BreadcrumbService,
                Store
            ]
        })
            .compileComponents();

        projectPlanningSandboxService = TestBed.get(ProjectPlanningSandboxService);
        projectPlanningService = TestBed.get(ProjectPlanningService);
        projectSandboxService = TestBed.get(ProjectSandboxService);
        subprojectSanboxService = TestBed.get(SubprojectSanboxService);
        subprojectService = TestBed.get(SubprojectService);
        actualDataService = TestBed.get(ActualDataService);
        approvalService = TestBed.get(ApprovalService);
        currencyService = TestBed.get(CurrencyService);
        mockData = TestBed.get(MockDataService);
        readWriteHelper = TestBed.get(ReadWriteHelper);
        store = TestBed.get(Store);
        router = TestBed.get(Router);
        scrollDispatcherService = TestBed.get(ScrollDispatcherService);
        scrollDispatcherService.elementRef = new ElementRef<any>("");
        messageDialogService = TestBed.get(MessageDialogService);

        getProjectDataSpy = spyOn(projectPlanningService, 'getProjectData').and.returnValue(of(mockData.getProjectData()));
        getProjectDataFromStore = spyOn(projectPlanningSandboxService, 'getProjectDataFromStore').and.returnValue(of(mockData.getProjectData()));
        getProjectNagivationItemsSpy = spyOn(projectPlanningService, 'getProjectNagivationItems').and.returnValue(of(mockData.getProjectNavigationItem()));
        getActualDataSpy = spyOn(actualDataService, 'getActualData').and.returnValue(of([mockData.getSubprojectActualData()]));
        getActualDataSumSpy = spyOn(actualDataService, 'getSumaryOfActualData').and.returnValue(of([mockData.getActualData()]));
        getApprovalPermissionsSpy = spyOn(approvalService, 'getApprovalPermissions').and.returnValue(of(mockData.getApprovalPermissions()));
        getProjectSubprojectsSpy = spyOn(subprojectService, 'getProjectSubprojects').and.returnValue(of([mockData.getWritableSubProjectData()]));
        getExchangeRatesSpy = spyOn(currencyService, 'getExchangeRates').and.returnValue(of(mockData.getCurrencyRates()));
        spyOn(currencyService, 'getCurentForecastExchangeRates').and.returnValue(of(mockData.getCurrencyRates()));
        spyOn(projectPlanningSandboxService, 'getForecastExRatesFromStore').and.returnValue(of(mockData.getCurrencyRates()));


    }));

    beforeEach(() => {

        fixture = TestBed.createComponent(ProjectPlanningComponent);
        component = fixture.componentInstance;
        component.route.params = of({"mcrProjectId":"BM-00006037"});
        component.ngOnInit();

        debugElement = fixture.debugElement;
        nativeEl = fixture.nativeElement;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should scroll to subproject', () => {
        const position = component.projectComponent.elementRef.nativeElement.offsetTop +
            component.projectComponent.contentElemRef.nativeElement.offsetHeight;
        let event = {
            target:{
                offsetTop: 64,
                offsetLeft: 0,
                offsetWidth: 1864,
                offsetHeight: 478,
                scrollTop: position,
                scrollLeft: 0,
                scrollWidth: 1847,
                scrollHeight: 5147,
            }
        } ;

        component.onScroll(event);
        expect(component.projectPinned).toEqual(true);
        expect(component.currentSelectedNavigationItem.mcrId).toEqual(mockData.getSubProjectData().mcrMasterData.mcrSubProjectId);
    });

    it('test onNavigationItemSelected should be called', fakeAsync(() => {
        component.mainElem = {scrollTo(){}};
        let scrollToEvent = spyOn(component.mainElem,'scrollTo');

        let event = {
            mcrId:mockData.getSubProjectData().mcrMasterData.mcrSubProjectId
        } ;

        let subProjectComp = component.subprojectComponents.find(component => {
            return component.subproject &&
                component.subproject.mcrMasterData &&
                component.subproject.mcrMasterData.mcrSubProjectId === mockData.getSubProjectData().mcrMasterData.mcrSubProjectId
        });
        let el = subProjectComp.elementRef.nativeElement;
        const offsetPadding = subProjectComp.paddingTop;
        component.onNavigationItemSelected(event);
        tick(100);
        fixture.whenStable().then(() => {
            expect(scrollToEvent).toHaveBeenCalledWith(el.offsetLeft,el.offsetTop - offsetPadding);
        });

    }));

    it('test onNavigationItemSelected should select project node', fakeAsync(() => {
        component.mainElem = {scrollTo(){}};
        let scrollToEvent = spyOn(component.mainElem,'scrollTo');
        let el = component.projectComponent.elementRef.nativeElement;
        const offsetPadding = component.projectComponent.paddingTop;
        component.onNavigationItemSelected(null);
        tick(100);
        fixture.whenStable().then(() => {
            expect(scrollToEvent).toHaveBeenCalledWith(el.offsetLeft,el.offsetTop - offsetPadding);
        });

    }));


    it('test navigationOnTop should be called', fakeAsync(() => {
        component.mainElem = {scrollTo(){}};
        let scrollToEvent = spyOn(component.mainElem,'scrollTo');
        let el = component.projectComponent.elementRef.nativeElement;
        const offsetPadding = component.projectComponent.paddingTop;
        component.navigationOnTop();
        expect(scrollToEvent).toHaveBeenCalledWith(el.offsetLeft,el.offsetTop - offsetPadding);

    }));

    it('test discardProjectValue should be called', fakeAsync(() => {
        let event = new ProjectPlanningDiscardEvent(mockData.getProjectData())
        spyOn(messageDialogService,'showConfirmDialog').and.returnValue(of(true));
        component.changedSubprojectMap.set(mockData.getSubProjectData().mcrMasterData.mcrSubProjectId,mockData.getSubProjectData());
        component.discardProjectValue(event);
        expect(getProjectSubprojectsSpy).toHaveBeenCalledWith(mockData.getProjectData().prjId,ComparisonVersions[0].compId);
        expect(getActualDataSpy).toHaveBeenCalledWith(mockData.getProjectData().prjId);
    }));


    it('test saveProjectValue should be called', fakeAsync(() => {
        let project = mockData.getProjectData();
        project.subProjects = [mockData.getSubProjectData()];
        let event = new ProjectPlanningSaveEvent(project);

        let saveProjectService =  spyOn(subprojectService,'saveSubprojects').and.returnValue(of([mockData.getSubProjectData()]));
        component.changedSubprojectMap.set(mockData.getSubProjectData().mcrMasterData.mcrSubProjectId,mockData.getSubProjectData());
        component.saveProjectValue(event);
        expect(saveProjectService).toHaveBeenCalledWith(project.subProjects,project.prjId);
    }));


    it('test approveProject should be called', fakeAsync(() => {
        let project = mockData.getProjectData();
        project.subProjects = [mockData.getSubProjectData()];
        let mockApprovalResponse = new ApprovalResponse(200);
        let event = new ProjectPlanningSaveEvent(project);
        let dialogRefSpyObj = jasmine.createSpyObj({ afterClosed : of({}), close: null});
        dialogRefSpyObj.componentInstance = {
            approveCompletedEvent: of(mockApprovalResponse),
            approveCompletedWithErrorEvent: of(null)
        };


        const  openDialogSpy = spyOn(component.dialog,'open').and.returnValue(dialogRefSpyObj);
        let canApprove = readWriteHelper.getAccessRights(project.ifrsVersionId).isWritable;
        let newCssSubprojects = projectPlanningSandboxService.getNewCssSubprojectsForApproval(project);
        let lastUpdatedSubProjects = projectPlanningSandboxService.getLastUpdatedSubProjects(project);
        let approvalDialogData: ApprovalDialogData = {
            mcrProjectId: project.prjId,
            mcrSubProjectId: null,
            budId: project.divisionId,
            canApprove: canApprove,
            cssSubprojects: newCssSubprojects,
            isSubproject: false,
            project: project,
            lastUpdatedSubProjects: lastUpdatedSubProjects
        };
        component.approveProject(event);
        const errors = component.subprojectErrors;
        expect(openDialogSpy).toHaveBeenCalledWith(ApprovalComponent, {
            data: projectPlanningSandboxService.updateApprovalDialogData(project.subProjects, approvalDialogData),
            autoFocus: false,
            disableClose: true
        });
    }));


    it('test contractual opt value should be overwritten to subprojects', fakeAsync(() => {
        let project = mockData.getProjectData();
        project.contractualOTP = 2000;
        project.subProjects = [mockData.getSubProjectData()];
        let event = new ProjectPlanningContractualAgreeOTPChangeEvent(project);

        component.projectDataChanged(event);
        projectPlanningSandboxService.data.subProjectVersions$.subscribe((result:SubProjectVersion[]) => {
            expect(result[0].versionSubprojectMap.get(0).cssMasterData.contractualOTP).toEqual(2000);
            expect(project.contractualOTP).toEqual(null);
        });
    }));

    it('test otp rate should be overwritten to subprojects', fakeAsync(() => {
        let project = mockData.getProjectData();
        project.otpRate = 50;
        project.subProjects = [mockData.getSubProjectData()];
        let event = new ProjectPlanningOTPRateChangeEvent(project);

        component.projectDataChanged(event);
        projectPlanningSandboxService.data.subProjectVersions$.subscribe((result:SubProjectVersion[]) => {
            expect(result[0].versionSubprojectMap.get(0).cssMasterData.otpRate).toEqual( 50);
            expect(project.otpRate).toEqual(null);
        });
    }));

    it('test can change comparison version from Actual to YAP', fakeAsync(() => {
        let project = mockData.getProjectData();
        project.selectedComparisonVersion = ComparisonVersions[1];
        project.subProjects = [mockData.getSubProjectData()];
        let event = new ProjectPlanningComparisonVersionChangeEvent(project);

        component.projectDataChanged(event);

        expect(getProjectSubprojectsSpy).toHaveBeenCalledWith(mockData.getProjectData().prjId,ComparisonVersions[1].compId);
        expect(getActualDataSpy).toHaveBeenCalledWith(mockData.getProjectData().prjId);

    }));

    it('test can change currency from EUR to USD', fakeAsync(() => {
        let project = mockData.getProjectData();
        const currency = mockData.getCurrencies().find(cur => cur.code == 'USD');
        project.selectedCurrency = currency;
        project.subProjects = [mockData.getSubProjectData()];
        let event = new ProjectPlanningCurrencyChangeEvent(project);

        component.projectDataChanged(event);

        expect(getActualDataSumSpy).toHaveBeenCalledWith(mockData.getProjectData().prjId,currency.curId);

    }));

    it('test save and discard button should be enabled after value has changed', fakeAsync(() => {
        const subprojectData = new SubprojectData();
        const data = [subprojectData];

        component.subprojectValueChanged(data);

        expect(component.buttonsDisabled$.getValue()).toEqual(false);

    }));

    it('test save and discard button should be enabled after value has changed in subproject', fakeAsync(() => {
        const data = mockData.getSubProjectData();
        component.subprojectChanged(data);
        expect(component.buttonsDisabled$.getValue()).toEqual(false);

    }));


    it('test save and discard button should be enabled after value has changed with error', fakeAsync(() => {
        let event = new ProjectErrorEvent();
        event.error = true;
        event.project = mockData.getProjectData();
        component.projectHasError(event);

        expect(component.buttonsDisabled$.getValue()).toEqual(false);

    }));

    it('test save and discard button should be enabled after value has changed with error', fakeAsync(() => {
        let event = new SubprojectErrorEvent();
        event.error = true;
        event.subproject = mockData.getSubProjectData();
        component.subprojectDataHasError(event);

        expect(component.buttonsDisabled$.getValue()).toEqual(false);

    }));


    it('test getEmptySubprojects should return empty object', fakeAsync(() => {
        const result = component.getEmptySubprojects();
        expect(result.length).toEqual(1);

    }));

    it('test canDeactivate should return true', fakeAsync(() => {
        component.changedSubprojectMap.clear();
        const result = component.canDeactivate();
        expect(result).toEqual(true);
    }));

    it('test canDeactivate should return false', fakeAsync(() => {
        component.changedSubprojectMap.set(mockData.getSubProjectData().mcrMasterData.mcrSubProjectId,mockData.getSubProjectData());
        const result = component.canDeactivate();
        expect(result).toEqual(false);
    }));

});
